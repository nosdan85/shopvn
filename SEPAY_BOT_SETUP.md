# 🤖 SEPAY BOT - TỰ ĐỘNG QUÉT GIAO DỊCH & NẠP TIỀN

## 📋 Tổng Quan

SePay Bot là service tự động **quét (polling)** các giao dịch MB Bank từ SePay API mỗi vài giây để phát hiện giao dịch mới và tự động cộng tiền vào ví user.

**Không cần webhook!** Bot chủ động gọi SePay API để check giao dịch mới.

---

## 🔄 CÁCH HOẠT ĐỘNG

### Flow Tổng Thể:

```
1. User tạo mã nạp tiền trên website
   ↓
2. Website tạo transaction pending trong DB
   Mã: "NAP USERNAME ABC123"
   ↓
3. User chuyển khoản MB Bank với nội dung: "NAP USERNAME ABC123"
   ↓
4. SePay BOT đang chạy trong background (mỗi 5 giây check 1 lần)
   ↓
5. Bot gọi SePay API: GET /transactions/list
   ↓
6. SePay trả về danh sách 20 giao dịch mới nhất
   ↓
7. Bot loop qua từng giao dịch:
   - Kiểm tra nội dung có match với pending transaction không
   - Kiểm tra số tiền có khớp không
   - Nếu match → Cộng tiền vào ví user
   ↓
8. User refresh trang → Thấy số dư đã tăng!
```

---

## 📂 CẤU TRÚC CODE

### Hiện tại trong project của bạn:

```
api/
├── services/
│   └── sepayService.js          # Service xử lý webhook (hiện tại)
│
└── bot/
    └── sepayPollingBot.js       # ❌ CHƯA CÓ - Cần tạo!
```

**Bot cần tạo**: `api/bot/sepayPollingBot.js`

---

## 🛠️ TẠO SEPAY POLLING BOT

### File: `api/bot/sepayPollingBot.js`

```javascript
/**
 * SePay Polling Bot
 * Tự động quét giao dịch MB Bank từ SePay API mỗi X giây
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
        console.log(`[SEPAY_BOT] Không tìm thấy pending transaction cho: ${noiDung}`);
        return;
    }

    // Kiểm tra số tiền có khớp không
    if (giaoDich.amountVnd !== soTien) {
        console.warn(`[SEPAY_BOT] Số tiền không khớp. Yêu cầu: ${giaoDich.amountVnd}, Nhận: ${soTien}`);
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
        // Chuyển discordId (string) thành ObjectId
        const taiKhoanId = mongoose.Types.ObjectId(giaoDich.discordId);

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
        console.error(`[SEPAY_BOT] Lỗi khi xử lý giao dịch ${noiDung}:`, err.message);
    } finally {
        session.endSession();
    }
}

/**
 * Main polling loop
 */
async function pollTransactions() {
    if (!SEPAY_BOT_ENABLED) {
        console.log('[SEPAY_BOT] Bot bị tắt (SEPAY_BOT_ENABLED=false)');
        return;
    }

    if (!SEPAY_BOT_API_KEY) {
        console.error('[SEPAY_BOT] Thiếu SEPAY_BOT_API_KEY!');
        return;
    }

    console.log('[SEPAY_BOT] Đang quét giao dịch...');

    try {
        const transactions = await fetchRecentTransactions();

        if (transactions.length === 0) {
            console.log('[SEPAY_BOT] Không có giao dịch mới');
            return;
        }

        console.log(`[SEPAY_BOT] Tìm thấy ${transactions.length} giao dịch`);

        // Xử lý từng giao dịch (từ cũ đến mới)
        for (const txn of transactions.reverse()) {
            await processTransaction(txn);
            lastProcessedTransactionId = txn.id;
        }

    } catch (err) {
        console.error('[SEPAY_BOT] Lỗi trong polling loop:', err.message);
    }
}

/**
 * Khởi động bot
 */
function start() {
    if (isRunning) {
        console.warn('[SEPAY_BOT] Bot đã đang chạy rồi!');
        return;
    }

    if (!SEPAY_BOT_ENABLED) {
        console.log('[SEPAY_BOT] Bot bị tắt. Set SEPAY_BOT_ENABLED=true để bật.');
        return;
    }

    console.log(`[SEPAY_BOT] Khởi động bot (polling interval: ${SEPAY_BOT_INTERVAL_MS}ms)...`);
    
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
        console.warn('[SEPAY_BOT] Bot chưa chạy!');
        return;
    }

    console.log('[SEPAY_BOT] Đang dừng bot...');
    
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
```

