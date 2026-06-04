# Kế hoạch sửa lỗi mới: checkout 500, referral code, đơn vị tiền VND, bỏ delivery slots, và lỗi 400 thêm sản phẩm

## Chẩn đoán nhanh từ lỗi mới

### 1) Lỗi 400 khi thêm sản phẩm ở `/api/shop/owner/products`
Nguyên nhân có khả năng cao là **mismatch schema dữ liệu giữa admin UI và backend**:
- `web/app/admin/page.tsx` đang gửi:
  - `price`
  - `bulkPrice`
  - `packQuantity`
  - `image`
  - `category`
  - `gameId`
- backend `api/routes/shopRoutes.js` validate các field này và yêu cầu `image` bắt buộc.
- UI trước đó không hiện message backend thật, nên chỉ thấy HTTP 400 ở DevTools.

Đợt sửa vừa rồi đã cho frontend hiện lỗi thật từ backend, nhưng để xử lý triệt để vẫn cần kiểm tra:
- `image` có đang để rỗng hoặc chỉ nhập path không hợp lệ không
- `gameId` có bị gửi chuỗi rỗng/invalid ObjectId ở một số nhánh không
- `price` đang mang ý nghĩa VND nhưng backend/product model/shop-side khác vẫn đang dùng format USD

### 2) Lỗi checkout 500 với thông báo enum `paymentMethod: 'paypal_ff'` và `ticketStatus: 'pending'`
Đây là lỗi **mismatch giữa code cũ và model `Order` mới**.

`api/models/Order.js` hiện đã refactor theo shop VN:
- `paymentMethod` enum chỉ còn: `['wallet']`
- `ticketStatus` enum chỉ còn:
  - `chua_yeu_cau`
  - `dang_tao`
  - `da_tao`
  - `that_bai`
  - `dong`

Nhưng một số flow checkout / ticket / payment cũ trong code vẫn còn gán:
- `paymentMethod = 'paypal_ff'`
- `ticketStatus = 'pending'`

=> chỉ cần save order là Mongoose nổ validation error, gây checkout 500.

### 3) Mỗi tài khoản phải có 1 mã mời và phải nhập được
Hiện repo có **2 hệ account/user song song**:
- `TaiKhoan` (web account Việt hóa)
- `User` (Discord-linked shop user cũ)

Referral code hiện thiên về `User.referralCode` / `buildReferralCode(discordId)`.
Nếu mục tiêu mới là **mỗi tài khoản web phải luôn có 1 mã mời**, thì cần chuyển logic referral theo `TaiKhoan` hoặc đồng bộ chắc chắn từ `TaiKhoan` sang `User`.

Cần quyết định và triển khai nhất quán:
- web user login bằng `TaiKhoan`
- mã mời cũng phải bám `TaiKhoan`
- nhập mã mời/preview/apply/checkout phải đọc cùng một nguồn dữ liệu

### 4) Giá nhập là VND nhưng UI/logic đang hiểu như USD
Codebase đang bị **lai 2 hệ tiền tệ**:
- nhánh VN mới dùng `priceVnd`, `subtotalVnd`, `amountVnd`, `soDuVnd`
- nhánh shop cũ vẫn dùng `price`, `totalAmount`, `USD`, `formatMoney`, PayPal/LTC/CashApp

Ví dụ:
- `api/models/Product.js` vẫn lưu `price` kiểu generic
- `web/app/shop/page.tsx` hiển thị giá theo format cũ
- `web/app/cua-hang/page.tsx` checkout VN dùng `donGiaVnd`

=> khi nhập `10000`, một số màn coi đó là `$10000` thay vì `10.000 VND`.

### 5) Bỏ hẳn tạo khung giờ giao hàng
Hiện delivery slots đang xuất hiện ở nhiều nơi:
- backend routes `api/routes/shopRoutes.js`
- admin tab trong `web/app/admin/page.tsx`
- shop page chọn timezone/slot trong `web/app/shop/page.tsx`
- test và proxy liên quan `web/app/api/shop/delivery-slots/*`

Nếu muốn **bỏ hẳn**, cần gỡ đồng bộ UI + proxy + backend, không chỉ ẩn nút.

---

## Hướng sửa đề xuất

### A. Sửa dứt điểm checkout 500 trước
Ưu tiên cao nhất vì đang chặn flow mua hàng.

