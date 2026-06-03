# 🛍️ ShopVN - E-commerce Platform with Discord Integration

Full-stack e-commerce platform with Discord authentication, automated payment processing, and ticket system.

---

## 🌟 Features

### 🔐 Authentication
- Traditional username/password signup
- **Optional Discord OAuth** on signup
- Discord auto-linking for order fulfillment
- Auto-admin promotion for specific Discord IDs

### 💳 Payment System
- **SePay Auto-Topup Bot** (polls every 5s)
- MB Bank transfer detection
- Automatic wallet crediting
- GachTheFast card payment integration
- No webhook required!

### 🎫 Order Management
- Discord ticket creation for orders
- Order tracking and status updates
- Wallet-based payments
- Admin panel for order management

### 👑 Admin Features
- Discord ID-based admin access (auto-promotion)
- Order management dashboard
- User management
- Payment verification

---

## 🏗️ Architecture

### Frontend (Next.js 16)
- **Framework**: Next.js 16.2.6 with App Router
- **Styling**: Tailwind CSS
- **UI**: Custom components with Lucide icons
- **Deployment**: Vercel

### Backend (Node.js + Express)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **Deployment**: Render

### Bot Services
- **Discord Bot**: Ticket system, user management
- **SePay Bot**: Auto-topup polling (no webhook)

---

## 📦 Project Structure

```
shopvn-main/
├── web/                    # Frontend (Next.js)
│   ├── app/
│   │   ├── dang-ky/       # Signup (with Discord OAuth)
│   │   ├── dang-nhap/     # Login
│   │   ├── don-hang/      # Orders (Discord link enforcement)
│   │   ├── auth/          # Discord OAuth callback
│   │   ├── shop/          # Main shop
│   │   └── admin/         # Admin panel
│   └── ...
├── api/                   # Backend (Express)
│   ├── bot/              # Discord bot
│   │   └── sepayPollingBot.js  # SePay auto-topup
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── controllers/      # Business logic
│   └── server.js         # Entry point
└── ...
```

---

## 🚀 Deployment

### Frontend (Vercel)

1. **Connect GitHub repo to Vercel**

2. **Environment Variables**:
```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
NEXT_PUBLIC_DISCORD_SERVER_INVITE=https://discord.gg/your_invite
```

3. **Build Settings**:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Root Directory: `web`

4. **Deploy**: Vercel auto-deploys on push to main

---

### Backend (Render)

1. **Create Web Service** on Render

2. **Settings**:
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Root Directory: `api`

3. **Environment Variables** (15 required):

```env
# Database
MONGO_URI=mongodb+srv://...

# JWT & Auth
JWT_SECRET=<generate_32_chars>
JWT_ADMIN_SECRET=<generate_32_chars>
TOKEN_ENCRYPTION_KEY=<generate_32_chars>

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<your_secure_password>

# Discord Bot (REQUIRED)
DISCORD_BOT_TOKEN=<bot_token>
DISCORD_GUILD_ID=<server_id>
DISCORD_TICKET_CATEGORY_ID=<category_id>
DISCORD_OWNER_ID=<your_user_id>
DISCORD_OWNER_ROLE_ID=<staff_role_id>

# Discord OAuth
DISCORD_CLIENT_ID=<oauth_client_id>
DISCORD_CLIENT_SECRET=<oauth_client_secret>

# SePay Auto-Topup
SEPAY_BOT_API_KEY=<sepay_api_key>
SEPAY_BOT_ENABLED=true
SEPAY_BOT_INTERVAL_MS=5000

# Bank Info
BANK_ACCOUNT_NAME=YOUR_NAME
BANK_ACCOUNT_NUMBER=0123456789
BANK_NAME=MB Bank

# Frontend
CLIENT_URL=https://your-frontend.vercel.app

# Server
NODE_ENV=production
PORT=5000
```

4. **Generate Secrets**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🤖 Discord Bot Setup

### 1. Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name: "ShopVN Bot"

### 2. Configure Bot

1. **Bot Tab**:
   - Click "Add Bot"
   - Copy Bot Token → `DISCORD_BOT_TOKEN`
   - Enable **3 Privileged Gateway Intents**:
     - ✅ Presence Intent
     - ✅ Server Members Intent
     - ✅ Message Content Intent

2. **OAuth2 Tab**:
   - Copy Client ID → `DISCORD_CLIENT_ID`
   - Generate Client Secret → `DISCORD_CLIENT_SECRET`

### 3. Invite Bot to Server

1. **OAuth2** → **URL Generator**
2. **Scopes**: `bot`, `applications.commands`
3. **Permissions**: 
   - Manage Channels
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Add Reactions
4. Copy URL → Open in browser → Invite to server

### 4. Get Discord IDs

**Enable Developer Mode**:
- Discord Settings → Advanced → ✅ Developer Mode

