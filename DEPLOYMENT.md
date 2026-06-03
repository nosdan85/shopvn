# Hướng Dẫn Deploy - Shop VN

## 📋 Tổng Quan

Hệ thống bao gồm 3 phần:
1. **Frontend (Next.js)** - Deploy lên Vercel
2. **Backend API (Express/MongoDB)** - Deploy lên Render
3. **Discord Bot** - Deploy lên Render (hoặc cùng container với API)

---

## 🌐 1. DEPLOY FRONTEND (VERCEL)

### Bước 1: Chuẩn bị Repository

```bash
cd web
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo>
git push -u origin main
```

### Bước 2: Import vào Vercel

1. Truy cập https://vercel.com
2. Click **Add New** → **Project**
3. Import repository GitHub của bạn
4. Chọn folder `web` làm root directory
5. Framework Preset: **Next.js**
6. Build Command: `npm run build` (mặc định)
7. Output Directory: `.next` (mặc định)

### Bước 3: Cấu hình Environment Variables

Trong Vercel Project Settings → Environment Variables, thêm:

```env
# API Backend URL
NEXT_PUBLIC_API_URL=https://your-api.onrender.com

# Site URL
NEXT_PUBLIC_SITE_URL=https://your-shop.vercel.app

# Discord OAuth (cho linking Discord)
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
NEXT_PUBLIC_DISCORD_REDIRECT_URI=https://your-shop.vercel.app/lien-ket-discord/callback
```

### Bước 4: Deploy

Click **Deploy** - Vercel sẽ tự động build và deploy.

### Bước 5: Custom Domain (Optional)

1. Trong Vercel Project Settings → Domains
2. Add domain: `shop.yourdomain.com`
3. Cập nhật DNS records theo hướng dẫn của Vercel:
   - Type: `CNAME`
   - Name: `shop` (hoặc `@` nếu root domain)
   - Value: `cname.vercel-dns.com`

---

## 🔧 2. DEPLOY BACKEND API (RENDER)

### Bước 1: Chuẩn bị Repository

```bash
cd api
git init
git add .
git commit -m "Initial backend"
git remote add origin <your-backend-github-repo>
git push -u origin main
```

### Bước 2: Tạo Web Service trên Render

1. Truy cập https://render.com
2. Click **New** → **Web Service**
3. Connect repository GitHub
4. Cấu hình:
   - **Name**: `shopvn-api`
   - **Region**: Singapore (gần Việt Nam nhất)
   - **Branch**: `main`
   - **Root Directory**: `api` (nếu backend trong subfolder)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free (hoặc Starter - $7/month cho production)

### Bước 3: Environment Variables trên Render

Trong Service → Environment, thêm:

```env
# MongoDB
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/shopvn?retryWrites=true&w=majority

# JWT Secret (tạo random string dài)
JWT_SECRET=your_super_secret_jwt_key_min_32_characters

# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://your-shop.vercel.app/lien-ket-discord/callback
DISCORD_GUILD_ID=your_server_id
DISCORD_INVITE_LINK=https://discord.gg/your_invite

# CORS
CLIENT_URL=https://your-shop.vercel.app,https://shop.yourdomain.com

# SePay (Nạp tiền MB Bank)
SEPAY_API_KEY=your_sepay_api_key
SEPAY_ACCOUNT_NUMBER=your_mb_bank_account_number
SEPAY_ACCOUNT_NAME=YOUR_ACCOUNT_NAME

# Gạch Thẻ Cào
GACHTHE_API_KEY=your_gachthe_api_key
GACHTHE_PARTNER_ID=your_partner_id

# Redis (Optional - nếu dùng caching)
REDIS_URL=redis://default:password@redis-host:6379

# Render settings
PORT=3000
NODE_ENV=production
TRUST_PROXY=true
```

### Bước 4: Deploy

Click **Create Web Service** - Render sẽ tự động deploy.

### Bước 5: Custom Domain (Optional)

1. Trong Render Service → Settings → Custom Domain
2. Add domain: `api.yourdomain.com`
3. Cập nhật DNS records:
   - Type: `CNAME`
   - Name: `api`
   - Value: `shopvn-api.onrender.com` (giá trị Render cung cấp)

---

## 🤖 3. DEPLOY DISCORD BOT (RENDER)

