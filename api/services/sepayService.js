/**
 * SePay Service - Tich hop SePay (MB Bank) cho nap tien tu dong
 */
const crypto = require('crypto');
const mongoose = require('mongoose');

const TaiKhoan = require('../models/TaiKhoan');
const WalletTransaction = require('../models/WalletTransaction');

// Environment variables
const SEPAY_WEBHOOK_SECRET = process.env.SEPAY_WEBHOOK_SECRET || '';
const SEPAY_MB_BANK_ACCOUNT = process.env.SEPAY_MB_BANK_ACCOUNT || '';
const SEPAY_ACCOUNT_NAME = process.env.SEPAY_ACCOUNT_NAME || '';

/**
 * Tao ma nap tien (ma chuyen khoan)
 * @param {Object} params
 * @param {string} params.userId - ID tai khoan
 * @param {string} params.tenDangNhap - Ten dang nhap cua tai khoan
 * @param {number} params.soTienVnd - So tien VND (toi thieu 10000)
 * @returns {Promise<Object>}
 */
async function taoMaNapTien({ userId, tenDangNhap, soTienVnd }) {
    // Kiem tra so tien toi thieu
    if (!soTienVnd || soTienVnd < 10000) {
        return {
            thanhCong: false,
            thongBao: 'So tien nap toi thieu la 10,000 VND'
        };
    }

    // Validate userId
    let taiKhoan;
    try {
        taiKhoan = await TaiKhoan.findById(userId);
    } catch (err) {
        return {
            thanhCong: false,
            thongBao: 'ID tai khoan khong hop le'
        };
    }

    if (!taiKhoan) {
        return {
            thanhCong: false,
            thongBao: 'Khong tim thay tai khoan'
        };
    }

    // Kiem tra tenDangNhap neu duoc cung cap
    if (tenDangNhap && tenDangNhap !== taiKhoan.tenDangNhap) {
        return {
            thanhCong: false,
            thongBao: 'Ten dang nhap khong khop voi tai khoan'
        };
    }

    tenDangNhap = taiKhoan.tenDangNhap;

    // Tao ma ngau nhien 5 ky tu
    const maNgauNhien = crypto.randomBytes(3).toString('uppercase')
        .replace(/[^A-Z0-9]/g, () => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[crypto.randomInt(36)]);

    const maGiaoDich = `NAP ${tenDangNhap.toUpperCase()} ${maNgauNhien}`;
    const noiDungChuyenKhoan = maGiaoDich;

    // Tao giao dich pending trong database
    const giaoDich = new WalletTransaction({
        discordId: taiKhoan._id.toString(), // Su dung _id cua TaiKhoan
        discordUsername: tenDangNhap,
        type: 'topup',
        direction: 'credit',
        amountCents: soTienVnd, // Su dung soTienVnd truc tiep (khong quy doi sang cents)
        currency: 'VND',
        method: 'sepay_mb_bank',
        status: 'pending',
        referenceCode: maGiaoDich,
        memoExpected: noiDungChuyenKhoan,
        provider: 'sepay',
        providerPaymentId: ''
    });

    await giaoDich.save();

    return {
        thanhCong: true,
        maGiaoDich: maGiaoDich,
        soTien: soTienVnd,
        noiDungChuyenKhoan: noiDungChuyenKhoan,
        thongTinNganHang: {
            tenNganHang: 'MB Bank',
            soTaiKhoan: SEPAY_MB_BANK_ACCOUNT,
            tenChuTaiKhoan: SEPAY_ACCOUNT_NAME
        }
    };
}

/**
 * Xu ly webhook tu SePay
 * @param {Object} payload - Du lieu webhook
 * @param {string} signature - Chu ky webhook
 * @returns {Promise<Object>}
 */
