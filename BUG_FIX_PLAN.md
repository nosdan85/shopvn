# 🔧 COMPREHENSIVE BUG FIX PLAN

## ✅ ALREADY FIXED (Session này)
- [x] #1: sepayService.js - discordId to ObjectId conversion
- [x] #3: server.js - ticketQueue import with fallback
- [x] #15: viRoutes.js - duplicate path /vi/vi/lich-su
- [x] Vietnamese diacritics in all error messages
- [x] Auth response format (taiKhoan → user)
- [x] BackButton component added to all pages

---

## 🔴 PRIORITY 1: CRITICAL (Must Fix Now)

### #4: WalletTransaction - dichVuGachThe cũng dùng sai discordId
**Location**: `api/services/dichVuGachThe.js`
**Fix**: Tương tự sepayService, convert discordId to ObjectId
```javascript
const taiKhoanId = mongoose.Types.ObjectId(giaoDich.discordId);
await TaiKhoan.findOneAndUpdate({ _id: taiKhoanId, ... })
```

### #11: Missing express imports
**Already checked - DONE!** ✅ Both files have express imported

### #16: Circular dependency
**Location**: `api/routes/donHangRoutes.js` ↔ `taiKhoanRoutes.js`
**Fix**: Create separate middleware file
```javascript
// api/middleware/auth.js
module.exports = { xacThuc, xacThucViet };

// Then import from middleware instead
const { xacThuc } = require('../middleware/auth');
```

---

## 🟠 PRIORITY 2: DEPLOYMENT (Fix Before Going Live)

### #5: File uploads persistence
**Location**: `api/routes/shopRoutes.js`
**Fix**: Use cloud storage (ImgBB, Cloudinary, S3)
- Already using ImgBB for banners ✅
- Extend to product images too

### #6 & #8: Vercel deployment config
**Action**: Create `api/vercel.json`
```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

### #7: ShopConfig backup
**Fix**: Add to database export/import scripts
```javascript
// scripts/backup.js
const config = await ShopConfig.findById('singleton');
// Save to JSON file
```

### #10: Timezone validation
**Location**: `api/routes/shopRoutes.js`
**Fix**: Validate timezone string
```javascript
const moment = require('moment-timezone');
if (!moment.tz.zone(ownerTimezone)) {
    return res.status(400).json({ error: 'Invalid timezone' });
}
```

---

## 🟡 PRIORITY 3: SECURITY (Fix Soon)

### #12: Hardcoded payment credentials
**Location**: `web/app/shop/page.tsx`
**Fix**: Create API endpoint `/api/shop/payment-config`
```javascript
// Backend
router.get('/payment-config', (req, res) => {
    res.json({
        paypalEmail: process.env.PAYPAL_EMAIL,
        ltcAddress: process.env.LTC_PAY_ADDRESS
    });
});
```

### #13: Admin password validation
**Location**: `api/routes/adminRoutes.js`
**Fix**: Add validation
```javascript
if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Invalid password format' });
}
```

### #14: Bot token fallback
**Location**: `api/routes/shopRoutes.js`
**Fix**: Add check
```javascript
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
    console.warn('[BOT] Token missing - bot features disabled');
    return null;
}
```

---

## 🔵 PRIORITY 4: CODE QUALITY (Refactor Later)

### #17: Order status standardization
**Action**: Pick ONE convention
- Option A: Use English lowercase: `pending`, `paid`, `completed`, `cancelled`
- Option B: Use Vietnamese: `cho_xu_ly`, `da_thanh_toan`, `hoan_thanh`, `huy`

**Recommended**: Vietnamese (current schema)

### #18: Wallet field standardization
**Action**: Rename everything to `soDuVnd` and `amountVnd`
```javascript
// Migration script
db.taikhoans.updateMany({}, { $rename: { "soDuVi": "soDuVnd" } });
db.wallettransactions.updateMany({}, { $rename: { "amountCents": "amountVnd" } });
```

### #19: API response format
**Action**: Standardize to Vietnamese
```javascript
// All routes return:
{
    thanhCong: boolean,
    thongBao: string,
    duLieu?: any
}
```

### #26: Split shopRoutes.js
**Action**: Break into smaller files
```
routes/
├── shop/
│   ├── products.js
│   ├── orders.js
│   ├── config.js
│   ├── cart.js
│   └── index.js
```

---

## 🟢 PRIORITY 5: PERFORMANCE (Optimize Later)

### #27: Database indexes
**Action**: Add indexes in models
```javascript
// Order.js
orderSchema.index({ discordId: 1 });
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

// WalletTransaction.js
walletSchema.index({ discordId: 1, createdAt: -1 });
```

### #28: MongoDB connection pooling
**Location**: `api/config/db.js`
**Fix**:
```javascript
await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
});
```

---

## 🟣 PRIORITY 6: FRONTEND (Polish Later)

### #22: Error boundaries
**Action**: Wrap pages
```javascript
// app/components/ErrorBoundary.tsx
export default class ErrorBoundary extends React.Component {
    // ... error boundary logic
}

// app/shop/page.tsx
<ErrorBoundary>
    <ShopPage />
</ErrorBoundary>
```

### #24: Token refresh
**Action**: Implement refresh token flow
```javascript
// Store refresh token in httpOnly cookie
// When access token expires, use refresh token to get new one
```

---

## 🔶 PRIORITY 7: BOT (Cleanup Later)

### #29: Bot file naming
**Action**: Rename files
```
api/bot.js → api/discordIntegration.js
bot/ → discord-bot/
```

### #30: Graceful shutdown
**Action**: Add handlers
```javascript
process.on('SIGTERM', async () => {
    await client.destroy();
    await mongoose.disconnect();
    process.exit(0);
});
```

---

## 📊 QUICK WINS (Fix These Next Session)

1. **dichVuGachThe.js** - Same discordId bug as sepayService
2. **Circular dependency** - Extract auth middleware
3. **Payment config API** - Move hardcoded values
4. **Add vercel.json** - For proper deployment

---

## 🚀 DEPLOYMENT CHECKLIST

Before going live:
- [ ] Fix #4 (dichVuGachThe discordId bug)
- [ ] Add vercel.json
- [ ] Move all uploads to ImgBB/cloud
- [ ] Add database indexes
- [ ] Validate all timezone inputs
- [ ] Test nạp tiền SePay (CRITICAL!)
- [ ] Test nạp thẻ cào
- [ ] Add error boundaries to main pages

---

**Current Status**: 6/31 bugs fixed (19% complete)
**Next session priority**: Fix #4, #12, #13, #16 (4 more bugs)