### Option A: Deploy Bot Cùng API (Khuyến nghị)

Bot đã được tích hợp trong API server (`api/bot.js`), chỉ cần đảm bảo có `DISCORD_BOT_TOKEN` trong ENV.

### Option B: Deploy Bot Riêng (Background Worker)

1. Tạo **Background Worker** trên Render
2. Repository: same as API
3. Build Command: `npm install`
4. Start Command: `node bot/index.js` (hoặc `node api/bot.js`)
5. Environment Variables: (giống API, chỉ cần bot-related vars)

```env
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id
MONGO_URI=mongodb+srv://...
```

---

## 🗄️ 4. SETUP MONGODB

### Option A: MongoDB Atlas (Cloud - Khuyến nghị)

1. Truy cập https://cloud.mongodb.com
2. Tạo Free Cluster (M0 - 512MB)
3. Region: Singapore
4. Create Database User (username + password)
5. Network Access → Add IP: `0.0.0.0/0` (allow all - Render IPs thay đổi)
6. Copy Connection String → paste vào `MONGO_URI`

### Option B: Railway MongoDB

1. Truy cập https://railway.app
2. New Project → Add MongoDB
3. Copy `MONGO_URL` → paste vào `MONGO_URI`

---

## 🔐 5. SETUP DISCORD OAUTH

### Bước 1: Tạo Discord Application

1. Truy cập https://discord.com/developers/applications
2. Click **New Application** → Đặt tên "ShopVN"
3. Vào tab **OAuth2**

### Bước 2: Cấu hình Redirect URIs

Add các URLs sau vào **Redirects**:
- `http://localhost:3000/lien-ket-discord/callback` (dev)
- `https://your-shop.vercel.app/lien-ket-discord/callback` (production)
- `https://shop.yourdomain.com/lien-ket-discord/callback` (custom domain)

### Bước 3: Lấy Credentials

- **Client ID**: Copy và paste vào ENV
- **Client Secret**: Generate → Copy → paste vào ENV

### Bước 4: Bot Setup

1. Vào tab **Bot**
2. Click **Reset Token** → Copy `DISCORD_BOT_TOKEN`
3. Enable **Privileged Gateway Intents**:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
4. **Bot Permissions**: Administrator (hoặc chọn riêng)

### Bước 5: Invite Bot vào Server

Generate invite link:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

---

## 💳 6. SETUP THANH TOÁN TỰ ĐỘNG

### A. SePay (Chuyển Khoản MB Bank)

1. Đăng ký tài khoản: https://my.sepay.vn
2. Xác thực tài khoản ngân hàng MB Bank
3. Lấy **API Key** từ Dashboard
4. Webhook URL: `https://your-api.onrender.com/api/vi/nap-tien/chuyen-khoan/webhook`
5. Test webhook với Postman để đảm bảo hoạt động

**Lưu ý**: SePay tự động quét nội dung chuyển khoản và gửi webhook khi phát hiện giao dịch.

### B. Gạch Thẻ Cào