async function xuLyWebhook(payload, signature) {
    // Kiem tra chu ky webhook
    if (SEPAY_WEBHOOK_SECRET) {
        const expectedSignature = crypto
            .createHmac('sha256', SEPAY_WEBHOOK_SECRET)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (signature !== expectedSignature) {
            return {
                thanhCong: false,
                thongBao: 'Chu ky webhook khong hop le'
            };
        }
    }

    // Parse thong tin giao dich tu webhook
    const {
        amount,
        content,
        transaction_id,
        status
    } = payload;

    const soTien = parseInt(amount, 10);
    const noiDung = String(content || '').trim();
    const maGiaoDichSepay = String(transaction_id || '').trim();
    const trangThaiGiaoDich = status;

    // Kiem tra du lieu
    if (!soTien || !noiDung) {
        return {
            thanhCong: false,
            thongBao: 'Du lieu webhook khong day du'
        };
    }

    // Neu giao dich loi hoac bi huy bo qua
    if (trangThaiGiaoDich === 'failed' || trangThaiGiaoDich === 'canceled') {
        // Cap nhat trang that giao dich thanh rejected
        await WalletTransaction.findOneAndUpdate(
            { referenceCode: noiDung, status: 'pending' },
            { status: 'rejected', providerPaymentId: maGiaoDichSepay }
        );

        return {
            thanhCong: true,
            thongBao: 'Giao dich bi huy bo qua'
        };
    }

    // Tim giao dich pending trong database
    const giaoDich = await WalletTransaction.findOne({
        referenceCode: noiDung,
        type: 'topup',
        status: 'pending'
    });

    if (!giaoDich) {
        // Kiem tra xem da xu ly chua
        const daXuLy = await WalletTransaction.findOne({
            referenceCode: noiDung,
            providerPaymentId: maGiaoDichSepay,
            status: 'completed'
        });

        if (daXuLy) {
            // Idempotent: da xu ly roi
            return {
                thanhCong: true,
                thongBao: 'Giao dich da duoc xu ly truoc do'
            };
        }

        return {
            thanhCong: false,
            thongBao: 'Khong tim thay giao dich pending'
        };
    }

    // Kiem tra so tien khop
    if (giaoDich.amountCents !== soTien) {
        return {
            thanhCong: false,
            thongBao: `So tien khong khop. Yeu cau: ${giaoDich.amountCents} VND, Nhan duoc: ${soTien} VND`
        };
    }

    // Kiem tra giao dich da xu ly chua (idempotent)
    if (giaoDich.providerPaymentId && giaoDich.providerPaymentId === maGiaoDichSepay) {
        return {
            thanhCong: true,
            thongBao: 'Giao dich da duoc xu ly truoc do'
        };
    }

    // Cap nhat vi (atomic update voi dieu kien soDuVi)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const updatedTaiKhoan = await TaiKhoan.findOneAndUpdate(
            {
                _id: giaoDich.discordId,
                soDuVi: { $gte: 0 } // Đieu kien de dam ba tinh atomic
            },
            {
                $inc: { soDuVi: soTien }
            },
            {
                new: true,
                session
            }
        );

        if (!updatedTaiKhoan) {
            throw new Error('Khong cap nhat duoc vi');
        }

        // Cap nhat trang thai giao dich
        giaoDich.status = 'completed';
        giaoDich.providerPaymentId = maGiaoDichSepay;
        giaoDich.txnId = maGiaoDichSepay;
        giaoDich.balanceAfterCents = updatedTaiKhoan.soDuVi;
        giaoDich.reviewedAt = new Date();
        giaoDich.reviewedBy = 'sepay_webhook';

        await giaoDich.save({ session });
        await session.commitTransaction();

        return {
            thanhCong: true,
            thongBao: `Nap ${soTien.toLocaleString('vi-VN')} VND thanh cong! So du vi hien tai: ${updatedTaiKhoan.soDuVi.toLocaleString('vi-VN')} VND`
        };

    } catch (err) {
        await session.abortTransaction();

        return {
            thanhCong: false,
            thongBao: 'Loi khi xu ly giao dich: ' + (err.message || 'Loi khong xac dinh')
        };
    } finally {
        session.endSession();
    }
}

/**
 * Lay thong tin nap tien theo ma giao dich
 * @param {string} maGiaoDich - Ma giao dich
 * @returns {Promise<Object>}
 */
async function layThongTinNapTien(maGiaoDich) {
    // Tim giao dich trong database
    const giaoDich = await WalletTransaction.findOne({
        referenceCode: maGiaoDich
    });

    if (!giaoDich) {
        return {
            thanhCong: false,
            thongBao: 'Khong tim thay giao dich'
        };
    }

    // Lay thong tin vi hien tai
    let soDuViHienTai = 0;
    try {
        const taiKhoan = await TaiKhoan.findById(giaoDich.discordId);
        if (taiKhoan) {
            soDuViHienTai = taiKhoan.soDuVi || 0;
        }
    } catch (err) {
        // Bo qua loi lay so du
    }

    return {
        thanhCong: true,
        maGiaoDich: giaoDich.referenceCode,
        soTien: giaoDich.amountCents,
        trangThai: giaoDich.status,
        phuongThuc: giaoDich.method,
        ngayTao: giaoDich.createdAt,
        ngayCapNhat: giaoDich.updatedAt,
        soDuVi: soDuViHienTai
    };
}

/**
 * Lay thong tin ngan hang cho hien thi o frontend
 * @returns {Object}
 */
function layThongTinNganHang() {
    return {
        thanhCong: true,
        tenNganHang: 'MB Bank',
        soTaiKhoan: SEPAY_MB_BANK_ACCOUNT,
        tenChuTaiKhoan: SEPAY_ACCOUNT_NAME
    };
}

module.exports = {
    taoMaNapTien,
    xuLyWebhook,
    layThongTinNapTien,
    layThongTinNganHang
};