---

## 🚀 KHỞI ĐỘNG BOT TRONG SERVER

### Update `api/server.js`:

```javascript
// Thêm vào cuối file, sau khi MongoDB connect

// Khởi động SePay Bot (nếu enabled)
const sepayBot = require('./bot/sepayPollingBot');

mongoose.connection.once('open', () => {
    console.log('[DB] MongoDB connected');
    
    // Start SePay bot sau khi DB ready
    if (process.env.SEPAY_BOT_ENABLED === 'true') {
        sepayBot.start();
    }
});
```

---

## ⚙️ ENVIRONMENT VARIABLES (RENDER)

### Bạn đã có (OK ✅):

```env
SEPAY_BOT_API_KEY=XWGL3BXBMWADKGSE6RRTAETJLKZURV8BP4BC9GOGSDUH6HCNIO0L23H8PQDI5YWO
SEPAY_BOT_API_URL=https://my.sepay.vn/userapi/transactions/list?limit=20
SEPAY_BOT_ENABLED=true
SEPAY_BOT_INTERVAL_MS=5000
```

### Thiếu các biến này (CẦN THÊM ❌):

```env
# Discord Bot (nếu muốn dùng Discord features)
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_GUILD_ID=your_server_id

# Admin
JWT_ADMIN_SECRET=your_admin_jwt_secret_here  # ⚠️ THIẾU
ADMIN_PASSWORD=your_secure_admin_password     # ⚠️ THIẾU

# Payment methods (hiển thị cho khách)
PAYPAL_EMAIL=your_paypal@email.com            # ⚠️ THIẾU
LTC_PAY_ADDRESS=your_ltc_address              # ⚠️ THIẾU
CASHAPP_HANDLE=your_cashapp                   # ⚠️ THIẾU

# ImgBB (upload images)
IMGBB_API_KEY=your_imgbb_api_key              # ⚠️ THIẾU

# Token encryption
TOKEN_ENCRYPTION_KEY=your_32_byte_hex         # ⚠️ THIẾU
```

---

## 📋 ENVIRONMENT VARIABLES CHECKLIST

### ✅ Đã Có (17 vars):
- ✅ API_BASE_URL
- ✅ BANK_ACCOUNT_NAME
- ✅ BANK_ACCOUNT_NUMBER
- ✅ BANK_NAME
- ✅ CLIENT_ORIGIN
- ✅ CLIENT_URL
- ✅ GACHTHEFAST_API_URL
- ✅ GACHTHEFAST_PARTNER_ID
- ✅ GACHTHEFAST_PARTNER_KEY
- ✅ GACHTHEFAST_SUBMIT_METHOD
- ✅ JWT_SECRET
- ✅ MONGO_URI
- ✅ NEXT_PUBLIC_API_URL
- ✅ NODE_ENV
- ✅ SEPAY_BOT_API_KEY
- ✅ SEPAY_BOT_API_URL
- ✅ SEPAY_BOT_ENABLED
- ✅ SEPAY_BOT_INTERVAL_MS
- ✅ SEPAY_WEBHOOK_SECRET
- ✅ TURSO_AUTH_TOKEN (không dùng - có thể xóa)
- ✅ TURSO_DATABASE_URL (không dùng - có thể xóa)

### ❌ Cần Thêm (10+ vars):

