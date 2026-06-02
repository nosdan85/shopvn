const fs = require('fs');
const path = 'api/routes/shopRoutes.js';
let code = fs.readFileSync(path, 'utf8');

const needle = "        checkoutStep = 'calculate_summary';\n        const cartSummary = await calculateCartSummary({ cartItems, couponCodeRaw });";
const replacement = "        checkoutStep = 'calculate_summary';\n        const validatedRefCode = String(req.body?.referralCode || '').trim();\n        const cartSummary = await calculateCartSummary({ cartItems, couponCodeRaw });";
if (!code.includes("const validatedRefCode = String(req.body?.referralCode || '').trim();")) {
  code = code.replace(needle, replacement);
}

fs.writeFileSync(path, code);
console.log('Inserted validatedRefCode in calculate_summary scope');
