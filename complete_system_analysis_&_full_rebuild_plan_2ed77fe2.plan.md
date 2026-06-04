# Kế hoạch sửa lỗi auth/admin và 401 toàn hệ thống

## Mục tiêu
- Xóa tình trạng `Authentication required` xuất hiện ở toàn bộ màn hình quản trị khi user đã đăng nhập admin hợp lệ.
- Sửa các endpoint admin/owner/settings để nhận đúng loại token hiện tại của web admin (`webToken` từ `AuthVietContext`), không chỉ Discord token.
- Đồng bộ các proxy route Next.js trong `web/app/api/*` để truyền Authorization ổn định, parse lỗi an toàn, và tránh gây 401 giả do route mismatch.
- Rà soát các chỗ gọi sai endpoint ở màn hình quản trị khiến thao tác “save setting” không apply được.
- Sau sửa, đảm bảo các luồng quản trị chính hoạt động: products, games, banners, best sellers, lucky wheel, delivery slots, linked users, dashboard analytics/admin orders.

## Phát hiện chính

### 1) Nguyên nhân gốc của 401 ở admin/owner
Backend `api/routes/shopRoutes.js` đang bảo vệ hầu hết endpoint owner/admin theo mẫu:
- `authRequired`
- sau đó đọc `req.user.discordId`
- nếu không có `discordId` thì trả `401 Authentication required`

Trong khi web admin hiện đang dùng `AuthVietContext` với token lưu ở `webToken`, lấy từ `/api/tai-khoan/dang-nhap`. Token này là web-account token (`_id`, `tenDangNhap`, `vaiTro`), **không nhất thiết có `discordId`**.

Kết quả:
- middleware `authRequired` cho qua vì token hợp lệ
- nhưng controller/route owner lại tự fail vì không tìm thấy `req.user.discordId`
- nên toàn bộ trang admin/settings báo 401 dù đã login

Đây là lỗi kiến trúc auth không đồng nhất giữa:
- web account auth (`TaiKhoan`)
- discord/shop owner auth (`User` + discordId)
- admin auth (`role: admin`)

### 2) Một số route web gọi sai endpoint backend
Đã thấy ít nhất các mismatch sau:
- `web/app/admin/page.tsx` gọi `DELETE /api/shop/owner/web-accounts/:id/cart`
  - backend thật có: `DELETE /api/shop/owner/linked-users/:discordId/cart`
- `web/app/api/shop/delivery-slots/route.ts`
  - GET manage dùng `/api/shop/delivery-slots/manage` ✅
  - POST lại dùng `/api/shop/delivery-slots/bulk` ✅
  - nhưng UI/admin code có nhiều đoạn cũ cần rà consistency

### 3) Proxy Next.js không thống nhất chất lượng
Nhiều route trong `web/app/api/*`:
- copy-paste `API_BASE_URL` thay vì dùng helper `backendUrl`
- không luôn parse JSON an toàn
- không luôn thêm `no-store`
- không luôn forward status/body ổn định

Điều này không nhất thiết gây 401 gốc, nhưng làm debug khó, khiến frontend thấy lỗi mơ hồ hoặc lỗi không đồng nhất.

### 4) Admin analytics dùng nhánh auth khác với owner settings
- `/api/admin/*` dùng `requireOwnerOrAdmin`
- `/api/shop/owner/*` dùng `authRequired` + `canAccessOwnerEndpoints(discordId)`

Tức là analytics/admin orders có thể dùng được với admin token, còn owner config/settings thì lại chết nếu thiếu `discordId`.

## Hướng sửa đề xuất

### A. Chuẩn hóa cách backend nhận diện owner/admin
Tạo helper auth/identity dùng chung ở backend (ví dụ ngay trong `shopRoutes.js` hoặc tách ra util/middleware mới) với logic:
1. Nếu `req.user.role === 'admin'` hoặc payload web account có `vaiTro=quan_tri` / owner account -> cho qua owner endpoints.
2. Nếu có `req.user.discordId` -> vẫn hỗ trợ owner Discord flow cũ.
3. Nếu token là web account (`_id`, `userId`, `tenDangNhap`) thì resolve `TaiKhoan` từ DB để kiểm tra role admin/owner.
4. Chỉ trả 401 khi token thật sự không hợp lệ / không có user identity.
5. Trả 403 khi đã xác thực nhưng không đủ quyền.

Cách này xử lý tận gốc lỗi “đăng nhập rồi mà vẫn Authentication required”.

### B. Tách rõ 2 khái niệm
- `requireAuthenticatedUser`: chỉ cần token hợp lệ
- `requireOwnerAccess`: token hợp lệ + có quyền owner/admin

Áp dụng vào toàn bộ route owner:
- `/owner/products*`
- `/owner/games*`
- `/owner/config/*`
- `/owner/lucky-wheel`
- `/owner/linked-users*`
- `/delivery-slots/manage`
- `/delivery-slots/bulk`
- `/delivery-slots/:id` (PATCH/DELETE)
- các route quản trị proof/confirmed orders nếu cùng quyền

