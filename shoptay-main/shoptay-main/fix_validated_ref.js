const fs = require('fs');
const path = 'api/routes/shopRoutes.js';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  "    try {\n        const viewer = getOptionalRequestUser(req);",
  "    try {\n        let checkoutStep = 'start';\n        const viewer = getOptionalRequestUser(req);"
);

if (!code.includes('const referralCodeRaw = req.body?.referralCode')) {
  code = code.replace(
    "        const couponCodeRaw = req.body?.couponCode;",
    "        const couponCodeRaw = req.body?.couponCode;\n        const referralCodeRaw = req.body?.referralCode || '';\n        const validatedRefCode = normalizeReferralCode(referralCodeRaw);"
  );
}

code = code.replace(
`        let referredByDiscordId = '';
        if (validatedRefCode) {
            const suffix = validatedRefCode.replace(/^REF-/, '');
            const match = await User.findOne({ discordId: { $ne: discordId }, $expr: { $eq: [ { $substrCP: ['$discordId', { $subtract: [ { $strLenCP: '$discordId' }, 6 ] }, 6 ] }, suffix ] } }).select('discordId').lean().catch(() => null);
            if (match?.discordId) referredByDiscordId = String(match.discordId);
        }`,
`        let referredByDiscordId = '';
        if (validatedRefCode) {
            const suffix = validatedRefCode.replace(/^REF-/, '');
            const candidates = await User.find({ discordId: { $ne: discordId } }).select('discordId').lean();
            const match = candidates.find((u) => String(u?.discordId || '').slice(-6) === suffix);
            if (match?.discordId) referredByDiscordId = String(match.discordId);
        }`
);

if (!code.includes('referralCode: validatedRefCode')) {
  code = code.replace(
    "                        couponCode,\n                        total: totalAmount,",
    "                        couponCode,\n                        referralCode: validatedRefCode,\n                        referredByDiscordId,\n                        total: totalAmount,"
  );
}

fs.writeFileSync(path, code);
console.log('fixed validatedRefCode/checkoutStep/order referral fields');
