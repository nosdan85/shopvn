# 🔐 COMPLETE ENV VARS FOR RENDER - FINAL CHECKLIST

## ⚠️ BẮT BUỘC PHẢI CÓ (9 vars)

### 1. Admin Authentication
```env
JWT_ADMIN_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123
TOKEN_ENCRYPTION_KEY=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

### 2. Discord Bot (BẮT BUỘC cho ticket system)
```env
# Bot token - Get from Discord Developer Portal
DISCORD_BOT_TOKEN=<your_bot_token>

# Server ID - Right-click server → Copy Server ID
DISCORD_GUILD_ID=<your_server_id>

# Category ID for tickets - Right-click category → Copy ID
DISCORD_TICKET_CATEGORY_ID=<category_id>

# Owner/Admin user ID - Right-click your name → Copy User ID
DISCORD_OWNER_ID=<your_user_id>

# Owner role ID (staff role) - Right-click role → Copy Role ID
DISCORD_OWNER_ROLE_ID=<role_id>
```

---

## 🟡 RECOMMENDED (Nice to have - 6 vars)

### 3. Discord OAuth (cho login Discord trên web)
```env
DISCORD_CLIENT_ID=<oauth_client_id>
DISCORD_CLIENT_SECRET=<oauth_client_secret>
```

### 4. Discord Notification Channels
```env
# Channel để post vouch/reviews
DISCORD_VOUCH_CHANNEL_ID=<channel_id>

# Channel thông báo nạp tiền thành công
DISCORD_WALLET_NOTIFY_CHANNEL_ID=<channel_id>
```

### 5. Payment Display Info
```env
# Hiển thị cho khách hàng
PAYPAL_PAYMENT_EMAIL=nguyenquanghuy111106@gmail.com
LTC_PAY_ADDRESS=ltc1ququ7e6ryccpnu7jgy0l4vukgc3mventxyulyge
CASHAPP_HANDLE=$yourcashapp
```

### 6. Image Upload
```env
IMGBB_API_KEY=<your_imgbb_api_key>
```

---

## 📊 SUMMARY - WHAT YOU NEED

### ✅ Already Have (17 vars):
- MONGO_URI
- JWT_SECRET
- CLIENT_URL
- SEPAY_BOT_API_KEY
- SEPAY_BOT_ENABLED
- SEPAY_BOT_INTERVAL_MS
- SEPAY_WEBHOOK_SECRET
- BANK_ACCOUNT_NAME
- BANK_ACCOUNT_NUMBER
- BANK_NAME
- GACHTHEFAST credentials
- NODE_ENV
- ...etc

### ❌ CRITICAL - Must Add (9 vars):
1. `JWT_ADMIN_SECRET`
2. `ADMIN_USERNAME`
3. `ADMIN_PASSWORD`
4. `TOKEN_ENCRYPTION_KEY`
5. `DISCORD_BOT_TOKEN` ⚠️
6. `DISCORD_GUILD_ID` ⚠️
7. `DISCORD_TICKET_CATEGORY_ID` ⚠️
8. `DISCORD_OWNER_ID` ⚠️
9. `DISCORD_OWNER_ROLE_ID` ⚠️

### 🟡 OPTIONAL - Recommended (6 vars):
- Discord OAuth (2)
- Discord channels (2)
- Payment display (3)
- ImgBB API key (1)

---

## 🤖 DISCORD BOT SETUP

### Step 1: Create Discord Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it (e.g., "NosRoblox Bot")
4. Go to **Bot** tab → Click "Add Bot"
5. **Copy Bot Token** → This is `DISCORD_BOT_TOKEN`
6. Enable these **Privileged Gateway Intents**:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent

### Step 2: Invite Bot to Server

1. Go to **OAuth2** → **URL Generator**
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select permissions:
   - ✅ Manage Channels
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Read Message History
   - ✅ Add Reactions
4. Copy generated URL → Open in browser → Invite to your server

### Step 3: Get IDs

**Enable Developer Mode first**:
Discord Settings → Advanced → ✅ Developer Mode

Then right-click to copy:
- **Server** → Copy Server ID → `DISCORD_GUILD_ID`
- **Ticket Category** → Copy ID → `DISCORD_TICKET_CATEGORY_ID`
- **Your Username** → Copy User ID → `DISCORD_OWNER_ID`
- **Staff Role** → Copy Role ID → `DISCORD_OWNER_ROLE_ID`
- **Vouch Channel** → Copy ID → `DISCORD_VOUCH_CHANNEL_ID` (optional)

### Step 4: Create Ticket Category

1. Right-click your server → Create Category
2. Name: "📋 Tickets" (hoặc tên khác)
3. Set permissions:
   - @everyone → ❌ View Channel
   - Bot role → ✅ View Channel, Manage Channels, Send Messages
4. Right-click category → Copy ID

---

## 📋 FINAL CHECKLIST

Copy this to Render → Environment:

```env
# === ADMIN (4) ===
JWT_ADMIN_SECRET=<generate>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<your_password>
TOKEN_ENCRYPTION_KEY=<generate>

