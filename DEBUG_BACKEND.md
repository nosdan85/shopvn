# 🔧 DEBUG BACKEND API ERROR

## Lỗi hiện tại:
```
POST https://api.nosroblox.com/api/tai-khoan/dang-ky
Status: 400 (Bad Request)
```

---

## BƯỚC 1: Kiểm tra Render Logs

1. Vào https://render.com/dashboard
2. Click vào service **shopvn-api** (hoặc tên bạn đặt)
3. Tab **Logs** (real-time)
4. Tìm error khi POST `/api/tai-khoan/dang-ky`

**Tìm các lỗi này**:
- `MONGO_URI chua duoc cau hinh`
- `Database chua ket noi`
- `CORS error`
- `JWT_SECRET missing`
- Route not found

---

## BƯỚC 2: Test API Trực Tiếp

### Test Health Check:
```bash
curl https://api.nosroblox.com/health
```

**Expected response**:
```json
{
  "trangThai": "ok",
  "thoiGian": "...",
  "redis": "...",
  "queue": "..."
}
```

### Test Register Endpoint:
```bash
curl -X POST https://api.nosroblox.com/api/tai-khoan/dang-ky \
  -H "Content-Type: application/json" \
  -d '{
    "tenDangNhap": "testuser",
    "email": "test@test.com",
    "matKhau": "test123456",
    "xacNhanMatKhau": "test123456"
  }'
```

**Expected success**:
```json
{
  "thongBao": "Dang ky thanh cong",
  "taiKhoan": { ... },
  "token": "..."
}
```

**Nếu lỗi, sẽ trả về**:
```json
{
  "thongBao": "Lỗi cụ thể ở đây"
}
```

---

## BƯỚC 3: Kiểm tra ENV Variables trên Render

Đảm bảo có **ĐỦ** các biến sau:

### ✅ Required (Bắt buộc):
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=<min-32-chars>
JWT_ADMIN_SECRET=<min-32-chars>
ADMIN_PASSWORD=<strong-password>
DISCORD_BOT_TOKEN=<bot-token>
DISCORD_CLIENT_ID=<client-id>
DISCORD_CLIENT_SECRET=<client-secret>
DISCORD_GUILD_ID=<guild-id>
CLIENT_URL=https://nosroblox.com,https://www.nosroblox.com
```

### ❓ Check hiện tại:
Trong Render → Service → Environment:
- [ ] Có MONGO_URI?
- [ ] Có JWT_SECRET?
- [ ] Có CLIENT_URL (cho CORS)?
- [ ] Có Discord variables đủ?

---

## BƯỚC 4: Kiểm tra CORS

Nếu frontend `https://nosroblox.com` nhưng `CLIENT_URL` không match:

**Trong Render ENV**:
```
CLIENT_URL=https://nosroblox.com,https://www.nosroblox.com
```

Hoặc:
```
CLIENT_ORIGIN=https://nosroblox.com,https://www.nosroblox.com
```

Cả 2 đều cần có!

---

## BƯỚC 5: Kiểm tra Database Connection

**Nếu dùng MongoDB Atlas**:
1. Vào MongoDB Atlas Dashboard
2. Network Access → IP Whitelist
3. Đảm bảo có: `0.0.0.0/0` (allow all)

**Connection string format**:
```
mongodb+srv://username:password@cluster.mongodb.net/shopvn?retryWrites=true&w=majority
```

⚠️ **CHÚ Ý**: Username/password không được có ký tự đặc biệt. Nếu có, cần URL encode:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`

---

## BƯỚC 6: Common Issues

### Issue 1: "MONGO_URI missing"
**Fix**: Thêm `MONGO_URI` vào Render ENV

### Issue 2: "JWT_SECRET missing"
**Fix**: Thêm `JWT_SECRET` (min 32 chars random string)

### Issue 3: "CORS error"
**Fix**: Thêm `CLIENT_URL` và `CLIENT_ORIGIN` vào ENV

### Issue 4: 400 Bad Request - "Vui lòng điền đầy đủ thông tin"
**Fix**: Frontend gửi sai field names. Check request payload:
- Frontend gửi: `tenDangNhap`, `email`, `matKhau`, `xacNhanMatKhau`
- Backend expect: same (đúng rồi)

### Issue 5: 400 Bad Request - "Tên đăng nhập đã tồn tại"
**Fix**: User đã tồn tại trong DB. Thử username khác.

---

## BƯỚC 7: Quick Fix - Restart Service

Nếu vừa thêm ENV variables:
1. Render Dashboard → Service
2. Manual Deploy → Deploy latest commit
3. Hoặc click "Restart Service"

---

## PASTE RENDER LOGS ĐỂ DEBUG

Copy logs từ Render và paste vào đây để tôi xem lỗi cụ thể:

```
[paste logs here]
```

---

## TEST CHECKLIST

- [ ] Backend health check OK
- [ ] Render service status = "Live" (green)
- [ ] MongoDB connected (check logs)
- [ ] CORS configured (CLIENT_URL set)
- [ ] JWT_SECRET set
- [ ] Test register endpoint với curl
- [ ] Frontend có thể gọi API thành công
