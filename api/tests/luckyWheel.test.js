const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildGeneratedCouponCode,
    normalizeWheelConfig,
    pickWheelSlice,
    validateGeneratedCouponDiscount,
    validateGeneratedCouponRecord
} = require('../utils/luckyWheel');

test('normalizeWheelConfig keeps enabled config and valid empty/discount slices', () => {
    const config = normalizeWheelConfig({
        enabled: true,
        title: 'Summer event',
        message: 'Spin now',
        slices: [
            { label: 'Try again', type: 'empty', discountPercent: 30 },
            { label: 'Five percent', type: 'discount', discountPercent: 5 },
            { label: 'Bad discount', type: 'discount', discountPercent: -1 }
        ]
    });

    assert.equal(config.enabled, true);
    assert.equal(config.title, 'Summer event');
    assert.deepEqual(config.slices, [
        { label: 'Try again', type: 'empty', discountPercent: 0 },
        { label: 'Five percent', type: 'discount', discountPercent: 5 }
    ]);
});

test('normalizeWheelConfig returns safe defaults when slices are missing', () => {
    const config = normalizeWheelConfig({ enabled: true, title: '', message: '', slices: [] });

    assert.equal(config.enabled, true);
    assert.equal(config.title, 'Lucky Wheel Event');
    assert.equal(config.message, 'We are running a limited lucky wheel event.');
    assert.deepEqual(config.slices, [{ label: 'Better luck next time', type: 'empty', discountPercent: 0 }]);
});

test('pickWheelSlice uses random source to choose a configured slice', () => {
    const slices = [
        { label: 'Empty', type: 'empty', discountPercent: 0 },
        { label: '15% Off', type: 'discount', discountPercent: 15 }
    ];

    assert.deepEqual(pickWheelSlice(slices, () => 0.99), { label: '15% Off', type: 'discount', discountPercent: 15, index: 1 });
});

test('buildGeneratedCouponCode creates NOSMARKET code with 10 random characters', () => {
    const code = buildGeneratedCouponCode(() => Buffer.from('abc123XYZ9'));

    assert.match(code, /^NOSMARKET-[A-Z0-9]{10}$/);
});

test('validateGeneratedCouponRecord rejects used coupons and returns active discount percent', () => {
    assert.deepEqual(validateGeneratedCouponRecord(null), { ok: false, error: 'Coupon code is invalid.' });
    assert.deepEqual(validateGeneratedCouponRecord({ status: 'used', discountPercent: 15 }), { ok: false, error: 'Coupon code has already been used.' });
    assert.deepEqual(validateGeneratedCouponRecord({ status: 'replaced', discountPercent: 15 }), { ok: false, error: 'Coupon code has already been used.' });
    assert.deepEqual(validateGeneratedCouponRecord({ status: 'unused', discountPercent: 30 }), { ok: true, discountPercent: 30 });
});

test('validateGeneratedCouponDiscount only accepts NOSMARKET generated coupons', () => {
    assert.deepEqual(validateGeneratedCouponDiscount('1234567890', { status: 'unused', discountPercent: 15 }), {
        ok: false,
        error: 'Coupon code is invalid.'
    });
    assert.deepEqual(validateGeneratedCouponDiscount('NOSMARKET-ABCDE12345', { status: 'unused', discountPercent: 15 }), {
        ok: true,
        discountPercent: 15
    });
});
