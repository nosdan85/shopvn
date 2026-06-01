const USER_VISIBLE_GENERATED_COUPON_SOURCES = [
    'lucky_wheel',
    'new_user',
    'referral',
    'referrer_50',
    'welcome'
];

const USER_VISIBLE_GENERATED_COUPON_SOURCE_SET = new Set(USER_VISIBLE_GENERATED_COUPON_SOURCES);

const isUserVisibleGeneratedCouponSource = (source) => (
    USER_VISIBLE_GENERATED_COUPON_SOURCE_SET.has(String(source || '').trim())
);

module.exports = {
    USER_VISIBLE_GENERATED_COUPON_SOURCES,
    isUserVisibleGeneratedCouponSource
};
