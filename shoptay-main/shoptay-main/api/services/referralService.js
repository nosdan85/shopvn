const GeneratedCoupon = require('../models/GeneratedCoupon');
const Referral = require('../models/Referral');
const Order = require('../models/Order');
const { buildGeneratedCouponCode } = require('../utils/luckyWheel');

const REFERRER_REWARD_PERCENT = 20;

const createReferrerRewardCoupon = async (discordId) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const couponCode = buildGeneratedCouponCode();
        try {
            return await GeneratedCoupon.create({
                couponCode,
                discountPercent: REFERRER_REWARD_PERCENT,
                discordId: String(discordId || ''),
                source: 'referral'
            });
        } catch (error) {
            if (Number(error?.code) !== 11000 || attempt >= 7) throw error;
        }
    }
    throw new Error('Could not generate referral reward coupon.');
};

// Issues the one-time 20% reward coupon to the referrer once the referee's
// first order is completed. Idempotent: guarded by both the Order flag and the
// Referral status flip so it can run from multiple completion paths safely.
const issueReferralRewardForCompletedOrder = async (order) => {
    if (!order) return { issued: false, reason: 'no_order' };

    const refereeDiscordId = String(order.discordId || '').trim();
    const referrerDiscordId = String(order.referredByDiscordId || '').trim();
    if (!refereeDiscordId || !referrerDiscordId) return { issued: false, reason: 'no_referrer' };
    if (referrerDiscordId === refereeDiscordId) return { issued: false, reason: 'self_referral' };
    if (order.referralRewardSent) return { issued: false, reason: 'already_sent' };

    // Atomically claim the pending referral so concurrent completions cannot double-issue.
    const claimed = await Referral.findOneAndUpdate(
        { referrerDiscordId, refereeDiscordId, status: 'pending' },
        { $set: { status: 'rewarded', refereeFirstOrderId: String(order.orderId || '') } },
        { new: true }
    );
    if (!claimed) {
        // Nothing pending to reward; still mark the order so we stop checking it.
        await Order.updateOne({ _id: order._id }, { $set: { referralRewardSent: true } }).catch(() => {});
        return { issued: false, reason: 'no_pending_referral' };
    }

    try {
        const coupon = await createReferrerRewardCoupon(referrerDiscordId);
        await Referral.updateOne(
            { _id: claimed._id },
            { $set: { rewardCouponCode: coupon.couponCode } }
        );
        await Order.updateOne({ _id: order._id }, { $set: { referralRewardSent: true } });
        return {
            issued: true,
            referrerDiscordId,
            couponCode: coupon.couponCode,
            discountPercent: REFERRER_REWARD_PERCENT
        };
    } catch (error) {
        // Roll the referral back to pending so a later completion can retry.
        await Referral.updateOne(
            { _id: claimed._id, status: 'rewarded' },
            { $set: { status: 'pending' }, $unset: { refereeFirstOrderId: '' } }
        ).catch(() => {});
        throw error;
    }
};

module.exports = {
    REFERRER_REWARD_PERCENT,
    createReferrerRewardCoupon,
    issueReferralRewardForCompletedOrder
};