```env
# === BẮT BUỘC ===

# Admin
JWT_ADMIN_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
ADMIN_PASSWORD=<your_secure_password_min_8_chars>

# Token encryption
TOKEN_ENCRYPTION_KEY=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# === TÙY CHỌN (nhưng nên có) ===

# Payment display
PAYPAL_EMAIL=nguyenquanghuy111106@gmail.com
LTC_PAY_ADDRESS=ltc1ququ7e6ryccpnu7jgy0l4vukgc3mventxyulyge
CASHAPP_HANDLE=$yourcashapp

# Image uploads
IMGBB_API_KEY=<your_imgbb_api_key>

# Discord Bot (nếu dùng features Discord)
DISCORD_BOT_TOKEN=<your_bot_token>
DISCORD_CLIENT_ID=<your_client_id>
DISCORD_CLIENT_SECRET=<your_client_secret>
DISCORD_GUILD_ID=<your_server_id>
DISCORD_TICKET_CATEGORY_ID=<category_id>
DISCORD_VOUCH_CHANNEL_ID=<channel_id>
DISCORD_WALLET_NOTIFY_CHANNEL_ID=<channel_id>
```

---

## 🧪 TEST BOT

### 1. Khởi động server local:

```bash
cd api
npm install axios  # Nếu chưa có

# Set env vars
export SEPAY_BOT_ENABLED=true
export SEPAY_BOT_API_KEY=XWGL3BXBMWADKGSE6RRTAETJLKZURV8BP4BC9GOGSDUH6HCNIO0L23H8PQDI5YWO
export SEPAY_BOT_API_URL=https://my.sepay.vn/userapi/transactions/list
export SEPAY_BOT_INTERVAL_MS=5000

node server.js
```

### 2. Check logs:

```
[SEPAY_BOT] Khởi động bot (polling interval: 5000ms)...
[SEPAY_BOT] ✅ Bot đã khởi động thành công!
[SEPAY_BOT] Đang quét giao dịch...
[SEPAY_BOT] Tìm thấy 3 giao dịch
[SEPAY_BOT] Phát hiện giao dịch: NAP USERNAME ABC123 - 50000 VND
✅ [SEPAY_BOT] Nạp 50,000 VND thành công cho username! Số dư mới: 50,000 VND
```

### 3. Test flow:

1. Login website → Tạo mã nạp: `NAP USERNAME ABC123`
2. Chuyển khoản MB Bank với nội dung: `NAP USERNAME ABC123`
3. Đợi 5-10 giây → Bot sẽ phát hiện và cộng tiền
4. Refresh trang → Số dư đã tăng!

---

## 🚀 DEPLOY LÊN RENDER

### Render đã có bot enabled:

```
SEPAY_BOT_ENABLED=true ✅
```

Bot sẽ **TỰ ĐỘNG** chạy khi server start!

---

## 📊 MONITORING

### Check bot status:

```javascript
// Thêm health check endpoint
app.get('/health', (req, res) => {
    const sepayBot = require('./bot/sepayPollingBot');
    
    res.json({
        status: 'ok',
        sepayBot: {
            running: sepayBot.isRunning(),
            enabled: process.env.SEPAY_BOT_ENABLED === 'true'
        }
    });
});
```

---

## 🎯 TÓM TẮT

**Bot làm gì?**
- Mỗi 5 giây gọi SePay API 1 lần
- Lấy 20 giao dịch MB Bank mới nhất
- Check xem có giao dịch nào match với pending transaction không
- Nếu có → Tự động cộng tiền vào ví user

**Không cần webhook!**
- Bot chủ động polling (quét)
- Không cần mở port, không cần public URL

**Đã setup gì?**
- ENV vars đã OK ✅
- Chỉ cần tạo file `api/bot/sepayPollingBot.js`
- Update `api/server.js` để start bot
- Deploy lên Render → Bot tự chạy!

---

Tôi tạo file code cho bạn ngay không? 🚀
