# 🔐 MISSING ENVIRONMENT VARIABLES - RENDER

## ⚠️ CẦN THÊM NGAY

Các biến này **BẮT BUỘC** để hệ thống hoạt động đầy đủ:

### 1. Admin Authentication (CRITICAL)

```env
# JWT secret cho admin (khác với JWT_SECRET thường)
JWT_ADMIN_SECRET=<generate bằng lệnh dưới>

# Username đăng nhập admin panel
ADMIN_USERNAME=admin

# Password đăng nhập admin panel
ADMIN_PASSWORD=<your_secure_password_min_8_chars>
```

**Generate JWT_ADMIN_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Kết quả ví dụ: `a1b2c3d4e5f6...` (64 ký tự hex)

---

### 2. Token Encryption (CRITICAL)

```env
# Key để mã hóa tokens (32 bytes)
TOKEN_ENCRYPTION_KEY=<generate bằng lệnh dưới>
```

**Generate TOKEN_ENCRYPTION_KEY**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 3. Payment Display (RECOMMENDED)

```env
# PayPal email hiển thị cho khách
PAYPAL_EMAIL=nguyenquanghuy111106@gmail.com

# Litecoin address
LTC_PAY_ADDRESS=ltc1ququ7e6ryccpnu7jgy0l4vukgc3mventxyulyge

# CashApp handle
CASHAPP_HANDLE=$yourcashapp
```

---

### 4. Image Uploads (RECOMMENDED)

```env
# ImgBB API key để upload ảnh sản phẩm, banner
IMGBB_API_KEY=<your_imgbb_api_key>
```

**Get from**: https://imgbb.com → API → Your API Key

---

### 5. Discord Bot (OPTIONAL - nếu muốn features Discord)

```env
# Bot token
DISCORD_BOT_TOKEN=<your_bot_token>

# OAuth2 credentials
DISCORD_CLIENT_ID=<your_client_id>
DISCORD_CLIENT_SECRET=<your_client_secret>

# Server ID
DISCORD_GUILD_ID=<your_server_id>

# Channel IDs
DISCORD_TICKET_CATEGORY_ID=<category_id>
DISCORD_VOUCH_CHANNEL_ID=<channel_id>
DISCORD_WALLET_NOTIFY_CHANNEL_ID=<channel_id>
```

---

## 📋 CHECKLIST - Add to Render

Go to: Render Dashboard → Your Service → Environment

### ✅ Đã Có (Good!)
- [x] MONGO_URI
- [x] JWT_SECRET
- [x] CLIENT_URL
- [x] SEPAY_BOT_API_KEY
- [x] SEPAY_BOT_ENABLED
- [x] SEPAY_BOT_INTERVAL_MS
- [x] SEPAY_WEBHOOK_SECRET
- [x] BANK_ACCOUNT_NAME
- [x] BANK_ACCOUNT_NUMBER
- [x] GACHTHEFAST_PARTNER_ID
- [x] GACHTHEFAST_PARTNER_KEY

### ❌ Cần Thêm (Add These!)

**CRITICAL (Bắt buộc)**:
- [ ] `JWT_ADMIN_SECRET` - Generate mới
- [ ] `ADMIN_USERNAME` - Username admin (ví dụ: admin)
- [ ] `ADMIN_PASSWORD` - Mật khẩu admin của bạn
- [ ] `TOKEN_ENCRYPTION_KEY` - Generate mới

**RECOMMENDED (Nên có)**:
- [ ] `PAYPAL_EMAIL` - Email PayPal
- [ ] `LTC_PAY_ADDRESS` - Địa chỉ LTC
- [ ] `CASHAPP_HANDLE` - CashApp handle
- [ ] `IMGBB_API_KEY` - Upload ảnh

**OPTIONAL (Tùy chọn)**:
- [ ] Discord bot vars (nếu dùng Discord features)

---

## 🚀 AFTER ADDING

1. **Save** environment variables in Render
2. **Manual Deploy** (hoặc đợi auto deploy)
3. **Check logs**:
   ```
   [SEPAY_BOT] 🚀 Khởi động bot...
   [SEPAY_BOT] ✅ Bot đã khởi động thành công!
   ```

4. **Test nạp tiền**:
   - Tạo mã nạp trên web
   - Chuyển khoản MB Bank
   - Đợi 5-10 giây
   - Check logs: `✅ [SEPAY_BOT] Nạp XXX VND thành công!`

---

## 🔍 VERIFY SETUP

### Health Check
```bash
curl https://api.nosroblox.com/health
```

Response should include:
```json
{
  "trangThai": "ok",
  "sepayBot": {
    "running": true,
    "enabled": true
  }
}
```

---

## 💡 QUICK REFERENCE

### Generate Secrets Command:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run này 2 lần để tạo:
1. `JWT_ADMIN_SECRET`
2. `TOKEN_ENCRYPTION_KEY`

### Minimum Setup (để chạy được):
```env
JWT_ADMIN_SECRET=<generated_hex_64_chars>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePass123
TOKEN_ENCRYPTION_KEY=<generated_hex_64_chars>
```

---

## ⚠️ SECURITY NOTES

1. **NEVER** commit `.env` file to git
2. **Use strong passwords** (min 12 chars, mix letters/numbers/symbols)
3. **Keep secrets private** - Don't share in Discord/Slack
4. **Rotate keys regularly** - Change secrets every 3-6 months

---

**Done? Commit & deploy!** 🚀
