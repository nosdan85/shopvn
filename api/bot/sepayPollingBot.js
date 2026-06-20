/**
 * SePay Polling Bot
 * Tự động quét giao dịch MB Bank từ SePay API mỗi X giây
 * Không cần webhook - bot chủ động polling
 */

const axios = require('axios');
const mongoose = require('mongoose');
const TaiKhoan = require('../models/TaiKhoan');
const WalletTransaction = require('../models/WalletTransaction');

// Environment variables
const SEPAY_BOT_API_KEY = process.env.SEPAY_BOT_API_KEY;
const SEPAY_BOT_API_URL = process.env.SEPAY_BOT_API_URL || 'https://my.sepay.vn/userapi/transactions/list';
const SEPAY_BOT_ENABLED = process.env.SEPAY_BOT_ENABLED === 'true';
const SEPAY_BOT_INTERVAL_MS = parseInt(process.env.SEPAY_BOT_INTERVAL_MS || '5000', 10);

let isRunning = false;
let intervalId = null;
let lastProcessedTransactionId = null;

/**
 * Gọi SePay API để lấy danh sách giao dịch mới nhất
 */
async function fetchRecentTransactions() {
    try {
        const response = await axios.get(SEPAY_BOT_API_URL, {
            params: {
                limit: 20 // Lấy 20 giao dịch mới nhất
            },
            headers: {
                'Authorization': `Bearer ${SEPAY_BOT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10s timeout
        });

        if (response.data && response.data.status === 200) {
            return response.data.transactions || [];
        }

        console.warn('[SEPAY_BOT] Unexpected API response:', response.data);
        return [];
    } catch (err) {
        console.error('[SEPAY_BOT] Lỗi khi gọi API:', err.message);
        return [];
    }
}

/**
 * Xử lý 1 giao dịch: tìm pending transaction và cộng tiền
 */
async function processTransaction(transaction) {
    const {
        id: sepayTransactionId,
        transaction_content: content,
        amount_in: amount,
        transaction_date: transactionDate
    } = transaction;

    // Nếu đã xử lý giao dịch này rồi thì skip
    if (lastProcessedTransactionId && sepayTransactionId <= lastProcessedTransactionId) {
        return;
    }

    const noiDung = String(content || '').trim();
    const soTien = parseInt(amount, 10);

    if (!noiDung || !soTien) {
        return; // Skip giao dịch không hợp lệ
    }

    console.log(`[SEPAY_BOT] Phát hiện giao dịch: ${noiDung} - ${soTien} VND`);

    // Tìm pending transaction trong database
    const giaoDich = await WalletTransaction.findOne({
        referenceCode: noiDung,
        type: 'topup',
        status: 'pending'
    });

    if (!giaoDich) {
        // Không log nếu không tìm thấy (có thể là giao dịch không liên quan)
        return;
    }

    // Kiểm tra số tiền có khớp không
    if (giaoDich.amountVnd !== soTien) {
        console.warn(`[SEPAY_BOT] ⚠️ Số tiền không khớp cho ${noiDung}. Yêu cầu: ${giaoDich.amountVnd}, Nhận: ${soTien}`);
        return;
    }

    // Check xem đã xử lý chưa (idempotent)
    if (giaoDich.status === 'completed') {
        console.log(`[SEPAY_BOT] Giao dịch ${noiDung} đã được xử lý rồi`);
        return;
    }

    // Bắt đầu transaction để cộng tiền
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Ưu tiên userId (ObjectId), fallback sang discordId (string → ObjectId) cho backward compat
        const taiKhoanId = giaoDich.userId || new mongoose.Types.ObjectId(giaoDich.discordId);

        // Cộng tiền vào ví
        const updatedTaiKhoan = await TaiKhoan.findOneAndUpdate(
            {
                _id: taiKhoanId,
                soDuVnd: { $gte: 0 }
            },
            {
                $inc: { soDuVnd: soTien }
            },
            {
                new: true,
                session
            }
        );

        if (!updatedTaiKhoan) {
            throw new Error('Không tìm thấy tài khoản hoặc không cập nhật được ví');
        }

        // Cập nhật trạng thái giao dịch
        giaoDich.status = 'completed';
        giaoDich.providerPaymentId = String(sepayTransactionId);
        giaoDich.txnId = String(sepayTransactionId);
        giaoDich.balanceAfterVnd = updatedTaiKhoan.soDuVnd;
        giaoDich.reviewedAt = new Date();
        giaoDich.reviewedBy = 'sepay_bot';

        await giaoDich.save({ session });
        await session.commitTransaction();

        console.log(`✅ [SEPAY_BOT] Nạp ${soTien.toLocaleString('vi-VN')} VND thành công cho ${updatedTaiKhoan.tenDangNhap}! Số dư mới: ${updatedTaiKhoan.soDuVnd.toLocaleString('vi-VN')} VND`);

        // TODO: Gửi thông báo Discord (nếu có)
        // await notifyDiscord(updatedTaiKhoan, soTien);

    } catch (err) {
        await session.abortTransaction();
        console.error(`❌ [SEPAY_BOT] Lỗi khi xử lý giao dịch ${noiDung}:`, err.message);
    } finally {
        session.endSession();
    }
}

/**
 * Main polling loop
 */
async function pollTransactions() {
    if (!SEPAY_BOT_ENABLED) {
        return;
    }

    if (!SEPAY_BOT_API_KEY) {
        console.error('[SEPAY_BOT] ❌ Thiếu SEPAY_BOT_API_KEY!');
        return;
    }

    try {
        const transactions = await fetchRecentTransactions();

        if (transactions.length === 0) {
            return;
        }

        console.log(`[SEPAY_BOT] 🔍 Tìm thấy ${transactions.length} giao dịch từ SePay`);

        // Xử lý từng giao dịch (từ cũ đến mới)
        for (const txn of transactions.reverse()) {
            await processTransaction(txn);
            lastProcessedTransactionId = txn.id;
        }

    } catch (err) {
        console.error('[SEPAY_BOT] ❌ Lỗi trong polling loop:', err.message);
    }
}

/**
 * Khởi động bot
 */
function start() {
    if (isRunning) {
        console.warn('[SEPAY_BOT] ⚠️ Bot đã đang chạy rồi!');
        return;
    }

    if (!SEPAY_BOT_ENABLED) {
        console.log('[SEPAY_BOT] Bot bị tắt. Set SEPAY_BOT_ENABLED=true để bật.');
        return;
    }

    if (!SEPAY_BOT_API_KEY) {
        console.error('[SEPAY_BOT] ❌ Thiếu SEPAY_BOT_API_KEY! Bot không thể khởi động.');
        return;
    }

    console.log(`[SEPAY_BOT] 🚀 Khởi động bot (polling interval: ${SEPAY_BOT_INTERVAL_MS}ms)...`);

    isRunning = true;

    // Chạy lần đầu ngay lập tức
    pollTransactions();

    // Sau đó chạy theo interval
    intervalId = setInterval(pollTransactions, SEPAY_BOT_INTERVAL_MS);

    console.log('[SEPAY_BOT] ✅ Bot đã khởi động thành công!');
}

/**
 * Dừng bot
 */
function stop() {
    if (!isRunning) {
        console.warn('[SEPAY_BOT] ⚠️ Bot chưa chạy!');
        return;
    }

    console.log('[SEPAY_BOT] 🛑 Đang dừng bot...');

    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }

    isRunning = false;
    console.log('[SEPAY_BOT] ✅ Bot đã dừng!');
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
    console.log('[SEPAY_BOT] Nhận SIGTERM, đang shutdown...');
    stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[SEPAY_BOT] Nhận SIGINT, đang shutdown...');
    stop();
    process.exit(0);
});

module.exports = {
    start,
    stop,
    isRunning: () => isRunning
};