**Copy IDs** (right-click → Copy ID):
- Server → `DISCORD_GUILD_ID`
- Ticket Category → `DISCORD_TICKET_CATEGORY_ID`
- Your Username → `DISCORD_OWNER_ID`
- Staff Role → `DISCORD_OWNER_ROLE_ID`

---

## 🔐 Discord Admin Auto-Promotion

Accounts with these Discord IDs automatically become admin:
- `1146730730060271736`
- `1005326332001009784`

**To add more admins**:
Edit `api/models/TaiKhoan.js` line ~100:
```javascript
const ADMIN_DISCORD_IDS = ['1146730730060271736', '1005326332001009784', 'NEW_ID_HERE'];
```

---

## 💰 SePay Setup

1. **Get SePay Account**:
   - Register at SePay platform
   - Link your MB Bank account

2. **Get API Key**:
   - Dashboard → API Settings
   - Copy API Key → `SEPAY_BOT_API_KEY`

3. **Configure Bot**:
```env
SEPAY_BOT_ENABLED=true
SEPAY_BOT_INTERVAL_MS=5000  # Poll every 5 seconds
```

4. **Test**:
   - Make a test transfer to your MB Bank
   - Check logs: `✅ Nạp XXX VND thành công!`

---

## 📝 Usage Flows

### Flow 1: Signup with Discord (Recommended)

```
1. Visit /dang-ky
2. Click "Đăng ký bằng Discord"
3. Authorize on Discord
4. Auto-create account + login
5. Discord already linked ✅
```

### Flow 2: Traditional Signup + Link Later

```
1. Visit /dang-ky
2. Fill username/password form
3. Shop and purchase items
4. Pay with wallet/card
5. Go to /don-hang
6. Modal appears: "Liên Kết Discord Để Nhận Hàng"
7. Click "Liên Kết Ngay"
8. Authorize on Discord
9. Discord linked ✅
10. Create ticket to receive items
```

### Flow 3: Admin Access

```
1. Link Discord account (ID: 1146730730060271736)
2. Auto-promoted to admin ✅
3. Login with username/password
4. Access /admin panel
```

---

## 🧪 Testing

### Local Development

**Frontend**:
```bash
cd web
npm install
npm run dev
# Visit http://localhost:3000
```

**Backend**:
```bash
cd api
npm install
node server.js
# Runs on http://localhost:5000
```

### Test Checklist

- [ ] Signup with Discord works
- [ ] Traditional signup works
- [ ] Discord link modal appears after purchase
- [ ] Modal redirects to OAuth correctly
- [ ] Admin login works (Discord ID)
- [ ] SePay transfer auto-credits wallet
- [ ] Order ticket creation works

---

## 🐛 Troubleshooting

### Frontend Build Fails
```bash
cd web
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Backend Won't Start
- Check all 15 env vars are set
- Verify MongoDB connection string
- Check Discord bot token is valid

### SePay Bot Not Working
- Verify `SEPAY_BOT_ENABLED=true`
- Check API key is correct
- Check logs: `[SEPAY_BOT] ✅ Bot đã khởi động`

### Discord OAuth Fails
- Verify `DISCORD_CLIENT_ID` matches in frontend & backend
- Check redirect URI: `https://your-domain.com/auth/discord/callback`
- Ensure redirect URI is added in Discord app settings

---

## 📚 Documentation

- `COMPLETE_ENV_CHECKLIST.md` - All env vars guide
- `SEPAY_BOT_SETUP.md` - SePay bot setup
- `DISCORD_ADMIN_FEATURE.md` - Admin auto-promotion
- `DISCORD_OAUTH_IMPLEMENTATION.md` - OAuth flow details
- `ENV_SETUP.md` - Deployment guide

---

## 🔒 Security Notes

1. **Never commit `.env` files** (already in .gitignore)
2. **Use strong passwords** for admin (min 12 chars)
3. **Rotate secrets regularly** (JWT_SECRET, etc.)
4. **Keep Discord bot token private**
5. **Use HTTPS** in production (Vercel/Render auto-provide)

---

## 📈 Monitoring

### Backend Logs (Render)
```
[DISCORD] Bot login thanh cong
[SEPAY_BOT] ✅ Bot đã khởi động thành công!
[AUTO_ADMIN] Promoted username (discordId) to admin
```

### Frontend Errors (Vercel)
- Check Vercel dashboard → Logs
- Check browser console for errors

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Open Pull Request

---

## 📄 License

Private project - All rights reserved

---

## 🙏 Credits

- Built with Next.js, Express, MongoDB
- Discord bot powered by discord.js
- UI components: Tailwind CSS + Lucide Icons
- Payment: SePay, GachTheFast

---

## 📞 Support

For issues or questions:
- Discord: [Your Discord Server]
- Email: [Your Email]

---

**2026 ShopVN. All rights reserved.**
