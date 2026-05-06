# Deploy production free

## Vấn đề lưu dữ liệu

Backend hiện dùng SQLite local qua `better-sqlite3`. Nếu chạy trên Render/Vercel free, filesystem không bền vững, nên database local có thể mất khi redeploy/restart/sleep. Không có cách code-only nào đảm bảo dữ liệu SQLite local tồn tại vĩnh viễn trên hạ tầng free không có persistent storage.

Muốn vừa free vừa không mất dữ liệu thì cần đổi sang database ngoài có free tier như Supabase Postgres, Neon Postgres hoặc Turso. Việc này cần migrate lớp `server/db.cjs` và các query hiện tại sang driver database ngoài.

## Deploy free tạm thời

### Render free backend/fullstack

- **Build command**: `npm install && npm run build`
- **Start command**: `npm start`
- **Biến môi trường**:
  - `NODE_ENV=production`
  - `JWT_SECRET=<chuoi-bi-mat-dai>`
  - `CLIENT_ORIGIN=https://domain-frontend-cua-ban`
  - `SEPAY_WEBHOOK_SECRET=<secret-ban-dat-trong-sepay>`
  - `BANK_NAME=MB Bank`
  - `BANK_ACCOUNT_NAME=<ten-chu-tai-khoan>`
  - `BANK_ACCOUNT_NUMBER=<so-tai-khoan>`

### Vercel

Vercel phù hợp để deploy frontend tĩnh. Không nên chạy backend SQLite trực tiếp trên Vercel vì serverless filesystem không bền vững.

- Deploy frontend lên Vercel.
- Deploy backend lên Render free.
- Set biến frontend `VITE_API_BASE_URL=https://backend-render-cua-ban.onrender.com`.
- Set `CLIENT_ORIGIN=https://frontend-vercel-cua-ban.vercel.app` ở backend Render.

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

Biến môi trường:

- `SEPAY_BOT_ENABLED=true`
- `SEPAY_BOT_API_URL=<url-api-danh-sach-giao-dich-sepay>`
- `SEPAY_BOT_API_KEY=<api-key-sepay>`
- `SEPAY_BOT_INTERVAL_MS=15000`

Admin có thể chạy bot thủ công bằng:

```text
POST /api/admin/sepay-bot/run
```

Bot nhận nhiều kiểu field giao dịch phổ biến: `amount`, `paid_amount`, `transferAmount`, `transfer_amount`, `content`, `description`, `transferContent`, `transaction_id`, `reference`, `id`.