### C. Sửa UI admin đang gọi sai route
Trong `web/app/admin/page.tsx`:
- đổi `owner/web-accounts/:id/cart` -> `owner/linked-users/:discordId/cart`
- rà thêm các action save/delete để chắc route khớp backend thật

### D. Chuẩn hóa các Next proxy route
Ưu tiên sửa toàn bộ nhóm đang liên quan trực tiếp admin/settings/401:
- `web/app/api/admin/orders/route.ts`
- `web/app/api/admin/order/[id]/route.ts`
- `web/app/api/admin/analytics/*`
- `web/app/api/shop/owner/**/*`
- `web/app/api/shop/delivery-slots/**/*`

Chuẩn hóa theo pattern:
- dùng `backendUrl()` và `noStoreHeaders()`
- forward `Authorization` nguyên vẹn
- `parseJsonSafe`
- trả nguyên `status` backend
- `cache: 'no-store'`

### E. Rà soát phản hồi 401/403 để frontend hiển thị đúng
Hiện nhiều chỗ trả `401 Authentication required` dù thực tế là thiếu quyền hoặc thiếu discord binding.
Cần đổi cho chính xác:
- 401: chưa đăng nhập / token sai / token hết hạn
- 403: đã đăng nhập nhưng không phải owner/admin

Điều này giúp log Chrome và debug frontend rõ hơn.

## File dự kiến chỉnh sửa

### Backend
- `api/routes/shopRoutes.js`
  - refactor toàn bộ gate owner/admin
  - thêm helper resolve owner/admin từ `req.user`
  - sửa các route owner để không phụ thuộc cứng vào `req.user.discordId`
- có thể cần:
  - `api/middleware/authMiddleware.js` (nếu cần bổ sung metadata token/user)
  - `api/utils/ownerAccess.js` (nếu muốn gom logic role)
  - `api/routes/adminRoutes.js` (kiểm tra đồng bộ payload role)

### Frontend / Next proxies
- `web/app/admin/page.tsx`
- `web/app/api/admin/orders/route.ts`
- `web/app/api/admin/order/[id]/route.ts`
- `web/app/api/admin/analytics/sales/route.ts`
- `web/app/api/admin/analytics/recent-orders/route.ts`
- `web/app/api/admin/analytics/top-products/route.ts`
- `web/app/api/admin/analytics/proof-stats/route.ts`
- `web/app/api/shop/owner/config/banners/route.ts`
- `web/app/api/shop/owner/config/banners/upload/route.ts`
- `web/app/api/shop/owner/config/best-sellers/route.ts`
- `web/app/api/shop/owner/games/route.ts`
- `web/app/api/shop/owner/games/[id]/route.ts`
- `web/app/api/shop/owner/linked-users/route.ts`
- `web/app/api/shop/owner/linked-users/[discordId]/route.ts`
- `web/app/api/shop/owner/linked-users/[discordId]/cart/route.ts`
- `web/app/api/shop/owner/linked-users/[discordId]/lucky-wheel-ticket/route.ts`
- `web/app/api/shop/owner/lucky-wheel/route.ts`
- `web/app/api/shop/owner/product-images/upload/route.ts`
- `web/app/api/shop/owner/products/route.ts`
- `web/app/api/shop/owner/products/[id]/route.ts`
- `web/app/api/shop/delivery-slots/route.ts`
- `web/app/api/shop/delivery-slots/[id]/route.ts`

## Các bước thực hiện
1. Xây helper backend để xác định actor hiện tại từ token (`admin`, `web TaiKhoan`, `discord owner`).
2. Refactor các route owner trong `shopRoutes.js` sang helper này.
3. Sửa route mismatch trong `web/app/admin/page.tsx`.
4. Chuẩn hóa các Next API proxy liên quan admin/owner/settings.
5. Chạy test/search xác nhận không còn các điểm 401 do `req.user.discordId` bắt buộc.
6. Nếu cần, chạy app/test để verify các thao tác admin chính.

## Rủi ro / lưu ý
- `shopRoutes.js` là file lớn và chứa rất nhiều business logic; cần sửa cẩn thận, ưu tiên thay đổi tối thiểu, không động vào logic thanh toán nếu không cần.
- Có nhiều hệ auth trong repo (`auth.js`, `authMiddleware.js`, `taiKhoanRoutes`, `adminRoutes`), nên phải tránh vô tình phá luồng user thường.
- Một số lỗi 401 trong Chrome có thể đến từ request public gọi nhầm private endpoint; sau khi sửa auth gốc vẫn cần rà network paths thêm.

## Kết quả mong đợi sau khi triển khai
- Admin login xong mở dashboard/settings không còn `Authentication required` hàng loạt.
- Save banners / best sellers / lucky wheel / products / games / delivery slots apply được.
- Linked users và clear cart hoạt động đúng route.
- Số lượng lỗi 401 trong console/network giảm mạnh, chỉ còn các trường hợp thật sự chưa login hoặc không đủ quyền.