1. Đăng ký đối tác với nhà cung cấp (vd: https://gachthe.net)
2. Lấy API Key + Partner ID
3. Configure callback URL (nếu có): `https://your-api.onrender.com/api/vi/nap-tien/the-cao/callback`

**Lưu ý**: Phí dịch vụ thường 20-30% giá trị thẻ.

---

## 🎯 7. KIỂM TRA SAU KHI DEPLOY

### Frontend Checks

- [ ] Truy cập `https://your-shop.vercel.app`
- [ ] Trang chủ load đúng
- [ ] Navbar hiển thị đúng
- [ ] Có thể đăng ký tài khoản
- [ ] Có thể đăng nhập

### Backend API Checks

- [ ] Health check: `https://your-api.onrender.com/health`
- [ ] Response: `{ "trangThai": "ok", "redis": "...", "queue": "..." }`
- [ ] POST `/api/tai-khoan/dang-ky` hoạt động
- [ ] POST `/api/tai-khoan/dang-nhap` hoạt động

### Discord Bot Checks

- [ ] Bot online trong server
- [ ] Bot có quyền tạo channel
- [ ] Test command (nếu có)

### Payment Checks

- [ ] Tạo giao dịch nạp tiền → nhận được QR code
- [ ] Webhook SePay hoạt động (test với Postman)
- [ ] Gạch thẻ cào → trả về kết quả

---

## 🔄 8. AUTO DEPLOY (CI/CD)

### Vercel (Frontend)

Tự động deploy khi push code lên GitHub:
- Main branch → Production
- Other branches → Preview deployments

### Render (Backend)

Tự động deploy khi push code:
1. Settings → Build & Deploy
2. Auto-Deploy: **Yes**
3. Branch: `main`

---

## 🌍 9. CUSTOM DOMAIN SETUP

### A. Mua Domain

Mua domain từ:
- Namecheap (khuyến nghị)
- GoDaddy
- Google Domains

### B. Cấu hình DNS

Giả sử domain: `yourshop.com`

**Frontend (Vercel)**:
- Type: `CNAME`
- Name: `@` (root) hoặc `www`
- Value: `cname.vercel-dns.com`

**Backend API (Render)**:
- Type: `CNAME`
- Name: `api`
- Value: `shopvn-api.onrender.com`

**Admin Panel** (optional):
- Type: `CNAME`
- Name: `admin`
- Value: `cname.vercel-dns.com` (same as frontend)

### C. Cập nhật Environment Variables

Sau khi domain active, cập nhật:

**Vercel**:
```env
NEXT_PUBLIC_SITE_URL=https://yourshop.com
NEXT_PUBLIC_DISCORD_REDIRECT_URI=https://yourshop.com/lien-ket-discord/callback
```

**Render**:
```env
CLIENT_URL=https://yourshop.com,https://www.yourshop.com
```

**Discord App**:
- Thêm redirect URI: `https://yourshop.com/lien-ket-discord/callback`

---

## 🐛 10. TROUBLESHOOTING

### Frontend không kết nối được API

**Lỗi**: CORS error
**Fix**:
- Kiểm tra `CLIENT_URL` trong Render ENV
- Đảm bảo domain frontend đã được thêm
- Restart Render service

### Bot không online

**Fix**:
- Kiểm tra `DISCORD_BOT_TOKEN` đúng chưa
- Kiểm tra Render logs: `View Logs`
- Bot intents enabled trong Discord Developer Portal

### Webhook không nhận được

**Fix SePay**:
- Kiểm tra webhook URL đúng
- Test với Postman POST request
- Kiểm tra signature verification

**Fix Gạch Thẻ**:
- Kiểm tra API key + Partner ID
- Test với sandbox environment trước

### Database connection failed

**Fix**:
- Kiểm tra `MONGO_URI` đúng format
- Network Access trong MongoDB Atlas: allow `0.0.0.0/0`
- Kiểm tra user/password không có ký tự đặc biệt (encode URL)

---

## 📊 11. MONITORING & LOGS

### Vercel Logs

Dashboard → Project → Analytics → Logs

### Render Logs

Dashboard → Service → Logs (real-time)

### MongoDB Atlas Monitoring

Dashboard → Cluster → Metrics

---

## 🔒 12. BẢO MẬT

### Must-Have

- [ ] `JWT_SECRET` phải random string dài (min 32 chars)
- [ ] MongoDB user có password mạnh
- [ ] Discord bot token giữ bí mật
- [ ] SePay/Gachthe API keys không commit vào Git
- [ ] Enable 2FA cho Vercel/Render/MongoDB accounts

### Recommended

- [ ] Rate limiting enabled (đã có sẵn trong code)
- [ ] HTTPS enforced (Vercel/Render tự động)
- [ ] Environment variables không bao giờ hardcode

---

## 📞 13. HỖ TRỢ

### Documentation

- Vercel: https://vercel.com/docs
- Render: https://render.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com
- Discord.js: https://discord.js.org

### Issues

Nếu gặp vấn đề, check:
1. Render logs
2. Vercel function logs
3. MongoDB Atlas metrics
4. Discord Developer Portal

---

## 🎉 DONE!

Sau khi hoàn thành tất cả bước trên, hệ thống của bạn đã sẵn sàng hoạt động!

**Test full flow**:
1. Đăng ký tài khoản mới
2. Nạp tiền vào ví (SePay hoặc thẻ cào)
3. Mua sản phẩm
4. Liên kết Discord
5. Tạo ticket Discord
6. Admin xử lý đơn hàng

Good luck! 🚀
