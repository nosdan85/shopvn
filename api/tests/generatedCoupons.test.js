const test = require('node:test');
const assert = require('node:assert/strict');

const {
    USER_VISIBLE_GENERATED_COUPON_SOURCES,
    isUserVisibleGeneratedCouponSource
} = require('../utils/generatedCoupons');

test('user-visible generated coupon sources include every source issued to shoppers', () => {
    assert.deepEqual(USER_VISIBLE_GENERATED_COUPON_SOURCES, [
        'lucky_wheel',
        'new_user',
        'referral',
        'referrer_50',
        'welcome'
    ]);
});

test('isUserVisibleGeneratedCouponSource rejects internal or unknown sources', () => {
    assert.equal(isUserVisibleGeneratedCouponSource('lucky_wheel'), true);
    assert.equal(isUserVisibleGeneratedCouponSource('referrer_50'), true);
    assert.equal(isUserVisibleGeneratedCouponSource('square_checkout'), false);
    assert.equal(isUserVisibleGeneratedCouponSource(''), false);
});
