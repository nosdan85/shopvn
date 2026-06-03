# ✨ FEATURE: Discord Admin Auto-Promotion

## 📋 Tổng Quan

Tài khoản liên kết với Discord ID **1146730730060271736** hoặc **1005326332001009784** sẽ **TỰ ĐỘNG** được quyền admin.

---

## 🔄 CÁCH HOẠT ĐỘNG

### 1. Auto-Promotion Logic (Model)

**File**: `api/models/TaiKhoan.js`

```javascript
// Kiểm tra có phải admin Discord không
taiKhoanSchema.methods.laAdminDiscord = function() {
    const ADMIN_DISCORD_IDS = ['1146730730060271736', '1005326332001009784'];
    return this.discordId && ADMIN_DISCORD_IDS.includes(this.discordId.trim());
};

// Auto-promote to admin khi save
taiKhoanSchema.pre('save', function(next) {
    if (this.laAdminDiscord() && this.vaiTro !== 'quan_tri') {
        this.vaiTro = 'quan_tri';
        console.log(`[AUTO_ADMIN] Promoted ${this.tenDangNhap} (${this.discordId}) to admin`);
    }
    next();
});
```

### 2. Admin Login Logic (Routes)

**File**: `api/routes/adminRoutes.js`

```javascript
// Khi login:
const taiKhoan = await TaiKhoan.findOne({ tenDangNhap: username });

if (taiKhoan) {
    // Kiểm tra password
    const matKhauDung = await taiKhoan.kiemTraMatKhau(password);
    if (!matKhauDung) {
        return res.status(401).json({ error: 'Sai mật khẩu' });
    }

    // Kiểm tra có phải admin Discord không
    if (taiKhoan.laAdminDiscord()) {
        // Auto-promote nếu chưa phải admin
        if (taiKhoan.vaiTro !== 'quan_tri') {
            taiKhoan.vaiTro = 'quan_tri';
            await taiKhoan.save();
        }

        // Generate admin token
        const token = jwt.sign({
            role: 'admin',
            type: 'admin',
            userId: taiKhoan._id,
            discordId: taiKhoan.discordId
        }, adminJwtSecret, { expiresIn: '1d' });

        return res.json({ token });
    }
}
```

---

## 🎯 FLOW

### Scenario 1: User Chưa Liên Kết Discord

```
1. User đăng ký: username + password
   ↓
2. User login website bình thường
   ↓
3. User liên kết Discord (Discord ID: 1146730730060271736)
   ↓
4. System AUTO-PROMOTE: vaiTro = 'quan_tri'
   ↓
5. User logout → Login lại
   ↓
6. ✅ Vào được admin panel!
```

### Scenario 2: User Đã Liên Kết Discord

```
1. User đã có account + Discord linked
   ↓
2. User login với username/password
   ↓
3. System check: taiKhoan.laAdminDiscord() = true
   ↓
4. Auto-promote (nếu chưa): vaiTro = 'quan_tri'
   ↓
5. Generate admin token
   ↓
6. ✅ Login thành công với quyền admin!
```

### Scenario 3: Env Admin (Fallback)

```
1. No TaiKhoan found với username
   ↓
2. Fallback: Check ADMIN_USERNAME + ADMIN_PASSWORD
   ↓
3. If match → Generate admin token
   ↓
4. ✅ Login với env vars
```

---

## 📝 ADMIN DISCORD IDS

Hardcoded trong code:

```javascript
const ADMIN_DISCORD_IDS = [
    '1146730730060271736',  // Admin 1
    '1005326332001009784'   // Admin 2
];
```

**Để thêm admin mới**: Edit 2 files:
- `api/models/TaiKhoan.js` (line ~100)
- `api/routes/adminRoutes.js` (line ~15)

---

## 🧪 TESTING

### Test 1: Đăng ký + Liên kết Discord

```bash
# 1. Đăng ký tài khoản
POST /api/tai-khoan/dang-ky
{
  "tenDangNhap": "testadmin",
  "matKhau": "password123",
  "email": "test@example.com"
}

# 2. Liên kết Discord (Discord ID: 1146730730060271736)
# (Qua OAuth flow hoặc admin panel)

# 3. Login
POST /api/admin/login
{
  "username": "testadmin",
  "password": "password123"
}

# Response:
{
  "token": "eyJhbGc...",
  "user": {
    "tenDangNhap": "testadmin",
    "vaiTro": "quan_tri",
    "discordId": "1146730730060271736"
  }
}

# ✅ SUCCESS!
```

### Test 2: Check Auto-Promotion

```bash
# Check logs khi login:
[AUTO_ADMIN] Promoted testadmin (1146730730060271736) to admin

# Check database:
db.tai_khoan.findOne({ tenDangNhap: "testadmin" })
# → vaiTro: "quan_tri" ✅
```

---

## ⚠️ SECURITY NOTES

1. **Discord IDs are hardcoded** - Cần edit code để thay đổi
2. **Auto-promotion chỉ trigger khi**:
   - User liên kết Discord (save)
   - User login (check + save nếu chưa promote)
3. **Không có cách nào remove admin status** - Cần manual update DB
4. **Env admin vẫn hoạt động** - Fallback cho trường hợp khẩn cấp

---

## 🔐 ADMIN ACCESS METHODS

### Method 1: Discord ID (Recommended) ✅
- Liên kết Discord với ID: 1146730730060271736 hoặc 1005326332001009784
- Auto-promote khi login
- Persistent (không mất quyền)

### Method 2: Env Vars (Fallback)
- Set ADMIN_USERNAME + ADMIN_PASSWORD
- Login với credentials này
- Không liên kết với user account

### Method 3: Database vaiTro
- Manual set `vaiTro: 'quan_tri'` trong database
- Login bình thường
- Persistent

---

## 📊 PRIORITY

**Method Priority**:
1. Check TaiKhoan (Discord ID auto-admin)
2. Check TaiKhoan (vaiTro = 'quan_tri')
3. Fallback env vars (ADMIN_USERNAME/PASSWORD)

---

## 🎯 BENEFITS

✅ **Không cần nhớ ADMIN_USERNAME/PASSWORD**
✅ **Tự động promote khi liên kết Discord**
✅ **Persistent** - Không mất quyền khi restart server
✅ **Có fallback** - Env vars vẫn hoạt động nếu cần

---

**Admin Discord IDs**: 1146730730060271736, 1005326332001009784

**Ready to use! 🚀**
