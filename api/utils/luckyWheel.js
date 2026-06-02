const crypto = require('crypto');

const DEFAULT_WHEEL_TITLE = 'Lucky Wheel Event';
const DEFAULT_WHEEL_MESSAGE = 'We are running a limited lucky wheel event.';
const DEFAULT_EMPTY_SLICE = { label: 'Better luck next time', type: 'empty', discountPercent: 0 };

const normalizeDiscountPercent = (value) => {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n <= 0 || n > 100) return 0;
    return n;
};

const normalizeWheelSlice = (slice) => {
    const type = String(slice?.type || '').trim().toLowerCase() === 'discount' ? 'discount' : 'empty';
    const discountPercent = type === 'discount' ? normalizeDiscountPercent(slice?.discountPercent) : 0;
    if (type === 'discount' && discountPercent <= 0) return null;
    const defaultLabel = type === 'discount' ? `${discountPercent}% off` : DEFAULT_EMPTY_SLICE.label;
    const label = String(slice?.label || defaultLabel).trim().slice(0, 80) || defaultLabel;
    return { label, type, discountPercent };
};

const normalizeWheelConfig = (config = {}) => {
    const rawSlices = Array.isArray(config?.slices) ? config.slices : [];
    const slices = rawSlices.map((slice) => normalizeWheelSlice(slice)).filter(Boolean).slice(0, 24);
    return {
        enabled: Boolean(config?.enabled),
        title: String(config?.title || DEFAULT_WHEEL_TITLE).trim().slice(0, 120) || DEFAULT_WHEEL_TITLE,
        message: String(config?.message || DEFAULT_WHEEL_MESSAGE).trim().slice(0, 240) || DEFAULT_WHEEL_MESSAGE,
        slices: slices.length > 0 ? slices : [DEFAULT_EMPTY_SLICE]
    };
};

const pickWheelSlice = (slices, random = Math.random) => {
    const normalized = normalizeWheelConfig({ enabled: true, slices }).slices;
    const index = Math.min(normalized.length - 1, Math.floor(Math.max(0, Math.min(0.999999, Number(random()) || 0)) * normalized.length));
    return { ...(normalized[index] || DEFAULT_EMPTY_SLICE), index };
};

const buildGeneratedCouponCode = (randomBytes = crypto.randomBytes) => {
    const raw = randomBytes(16);
    const token = Buffer.from(raw).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10).padEnd(10, 'X');
    return `NOSMARKET-${token}`;
};

const validateGeneratedCouponRecord = (coupon) => {
    if (!coupon) return { ok: false, error: 'Coupon code is invalid.' };
    if (coupon.status !== 'unused') return { ok: false, error: 'Coupon code has already been used.' };
    const discountPercent = normalizeDiscountPercent(coupon.discountPercent);
    if (discountPercent <= 0) return { ok: false, error: 'Coupon code is invalid.' };
    return { ok: true, discountPercent };
};

const isGeneratedCouponCode = (value) => /^NOSMARKET-[A-Z0-9]{10}$/.test(String(value || '').trim().toUpperCase());

const validateGeneratedCouponDiscount = (couponCode, coupon) => {
    if (!isGeneratedCouponCode(couponCode)) return { ok: false, error: 'Coupon code is invalid.' };
    return validateGeneratedCouponRecord(coupon);
};

module.exports = {
    DEFAULT_EMPTY_SLICE,
    DEFAULT_WHEEL_MESSAGE,
    DEFAULT_WHEEL_TITLE,
    buildGeneratedCouponCode,
    isGeneratedCouponCode,
    normalizeDiscountPercent,
    normalizeWheelConfig,
    pickWheelSlice,
    validateGeneratedCouponDiscount,
    validateGeneratedCouponRecord
};
