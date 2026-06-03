# 🛒 ShopVN - Gaming Shop với Ví VNĐ

Hệ thống shop game tích hợp ví VNĐ, thanh toán tự động qua SePay/Thẻ cào, và Discord bot.

---

## 📁 Cấu Trúc Project

```
shopvn-main/
├── web/                    # Frontend Next.js
│   ├── app/
│   │   ├── components/    # UI components (Navbar, etc.)
│   │   ├── context/       # Auth contexts (AuthViet)
│   │   ├── cua-hang/      # Shop page
│   │   ├── dang-nhap/     # Login page
│   │   ├── dang-ky/       # Register page
│   │   ├── nap-tien/      # Topup page
│   │   ├── don-hang/      # Orders page
│   │   ├── proofs/        # Reviews page
│   │   └── admin/         # Admin panel
│   └── package.json
│
├── api/                    # Backend Express/MongoDB
│   ├── bot/               # Discord bot
│   ├── models/            # Mongoose models
│   │   ├── TaiKhoan.js   # Web accounts
│   │   ├── Order.js       # Orders
│   │   └── WalletTransaction.js
│   ├── routes/            # API routes
│   │   ├── taiKhoanRoutes.js   # Auth
│   │   ├── viRoutes.js         # Wallet
│   │   └── donHangRoutes.js    # Orders
│   ├── services/          # Business logic
│   │   ├── sepayService.js     # SePay integration
│   │   └── dichVuGachThe.js    # Card charging
│   └── server.js
│
├── DEPLOYMENT.md          # Hướng dẫn deploy chi tiết
├── MIGRATION.md           # Chi tiết migration từ Discord OAuth
└── README.md              # File này
```

---

## ✨ Tính Năng

### 🔐 Authentication
- ✅ Đăng ký/Đăng nhập tài khoản web (không cần Discord)
- ✅ JWT authentication với refresh tokens
- ✅ Liên kết Discord optional (để tạo ticket)

### 💰 Ví VNĐ & Nạp Tiền
- ✅ Ví điện tử VNĐ (không phải USD)
- ✅ **Nạp tiền tự động qua SePay** (chuyển khoản MB Bank → QR code)
- ✅ **Gạch thẻ cào** (Viettel/Vina/Mobifone)
- ✅ Lịch sử giao dịch chi tiết

### 🛍️ Shop & Checkout
- ✅ Browse sản phẩm theo game
- ✅ Giỏ hàng với coupon discount
- ✅ **Checkout bằng ví VNĐ** (trừ tiền ngay lập tức)
- ✅ Không còn PayPal/LTC/CashApp
- ✅ Không cần nhập Roblox username khi mua

### 📦 Quản Lý Đơn Hàng
- ✅ Lịch sử đơn hàng
- ✅ Chi tiết từng đơn
- ✅ **Tạo ticket Discord** (sau khi liên kết Discord)
- ✅ Hủy đơn → hoàn tiền tự động

### 🤖 Discord Bot
- ✅ Tự động tạo ticket channel khi user yêu cầu
- ✅ Embed đơn hàng với thông tin chi tiết
- ✅ Admin có thể xử lý trong ticket
- ✅ Vouch system (đánh giá)

### 👨‍💼 Admin Panel
- ✅ Quản lý sản phẩm (CRUD)
- ✅ Quản lý đơn hàng (approve/reject)
- ✅ Quản lý tài khoản web (xem số dư, cộng/trừ tiền)
- ✅ Thống kê doanh thu
- ✅ Quản lý proofs/reviews

---

## 🚀 Quick Start (Development)

### Prerequisites

- Node.js 18+
- MongoDB (local hoặc Atlas)
- Discord Bot Token

### 1. Clone & Install

```bash
git clone <repo>
cd shopvn-main

# Install frontend
cd web
npm install

# Install backend
cd ../api
npm install
```

### 2. Setup Environment Variables

**Backend (`api/.env`)**:
```env
MONGO_URI=mongodb://localhost:27017/shopvn
JWT_SECRET=your_jwt_secret_min_32_chars
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
CLIENT_URL=http://localhost:3000
SEPAY_API_KEY=your_sepay_key
GACHTHE_API_KEY=your_gachthe_key
```

