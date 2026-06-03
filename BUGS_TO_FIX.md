# 🐛 BUG FIXES CẦN LÀM

## 1. ❌ Xóa `/shop` page - Dùng `/cua-hang`

```bash
# Xóa shop page cũ
rm -rf web/app/shop/
```

**Hoặc** rename `/shop` → `/cua-hang`:
- Xóa folder `web/app/shop/`
- Redirect `/shop` → `/cua-hang` trong `next.config.js`

---

## 2. ✅ Fix Redirect sau đăng ký/đăng nhập

**File cần sửa**: `web/app/dang-ky/page.tsx` (dòng 74)
**File cần sửa**: `web/app/dang-nhap/page.tsx`

```typescript
// TRƯỚC:
router.push("/shop");

// SAU:
router.push("/cua-hang");
```

---

## 3. ✅ Thêm nút "Quay về Trang Chủ"

### File: `web/app/dang-ky/page.tsx`

Thêm sau logo (sau dòng ~90):

```tsx
import { Home } from "lucide-react";

// Thêm button này sau logo NOSMarket
<Link 
  href="/"
  className="absolute top-4 left-4 flex items-center gap-2 text-sm text-[#B5B5B5] hover:text-white transition-colors"
>
  <Home className="h-4 w-4" />
  Trang Chủ
</Link>
```

### File: `web/app/dang-nhap/page.tsx`

Thêm tương tự.

---

## 4. ✅ Thêm dấu tiếng Việt

### Các text thiếu dấu cần fix:

- "Vui long nhap..." → "Vui lòng nhập..."
- "Ten dang nhap" → "Tên đăng nhập"
- "Mat khau" → "Mật khẩu"
- "Dang ky" → "Đăng ký"
- "Dang nhap" → "Đăng nhập"

Tìm và thay thế trong:
- `web/app/dang-ky/page.tsx`
- `web/app/dang-nhap/page.tsx`
- `web/app/cua-hang/page.tsx`
- `web/app/don-hang/page.tsx`
- `web/app/nap-tien/page.tsx`

---

## 5. 🔧 Fix Backend API 401 Error

Kiểm tra Render logs:
1. Vào Render Dashboard
2. Service → Logs
3. Tìm lỗi khi gọi `/api/tai-khoan/dang-ky`

**Có thể do**:
- MongoDB chưa kết nối
- CORS settings sai
- Route chưa mount đúng

---

## 6. ✅ Xóa hoặc ẩn `/shop` page

### Option A: Xóa hoàn toàn
```bash
rm -rf web/app/shop/page.tsx
```

### Option B: Redirect trong `next.config.js`
```javascript
module.exports = {
  async redirects() {
    return [
      {
        source: '/shop',
        destination: '/cua-hang',
        permanent: true,
      },
    ]
  },
}
```

---

## CHECKLIST

- [ ] Xóa hoặc redirect `/shop` → `/cua-hang`
- [ ] Fix redirect sau login: `/shop` → `/cua-hang`
- [ ] Thêm nút "Quay về Trang Chủ" ở đăng ký/đăng nhập
- [ ] Thêm dấu tiếng Việt cho tất cả text
- [ ] Check Render backend logs
- [ ] Test đăng ký lại
