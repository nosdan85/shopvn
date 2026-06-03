# 🔧 BUGFIX: Admin Login - Check Username

## Issue
Admin login **KHÔNG CHECK USERNAME**, chỉ check password!

Ai cũng có thể login bằng password đúng với bất kỳ username nào.

## Root Cause
File: `api/routes/adminRoutes.js`

```javascript
// Before (BUG):
const { password } = req.body;  // ❌ Không lấy username
if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(400).json({ message: 'Wrong Password' });
}
```

## Fix Applied
```javascript
// After (FIXED):
const { username, password } = req.body;  // ✅ Lấy cả username

// Check username
if (username !== process.env.ADMIN_USERNAME) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
}

// Check password
if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
}
```

## Security Improvements
1. ✅ Now checks both username AND password
2. ✅ Same error message for both (không tiết lộ username có tồn tại)
3. ✅ Better validation (check env vars trước)
4. ✅ Consistent error messages (Vietnamese)

## Files Changed
- `api/routes/adminRoutes.js`

## Impact
**CRITICAL SECURITY FIX** - Prevents unauthorized admin access

## Test
```bash
# Wrong username
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker","password":"admin123"}'
# Response: 401 Unauthorized

# Wrong password
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong"}'
# Response: 401 Unauthorized

# Correct credentials
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Response: 200 OK with token
```

---

**Priority: CRITICAL - Deploy ASAP! 🚨**