Việc cần làm:
1. Tìm tất cả chỗ đang gán `paymentMethod = 'paypal_ff'`, `'ltc'`, `'cashapp'`, `'pending'` ticket status cũ.
2. Đồng bộ chúng về model mới:
   - `paymentMethod: 'wallet'` (hoặc mở lại enum nếu bạn muốn giữ nhiều phương thức)
   - `ticketStatus` dùng enum mới (`chua_yeu_cau`, `dang_tao`, ...)
3. Kiểm tra file checkout VN (`web/app/cua-hang/page.tsx`, `api/routes/donHangRoutes.js`) để chắc chỉ đi qua flow VND mới.

### B. Chuẩn hóa giá sản phẩm sang VND
Có 2 hướng, nhưng mình đề xuất hướng an toàn nhất:
- **Giữ `Product.price` nhưng định nghĩa rõ đó là VND** trong admin/shop VN hiện tại.
- Sửa toàn bộ UI shop/admin để hiển thị bằng `vi-VN` và hậu tố `VND`, không dùng format `$`.
- Loại bỏ hoặc cô lập các helper USD ở flow người dùng VN.

Việc cần làm:
1. sửa admin form/product list để label rõ `VND`
2. sửa product rendering ở `shop/page.tsx` và các component liên quan
3. rà helper format tiền / checkout summary / cart / proof / ticket nếu đang hiển thị `$`

### C. Làm mã mời cho mỗi tài khoản web
Triển khai theo `TaiKhoan` để khớp luồng đăng nhập hiện tại.

Việc cần làm:
1. sinh referral code ổn định cho mỗi `TaiKhoan` nếu chưa có
2. expose API lấy mã mời theo account đang login
3. sửa preview/apply/checkout để đọc mã mời từ hệ account web
4. vẫn tương thích với Discord-linked side nếu cần

### D. Gỡ hẳn delivery slots
Việc cần làm:
1. bỏ tab “Khung Giờ Giao Hàng” khỏi `web/app/admin/page.tsx`
2. bỏ các phần shop page đang tải/chọn slot nếu còn dùng
3. gỡ proxy `web/app/api/shop/delivery-slots/*`
4. vô hiệu hóa hoặc giữ route backend nhưng không còn được gọi từ UI

### E. Sửa lỗi 400 thêm sản phẩm
Việc cần làm:
1. giữ hiển thị lỗi backend thật (đã làm)
2. thêm validate frontend trước submit:
   - tên bắt buộc
   - category bắt buộc
   - giá > 0
   - image bắt buộc
3. nếu `gameId === ''` thì gửi `null`, không gửi chuỗi rỗng
4. nếu backend còn reject vì image/path/schema thì sửa route/model tương ứng

---

## File dự kiến chỉnh sửa

### Backend
- `api/models/Order.js`
- `api/routes/donHangRoutes.js`
- `api/routes/shopRoutes.js`
- `api/models/Product.js` (nếu cần làm rõ semantics VND)
- `api/utils/orderPaymentInfo.js`
- `api/utils/paymentProofLog.js`
- có thể thêm/sửa logic referral ở:
  - `api/models/TaiKhoan.js`
  - `api/routes/taiKhoanRoutes.js`
  - `api/utils/referralRewards.js`

### Frontend
- `web/app/cua-hang/page.tsx`
- `web/app/shop/page.tsx`
- `web/app/admin/page.tsx`
- `web/app/api/shop/owner/products/route.ts`
- `web/app/api/shop/orders/[orderId]/route.ts` (nếu liên quan checkout/ticket)
- `web/app/api/shop/delivery-slots/route.ts`
- `web/app/api/shop/delivery-slots/[id]/route.ts`
- component/product display nếu đang format USD

---

## Thứ tự triển khai
1. Fix checkout 500 / enum mismatch
2. Fix VND display + semantics ở admin/shop
3. Fix referral code “mỗi tài khoản có 1 mã mời”
4. Gỡ delivery slots khỏi UI và proxy
5. Siết validate thêm sản phẩm để hết lỗi 400 khó hiểu
6. Chạy test/rà hồi quy

---

## Kết quả mong đợi
- Checkout không còn 500 do enum cũ
- Nhập giá 10000 sẽ hiển thị là 10.000 VND thay vì $10000
- Mỗi tài khoản web có mã mời riêng và nhập mã mời được
- Không còn UI tạo khung giờ giao hàng
- Thêm sản phẩm nếu lỗi sẽ báo đúng nguyên nhân, và nếu dữ liệu hợp lệ sẽ tạo được bình thường