# === DISCORD BOT (5) ===
DISCORD_BOT_TOKEN=<from_discord_dev_portal>
DISCORD_GUILD_ID=<your_server_id>
DISCORD_TICKET_CATEGORY_ID=<category_id>
DISCORD_OWNER_ID=<your_user_id>
DISCORD_OWNER_ROLE_ID=<staff_role_id>

# === DISCORD OAUTH (2 - Optional) ===
DISCORD_CLIENT_ID=<oauth_client_id>
DISCORD_CLIENT_SECRET=<oauth_secret>

# === DISCORD CHANNELS (2 - Optional) ===
DISCORD_VOUCH_CHANNEL_ID=<channel_id>
DISCORD_WALLET_NOTIFY_CHANNEL_ID=<channel_id>

# === PAYMENT DISPLAY (3 - Optional) ===
PAYPAL_PAYMENT_EMAIL=nguyenquanghuy111106@gmail.com
LTC_PAY_ADDRESS=ltc1ququ7e6ryccpnu7jgy0l4vukgc3mventxyulyge
CASHAPP_HANDLE=$yourcashapp

# === IMAGE UPLOAD (1 - Optional) ===
IMGBB_API_KEY=<your_key>
```

---

## 🚀 AFTER ADDING

### 1. Deploy & Check Logs
```
[DISCORD] Bot dang cho login...
[DISCORD] Bot login thanh cong
[DISCORD] Bot da san sang
[SEPAY_BOT] 🚀 Khởi động bot...
[SEPAY_BOT] ✅ Bot đã khởi động thành công!
```

### 2. Test Bot
- Tạo test order trên website
- Click "Tạo Ticket" trong admin
- Check Discord → Ticket channel xuất hiện!

### 3. Test Payment
- Website → Nạp tiền → Tạo mã
- Transfer MB Bank
- Wait 5-10s
- Check logs: `✅ Nạp XXX VND thành công!`

---

## ⚠️ IMPORTANT NOTES

1. **Discord Bot Token** giữ BÍ MẬT - không share!
2. **Admin Password** dùng password mạnh (min 12 chars)
3. **Generate secrets** bằng command đã cho
4. **Test locally** trước khi deploy production

---

## 🆘 TROUBLESHOOTING

**Bot không kết nối Discord?**
- Check DISCORD_BOT_TOKEN đúng chưa
- Verify Privileged Intents đã bật
- Check bot đã được invite vào server chưa

**Không tạo được ticket?**
- Check DISCORD_TICKET_CATEGORY_ID đúng chưa
- Verify bot có quyền Manage Channels
- Check category permissions

**SePay bot không chạy?**
- Check SEPAY_BOT_ENABLED=true
- Verify SEPAY_BOT_API_KEY đúng
- Check MongoDB đã connect chưa

---

**Total vars to add: 9 critical + 6 optional = 15 vars**

**Ready to deploy! 🚀**
