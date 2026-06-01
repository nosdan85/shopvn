# NosRoblox Shoptay Parity Design

## Goal

Mở rộng `NosRoblox` để đạt parity chức năng cốt lõi với bộ tài liệu `shoptay`, nhưng giữ nguyên stack hiện tại của dự án:

- Frontend: `Vite + React`
- Backend: `Express + SQLite`
- Bot: `discord.js`

Phạm vi giữ lại:

- catalog sản phẩm theo game
- cart sync
- checkout
- wallet / số dư / nạp tiền
- coupon
- referral
- ticket Discord
- order chat
- proofs / vouch
- admin quản trị toàn bộ dữ liệu
- bot command cho vòng đời ticket và thưởng

Phạm vi loại bỏ hoàn toàn:

- delivery slots / lịch giao hàng
- PayPal Standard
- PayPal Friends & Family
- Litecoin
- Cash App / Square

## Why This Approach

Tài liệu `shoptay` mô tả một hệ lớn hơn dự án hiện tại và khác kiến trúc đáng kể. Port nguyên kiến trúc `Next.js + MongoDB + payment integrations` sang repo này sẽ tăng rủi ro và làm chậm tiến độ. Hướng phù hợp hơn là kéo parity tính năng về stack hiện có, sau đó dọn UI/route để toàn bộ trải nghiệm thống nhất dưới thương hiệu `NosRoblox`.

## Product Scope

### 1. Storefront and Checkout

- Storefront phải thống nhất visual với `NosRoblox`.
- Product catalog phải hỗ trợ game category, tìm kiếm, trạng thái stock, best seller, giá.
- Cart phải sync ổn định với server.
- Checkout phải chỉ dùng:
  - số dư ví
  - nạp tiền trước, rồi mua bằng ví
- Không được còn nhánh chọn lịch hay chọn payment method kiểu cũ.

### 2. Account and Auth

- Các route `login`, `register`, `forgot password`, `reset password`, `profile` phải dùng cùng design system với storefront.
- Điều hướng phải đồng bộ URL thật, không còn trạng thái đổi nội dung nhưng URL đứng yên.
- Tài khoản admin phải có thể vào toàn bộ màn quản trị.

### 3. Wallet and Deposits

- Giữ hệ ví hiện tại làm phương thức thanh toán chính.
- Giữ lịch sử nạp, trạng thái nạp, thông tin giao dịch.
- Dọn sạch text, config, settings, UI cũ liên quan đến PayPal, LTC, Cash App/Square.

### 4. Coupon and Referral

- User có referral code riêng.
- User khác có thể apply referral code một lần.
- Đơn đầu tiên hợp lệ phải kích hoạt reward cho referrer.
- Coupon/reward phải quản trị và kiểm tra được từ admin.
- Nếu tài liệu `shoptay` yêu cầu `WELCOME20` và generated coupon thì hệ hiện tại phải hỗ trợ tương đương bằng schema và flow rõ ràng.

### 5. Orders, Ticket, Chat

- Checkout thành công phải tạo order nhất quán với trạng thái ticket Discord.
- Order detail phải hiển thị tình trạng ticket, chat, item, tổng tiền, trạng thái.
- User phải chat với admin trong luồng đơn hàng.
- Admin phải cập nhật trạng thái đơn và theo dõi chat/ticket từ dashboard.

### 6. Proofs / Vouch

- Khôi phục parity của hệ proof/vouch theo tài liệu, nhưng trình bày theo visual `NosRoblox`.
- Proof phải có CRUD trong admin.
- Kênh bot/vouch phải hỗ trợ forward ảnh proof từ ticket khi cần.

### 7. Admin Control Surface

Admin phải có quyền chỉnh sửa tất cả các mảng chính:

- game categories
- items / products
- orders
- users
- deposits
- wallet / balance adjustments
- chat
- review / proof
- shop settings
- referral / reward visibility

### 8. Discord Bot

Bot phải tiếp tục là một phần chính của flow:

- tạo ticket đơn hàng
- `!done`
- `!close`
- `!confirm`
- gửi DM / thông báo
- phát reward sau hoàn tất đơn khi đủ điều kiện

Bot không còn xử lý hay nhắc tới PayPal/LTC/Cash App/Square.

## Architecture Direction

### Frontend

- Dùng `AppRouter` hiện tại làm router trung tâm.
- Loại bỏ cảm giác “compat shell mới nhưng route cũ”.
- Re-theme các màn đang dùng `ShopApp` để chúng cùng hệ `NosRoblox`.
- Chỉ giữ một ngôn ngữ giao diện: tiếng Việt.

### Backend

- Mở rộng `server/index.cjs` và các helper hiện có thay vì đưa vào một backend thứ hai.
- Bổ sung/chuẩn hóa schema cho coupon, proof, reward, anti-fraud nếu cần.
- Dọn settings và endpoint chết liên quan các payment method đã loại bỏ.

### Bot

- Giữ `server/discord.cjs` là nơi chứa helper Discord/API.
- Giữ `server/discord-bot.cjs` cho command runtime.
- Đồng bộ trạng thái bot với order trong database thay vì chỉ đóng channel đơn giản.

## Explicit Removals

Những gì không được còn xuất hiện ở UI, API, bot copy, admin settings hoặc test mới:

- `delivery slot`
- `delivery window`
- `paypal`
- `paypal ff`
- `ltc`
- `cash app`
- `square`

Nếu còn di sản trong code, chúng được phép tồn tại tạm trong phase migration nhưng không được lộ ra người dùng cuối sau khi hoàn tất parity pass này.

## Risks

- `ShopApp.tsx` hiện đang ôm rất nhiều responsibility; parity hoàn chỉnh có thể đòi hỏi tách bớt thành các unit nhỏ hơn.
- Backend hiện dựa trên SQLite/local schema, nên một số flow trong tài liệu `shoptay` cần được map lại thay vì bê nguyên.
- Bot hiện còn mỏng hơn tài liệu mô tả; cần bổ sung logic trạng thái và reward cẩn thận để tránh chồng lệnh hoặc cập nhật sai order.

## Testing Strategy

### Browser QA

- shop
- login/register/forgot/reset
- cart
- deposit/deposits
- orders/order detail
- profile
- admin

### API Tests

- products
- cart sync
- checkout
- referral apply / reward
- admin CRUD chính
- order chat
- proofs

### Bot Tests

- ticket payload
- create ticket
- `!done`
- `!close`
- `!confirm`
- reward side effects

## Success Criteria

Hoàn thành khi:

- toàn bộ route chính nhìn thống nhất dưới thương hiệu `NosRoblox`
- checkout chỉ còn ví / nạp tiền / Discord ticket
- referral + coupon + order + admin + bot chạy thành một flow kín
- không còn UI hoặc logic public nào nhắc tới lịch, PayPal, LTC, Cash App/Square
- build và test pass
- browser QA các route chính không còn vỡ chữ, vỡ route, hay nhảy sang giao diện lệch hệ