**Frontend (`web/.env.local`)**:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_client_id
NEXT_PUBLIC_DISCORD_REDIRECT_URI=http://localhost:3000/lien-ket-discord/callback
```

### 3. Run

**Backend**:
```bash
cd api
npm run dev
# Server chạy tại http://localhost:5000
```

**Frontend**:
```bash
cd web
npm run dev
# Frontend chạy tại http://localhost:3000
```

---

## 📚 API Endpoints

### Auth Routes (`/api/tai-khoan`)
- `POST /dang-ky` - Đăng ký tài khoản
- `POST /dang-nhap` - Đăng nhập
- `POST /dang-xuat` - Đăng xuất
- `GET /thong-tin` - Lấy thông tin user (auth required)
- `POST /lien-ket-discord` - Liên kết Discord (auth + OAuth code)
- `GET /kiem-tra-discord` - Check Discord link status

### Wallet Routes (`/api/vi`)
- `POST /nap-tien/chuyen-khoan/tao` - Tạo giao dịch SePay
- `GET /nap-tien/chuyen-khoan/:id` - Check SePay status
- `POST /nap-tien/the-cao` - Gạch thẻ cào
- `GET /nap-tien/the-cao/menh-gia` - Lấy mệnh giá thẻ
- `GET /vi/lich-su` - Lịch sử giao dịch (auth required)

### Order Routes (`/api/don-hang`)
- `POST /dat-hang` - Đặt hàng (auth required)
- `GET /lich-su` - Lịch sử đơn hàng
- `GET /:orderId` - Chi tiết đơn hàng
- `POST /:orderId/tao-ticket` - Tạo ticket Discord
- `POST /:orderId/huy` - Hủy đơn

### Admin Routes (`/api/shop/owner`, `/api/admin`)
- Products, Games, Config management
- Order management
- Web accounts management
- Analytics & stats

---

## 🔄 Migration từ Phiên Bản Cũ

Hệ thống đã được refactor hoàn toàn:

| Trước | Sau |
|-------|-----|
| Discord OAuth login | Web accounts (username/password) |
| PayPal/LTC/CashApp | Ví VNĐ (SePay/Thẻ cào) |
| Upload payment proof | Thanh toán tự động |
| USD pricing | VNĐ pricing |
| Discord required | Discord optional (chỉ để tạo ticket) |
| Delivery slots (calendar) | Không còn |
| Nhập Roblox username khi mua | Không cần |

Chi tiết xem `MIGRATION.md`.

---

## 🌐 Deployment

Xem hướng dẫn chi tiết trong `DEPLOYMENT.md`.

**TL;DR**:
- Frontend → Vercel
- Backend → Render
- Database → MongoDB Atlas
- Bot → Render (cùng với API)

---

## 🔧 Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Lucide Icons**

### Backend
- **Node.js + Express**
- **MongoDB + Mongoose**
- **JWT Authentication**
- **Discord.js v14**
- **Axios** (API calls)

### Payment Integrations
- **SePay** (MB Bank transfers)
- **GachThe** (Card charging)

---

## 🎨 Theme & Design

- **Dark Mode**: `#050505` background, `#111111` cards
- **Accent Color**: `#2F9BE6` (blue)
- **Success**: `#3DDC84` (green)
- **Error**: `#FF4D4F` (red)
- **Typography**: Geist Sans

---

## 📝 Environment Variables Reference

### Backend Required

```env
# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/shopvn

# Auth
JWT_SECRET=min_32_character_random_string

# Discord Bot
DISCORD_BOT_TOKEN=bot_token_from_developer_portal
DISCORD_CLIENT_ID=oauth_client_id
DISCORD_CLIENT_SECRET=oauth_client_secret
DISCORD_GUILD_ID=your_server_id
DISCORD_INVITE_LINK=https://discord.gg/yourcode

# CORS
CLIENT_URL=https://yourshop.com

# Payment
SEPAY_API_KEY=sepay_key
SEPAY_ACCOUNT_NUMBER=mb_bank_account
GACHTHE_API_KEY=gachthe_key
GACHTHE_PARTNER_ID=partner_id
```

### Frontend Required

```env
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
NEXT_PUBLIC_SITE_URL=https://yourshop.com
NEXT_PUBLIC_DISCORD_CLIENT_ID=same_as_backend
NEXT_PUBLIC_DISCORD_REDIRECT_URI=https://yourshop.com/lien-ket-discord/callback
```

---

## 🧪 Testing

### Test User Flow

1. Đăng ký tài khoản: `/dang-ky`
2. Đăng nhập: `/dang-nhap`
3. Nạp tiền: `/nap-tien` → chọn SePay hoặc Thẻ cào
4. Mua sản phẩm: `/cua-hang` → add to cart → checkout
5. Xem đơn hàng: `/don-hang`
6. Liên kết Discord: Click "Liên Kết Discord" trong trang đơn hàng
7. Tạo ticket: Click "Tạo Ticket" sau khi liên kết

### Test Admin Flow

1. Login với admin account (`vaiTro: 'quan_tri'`)
2. Quản lý sản phẩm: `/admin`
3. Xem đơn hàng: `/admin/orders`
4. Thống kê: `/admin/analytics`

---

## 🤝 Contributing

Khi contribute code:

1. Giữ code style nhất quán
2. Comment bằng tiếng Việt hoặc tiếng Anh
3. Test kỹ trước khi commit
4. Không commit `.env` files
5. Không commit `node_modules/`

---

## 📄 License

Private project - All rights reserved.

---

## 📞 Support

Issues? Contact qua Discord server hoặc tạo GitHub issue.

---

**Happy Coding!** 🎉
