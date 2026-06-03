# 🧪 TEST WALLET DEPOSIT (Development Only)

## Cách test nạp tiền KHÔNG mất tiền thật

### ⚠️ QUAN TRỌNG
- Chỉ hoạt động khi `NODE_ENV=development`
- KHÔNG hoạt động trên production
- Dùng để test flow nạp tiền mà không cần chuyển tiền thật

---

## 📋 Bước test

### 1. Tạo mã nạp tiền bình thường
- Vào trang **Nạp Tiền**
- Chọn tab **Chuyển Khoản**
- Nhập số tiền (ví dụ: 10,000 VND)
- Click **"Tạo lịch chuyển khoản"**
- **Copy mã giao dịch** (ví dụ: `NAP QAHSHH 93541F`)

### 2. Duyệt giao dịch bằng test endpoint

#### Dùng curl:
```bash
curl -X POST http://localhost:5000/api/vi/test/duyet-nap-tien \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"maGiaoDich":"NAP QAHSHH 93541F"}'
```

#### Hoặc dùng Postman/Thunder Client:
```
Method: POST
URL: http://localhost:5000/api/vi/test/duyet-nap-tien
Headers:
  - Content-Type: application/json
  - Authorization: Bearer YOUR_TOKEN_HERE
Body (JSON):
{
  "maGiaoDich": "NAP QAHSHH 93541F"
}
```

### 3. Kiểm tra kết quả
- Reload trang web
- Số dư sẽ được cộng ngay lập tức
- Giao dịch chuyển từ `pending` → `completed`

---

## 🎯 Lấy token để test

### Cách 1: Từ DevTools
1. Mở **Chrome DevTools** (F12)
2. Vào tab **Application** → **Local Storage**
3. Tìm key `webToken`
4. Copy giá trị

### Cách 2: Từ Console
```javascript
localStorage.getItem('webToken')
```

---

## ✅ Response thành công
```json
{
  "thanhCong": true,
  "thongBao": "Da duyet giao dich (TEST MODE)",
  "soDuVndMoi": 10000,
  "soTienNap": 10000
}
```

---

## ❌ Lỗi thường gặp

### 1. "Endpoint nay chi su dung trong development"
→ Server đang chạy production mode
→ Fix: Set `NODE_ENV=development` trong `.env`

### 2. "Khong tim thay giao dich"
→ Mã giao dịch sai hoặc đã được duyệt rồi
→ Fix: Tạo mã mới

### 3. "Vui long dang nhap"
→ Token không hợp lệ
→ Fix: Lấy token mới từ localStorage

---

## 🚀 Test flow đầy đủ

```bash
# 1. Tạo mã nạp tiền
# (Làm trên web UI)

# 2. Lưu token vào biến
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. Duyệt giao dịch
curl -X POST http://localhost:5000/api/vi/test/duyet-nap-tien \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"maGiaoDich":"NAP QAHSHH 93541F"}'

# 4. Kiểm tra số dư
curl http://localhost:5000/api/vi/vi \
  -H "Authorization: Bearer $TOKEN"
```

---

## 💡 Lưu ý

1. **Mỗi mã chỉ duyệt được 1 lần** - nếu test lại phải tạo mã mới
2. **QR code vẫn hiển thị** - nhưng không cần quét để test
3. **Webhook vẫn hoạt động** - nếu có chuyển tiền thật vẫn cộng bình thường
4. **Endpoint này bị disable trên production** - đảm bảo an toàn

---

## 🐛 Debug

Nếu không hoạt động, check server logs:
```bash
cd api
npm run dev
# Tìm dòng: [TEST] Approved deposit ...
```

---

**Happy Testing! 🎉**
