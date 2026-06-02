const crypto = require('crypto');

const REFEREE_DISCOUNT_PERCENT = 5;
const REFERRER_REWARD_PERCENT = 50;

const normalizeReferralCode = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');

const buildReferralCode = (discordId) => {
    const raw = String(discordId || '').trim();
    const suffix = raw.slice(-6).padStart(6, '0');
    return `REF-${suffix}`;
};

const hashFingerprint = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');

const hasSuspiciousDeviceFlag = (fingerprint) => Array.isArray(fingerprint?.flags)
    && fingerprint.flags.map((flag) => String(flag || '').trim()).includes('suspicious_device');

const shouldGrantFirstOrderReward = (fingerprint) => {
    if (!fingerprint) return true;
    if (Number(fingerprint.orderCount || 0) > 0) return false;
    if (hasSuspiciousDeviceFlag(fingerprint)) return false;
    return true;
};

// Extract the 6-char suffix from a referral code and resolve the matching
// Discord user directly via a regex query instead of loading the entire
// User collection into memory.
const findUserByReferralCode = (User) => async (referralCode, excludeDiscordId = '') => {
    const suffix = String(referralCode || '').replace(/^REF-/, '');
    if (!suffix) return null;
    // Match discordId values that end with this suffix (6 chars).
    // We also exclude the caller so nobody can self-refer.
    const regex = new RegExp(suffix + '$');
    const candidates = await User.find({
        discordId: { $regex: regex, $ne: excludeDiscordId || undefined }
    }).select('discordId discordUsername').limit(1).lean();
    return candidates[0] || null;
};

const buildReferralPreviewPayload = (match, referralCode) => {
    if (!match?.discordId) return null;
    const normalizedCode = normalizeReferralCode(referralCode);
    if (!normalizedCode) return null;
    return {
        valid: true,
        referralCode: normalizedCode,
        referrerDiscordId: String(match.discordId),
        referrerUsername: String(match.discordUsername || ''),
        refereeDiscountPercent: REFEREE_DISCOUNT_PERCENT,
        referrerRewardPercent: REFERRER_REWARD_PERCENT,
        note: `Referrer gets ${REFERRER_REWARD_PERCENT}% after your first completed order. You get ${REFEREE_DISCOUNT_PERCENT}% discount on this order.`
    };
};

const resolveAppliedReferralCode = ({ requestedReferralCode = '', storedReferralCode = '' } = {}) => {
    const requested = normalizeReferralCode(requestedReferralCode);
    const stored = normalizeReferralCode(storedReferralCode);
    if (!requested || !stored || requested !== stored) return '';
    return stored;
};

const hasDifferentAppliedReferralCode = ({ requestedReferralCode = '', storedReferralCode = '' } = {}) => {
    const requested = normalizeReferralCode(requestedReferralCode);
    const stored = normalizeReferralCode(storedReferralCode);
    return Boolean(requested && stored && requested !== stored);
};

module.exports = {
    buildReferralCode,
    buildReferralPreviewPayload,
    hashFingerprint,
    hasDifferentAppliedReferralCode,
    hasSuspiciousDeviceFlag,
    REFERRER_REWARD_PERCENT,
    REFEREE_DISCOUNT_PERCENT,
    normalizeReferralCode,
    resolveAppliedReferralCode,
    shouldGrantFirstOrderReward,
    findUserByReferralCode
};
