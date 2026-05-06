# Deploy production free

## Vấn đề lưu dữ liệu

Backend hiện dùng SQLite local qua `better-sqlite3`. Nếu chạy trên Render/Vercel free, filesystem không bền vững, nên database local có thể mất khi redeploy/restart/sleep. Không có cách code-only nào đảm bảo dữ liệu SQLite local tồn tại vĩnh viễn trên hạ tầng free không có persistent storage.

Muốn vừa free vừa không mất dữ liệu thì cần dùng database ngoài có free tier như Turso, Supabase Postgres hoặc Neon Postgres.

## Cách làm dữ liệu không mất bằng Turso free

Turso là SQLite cloud, phù hợp nhất với project hiện tại vì schema đang là SQLite. Dữ liệu sẽ nằm trên cloud Turso, deploy lại Render/Vercel không làm mất user, số dư, đơn hàng, lịch sử nạp.

Các bước tạo Turso:

- Đăng ký/đăng nhập `https://turso.tech`.
- Tạo database mới, ví dụ `sailor-piece-shop`.
- Vào phần database vừa tạo để lấy:
  - `Database URL`, thường có dạng `libsql://...turso.io`
  - `Auth Token`
- Set biến môi trường trên Render:
  - `TURSO_DATABASE_URL=<database-url>`
  - `TURSO_AUTH_TOKEN=<auth-token>`

Backend giữ SQLite local để app chạy như cũ, nhưng tự đồng bộ các lệnh ghi lên Turso. Khi deploy/restart mà SQLite local trống, backend tự khôi phục dữ liệu từ Turso trước khi mở server.

Lưu ý: dữ liệu database như user, số dư, đơn hàng, nạp tiền, settings sẽ được bảo vệ bằng Turso. Ảnh upload trong thư mục `/uploads` vẫn là file local; nếu muốn ảnh không mất, nên dùng URL ảnh ngoài hoặc dịch vụ lưu ảnh.

## Deploy free tạm thời

### Render free backend/fullstack

- **Build command**: `npm install && npm run build`
- **Start command**: `npm start`
- **Biến môi trường**:
  - `NODE_ENV=production`
  - `JWT_SECRET=<chuoi-bi-mat-dai>`
  - `CLIENT_ORIGIN=https://www.nosroblox.com,https://nosroblox.com`
  - `SEPAY_WEBHOOK_SECRET=<secret-ban-dat-trong-sepay>`
  - `BANK_NAME=MB Bank`
  - `BANK_ACCOUNT_NAME=<ten-chu-tai-khoan>`
  - `BANK_ACCOUNT_NUMBER=<so-tai-khoan>`
  - `TURSO_DATABASE_URL=<database-url>`
  - `TURSO_AUTH_TOKEN=<auth-token>`
  - `SMTP_HOST=smtp.gmail.com`
  - `SMTP_PORT=465`
  - `SMTP_USER=<gmail-cua-shop>`
  - `SMTP_PASS=<gmail-app-password>`
  - `SMTP_FROM=<gmail-cua-shop>`

Với Gmail, `SMTP_PASS` không phải mật khẩu Gmail thường. Hãy bật 2-Step Verification rồi tạo App Password trong Google Account.

### Vercel

Vercel phù hợp để deploy frontend tĩnh. Không nên chạy backend SQLite trực tiếp trên Vercel vì serverless filesystem không bền vững.

- Deploy frontend lên Vercel.
- Deploy backend lên Render free.
- Set biến frontend `VITE_API_BASE_URL=https://backend-render-cua-ban.onrender.com`.
- Set `CLIENT_ORIGIN=https://www.nosroblox.com,https://nosroblox.com` ở backend Render.

## SePay webhook cộng tiền tự động

Website đã có endpoint nhận callback:

```text
POST https://backend-render-cua-ban.onrender.com/api/webhooks/deposits
```

Cấu hình trong SePay:

- **Webhook URL**: URL ở trên.
- **Secret/API key**: trùng với biến `SEPAY_WEBHOOK_SECRET`.
- **Cách gửi secret**: dùng một trong các cách:
  - Header `x-webhook-secret: <SEPAY_WEBHOOK_SECRET>`
  - Header `Authorization: Apikey <SEPAY_WEBHOOK_SECRET>`
  - Query `?secret=<SEPAY_WEBHOOK_SECRET>`

Luồng xử lý:

- Khách tạo lệnh nạp trên web, hệ thống sinh mã `NAP...`.
- Khách chuyển khoản đúng số tiền với nội dung có chứa mã `NAP...`.
- SePay gửi webhook giao dịch tiền vào.
- Backend kiểm tra secret, đọc mã `NAP...`, kiểm tra số tiền, chống xử lý trùng bằng mã giao dịch ngân hàng, rồi cộng tiền vào ví và tạo thông báo cho khách.

## SePay bot tích hợp sẵn trong backend

Backend có bot polling SePay. Khi bật, bot tự gọi API SePay theo chu kỳ, lấy danh sách giao dịch, tìm nội dung chứa mã `NAP...`, rồi cộng tiền vào ví.

Cách lấy API Token:

- Đăng nhập `https://my.sepay.vn`.
- Vào `Cấu hình Công ty` → `API Access`.
- Bấm `+ Thêm API`.
- Điền tên bất kỳ, chọn trạng thái `Hoạt động`, rồi bấm `Thêm`.
- Copy API Token vừa tạo.

Biến môi trường:

- `SEPAY_BOT_ENABLED=true`
- `SEPAY_BOT_API_URL=https://my.sepay.vn/userapi/transactions/list?limit=20`
- `SEPAY_BOT_API_KEY=<api-token-sepay>`
- `SEPAY_BOT_INTERVAL_MS=15000`

Admin có thể chạy bot thủ công bằng:

```text
POST /api/admin/sepay-bot/run
```

Bot nhận nhiều kiểu field giao dịch phổ biến: `amount`, `paid_amount`, `transferAmount`, `transfer_amount`, `content`, `description`, `transferContent`, `transaction_id`, `reference`, `id`.
