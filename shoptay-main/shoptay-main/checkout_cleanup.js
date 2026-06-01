const fs = require('fs');
const path = 'api/routes/shopRoutes.js';
let code = fs.readFileSync(path,'utf8');

// Ensure checkoutStep declaration exists in checkout try
code = code.replace(
  "    try {\n        const viewer = getOptionalRequestUser(req);",
  "    try {\n        let checkoutStep = 'start';\n        const viewer = getOptionalRequestUser(req);"
);

// Remove accidental referral vars from coupon preview
code = code.replace(
  "        const couponCodeRaw = req.body?.couponCode;\n        const referralCodeRaw = req.body?.referralCode || '';\n        const validatedRefCode = normalizeReferralCode(referralCodeRaw);",
  "        const couponCodeRaw = req.body?.couponCode;"
);

// Persist referral fields in order if missing
if (!code.includes('referralCode: validatedRefCode')) {
  code = code.replace(
    "                        couponCode,\n                        total: totalAmount,",
    "                        couponCode,\n                        referralCode: validatedRefCode,\n                        referredByDiscordId,\n                        total: totalAmount,"
  );
}

fs.writeFileSync(path, code);
console.log('checkout cleanup complete');
