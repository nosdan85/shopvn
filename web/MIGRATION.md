# Frontend Migration: Discord OAuth → Web Accounts + VNĐ Wallet

## Tổng Quan

Frontend đã được refactor hoàn toàn từ hệ thống Discord OAuth sang tài khoản web với ví VNĐ.

## Trang Mới (Đang Hoạt Động)

### Authentication
- `/dang-ky` - Đăng ký tài khoản web
- `/dang-nhap` - Đăng nhập tài khoản web
- `/lien-ket-discord/callback` - OAuth callback để liên kết Discord vào tài khoản web

### Shop & Orders
- `/cua-hang` - Shop mới với checkout ví VNĐ (thay thế `/shop`)
- `/don-hang` - Lịch sử đơn hàng, tạo ticket Discord
- `/nap-tien` - Nạp tiền (SePay chuyển khoản + thẻ cào)

### Other
- `/proofs` - Đánh giá (đã việt hóa)
- `/admin/*` - Admin pages (đã cập nhật cho web auth)

## Trang Cũ (Deprecated - Có Thể Xóa)

### ⚠️ `/shop/page.tsx` - DEPRECATED
- Shop cũ với PayPal/LTC/CashApp
- Đã thay thế bằng `/cua-hang`
- **Action**: Có thể xóa hoặc redirect sang `/cua-hang`

### ⚠️ `/auth/callback/page.tsx` - LEGACY
- Discord OAuth login callback (hệ thống cũ)
- Giờ dùng Discord chỉ để **liên kết** vào tài khoản web, không còn dùng để login
- Callback mới: `/lien-ket-discord/callback`
- **Action**: Giữ lại nếu còn user đang dùng Discord login cũ, hoặc xóa

### ⚠️ `/pay/page.tsx` - UNKNOWN
- Chưa rõ mục đích
- **Action**: Cần kiểm tra và xóa nếu không dùng

## Context Files

### Đang Dùng
- `AuthVietContext.tsx` - Web auth context (tài khoản web + ví VNĐ)

### Legacy (Deprecated)
- `AuthContext.tsx` - Discord OAuth context
- **Action**: Có thể xóa sau khi confirm không còn dùng

## API Routes (Frontend)

Các API routes trong `web/app/api/*` là **proxy** đến backend. Cần cập nhật:

### Deprecated Routes (Có thể xóa)
- `/api/discord-exchange/route.ts` - Discord token exchange (login cũ)
- `/api/shop/auth/discord/route.ts` - Discord auth (login cũ)

### Cần Giữ
- Tất cả routes khác đang dùng bởi admin hoặc shop mới

## Components

### ✅ Navbar.tsx
- Đã refactor: dùng `useAuthViet()` thay `useAuth()`
- Hiển thị số dư ví, menu nạp tiền, đơn hàng
- Buttons đăng nhập/đăng ký cho guest

## Backend API Endpoints Cần Thiết

Frontend mới cần các endpoints sau:

### Auth
- `POST /api/tai-khoan/dang-ky`
- `POST /api/tai-khoan/dang-nhap`
- `POST /api/tai-khoan/dang-xuat`
- `GET /api/tai-khoan/thong-tin`
- `POST /api/tai-khoan/lien-ket-discord` (Discord OAuth)
- `GET /api/tai-khoan/kiem-tra-discord`

### Wallet
- `POST /api/vi/nap-tien/chuyen-khoan/tao` (SePay)
- `GET /api/vi/nap-tien/chuyen-khoan/:maGiaoDich` (check status)
- `POST /api/vi/nap-tien/the-cao` (card charging)
- `GET /api/vi/nap-tien/the-cao/menh-gia` (get card values)
- `GET /api/vi/vi/lich-su` (transaction history)

### Orders
- `POST /api/don-hang/don-hang/dat-hang` (create order with VNĐ payment)
- `GET /api/don-hang/don-hang/lich-su` (order history)
- `POST /api/don-hang/don-hang/:id/huy` (cancel order)
- `POST /api/don-hang/don-hang/:id/tao-ticket` (create Discord ticket)

### Admin
- `GET /api/shop/owner/web-accounts` (list web accounts, thay `/linked-users`)
- `DELETE /api/shop/owner/web-accounts/:userId/cart` (clear cart)
- `POST /api/shop/owner/web-accounts/:userId/lucky-wheel-ticket` (grant tickets)

## Checklist Cleanup

- [ ] Test tất cả trang mới hoạt động đúng
- [ ] Xóa hoặc redirect `/shop` → `/cua-hang`
- [ ] Xóa `/auth/callback` nếu không còn dùng Discord login
- [ ] Kiểm tra và xóa `/pay` nếu không dùng
- [ ] Xóa `AuthContext.tsx` nếu không còn dùng
- [ ] Xóa `/api/discord-exchange` và `/api/shop/auth/discord`
- [ ] Cập nhật ENV variables (DISCORD_CLIENT_ID, REDIRECT_URI cho linking)
- [ ] Test admin pages với web auth
- [ ] Test Discord linking flow từ trang đơn hàng

## Thay Đổi Chính

### 1. Authentication
- **Trước**: Discord OAuth → auto login
- **Sau**: Web accounts (username/password) → Discord chỉ để linking (tạo ticket)

### 2. Checkout
- **Trước**: PayPal/CashApp/LTC → upload proof → tạo ticket
- **Sau**: Ví VNĐ → trừ tiền ngay → tạo ticket (nếu đã link Discord)

### 3. Pricing
- **Trước**: USD ($)
- **Sau**: VNĐ (format: 50,000 VND)

### 4. Delivery Slots
- **Trước**: Calendar picker, timezone selector, 2-hour window
- **Sau**: Không còn (removed)

### 5. Roblox Username
- **Trước**: Nhập Roblox username khi checkout
- **Sau**: Không còn (removed)

### 6. Admin
- **Trước**: Check Discord ID trong ADMIN_IDS hoặc `isOwner` flag
- **Sau**: Check `user.vaiTro === 'admin'` từ web account

## Notes

- Tất cả text đã được việt hóa
- Giữ nguyên tên món đồ trong proofs (không dịch)
- Dark theme nhất quán (#050505, #111111, #1E1E1E)
- Proofs chỉ hiện nếu có vouch từ Discord channel
