const test = require('node:test')
const assert = require('node:assert/strict')
const { buildCompatAdminDashboard } = require('../server/compat/admin.cjs')
const {
  buildReferralCode,
  computeReferralRewardAmount,
  canApplyReferralForUser,
  mapReferralSummary,
  shouldReverseReferralReward,
  shouldRewardReferralOnCompletedOrder,
} = require('../server/referrals.cjs')

test('buildReferralCode returns uppercase code using username stem', () => {
  const code = buildReferralCode('tester-name', () => 'AB12')
  assert.equal(code, 'TESTERAB12')
})

test('computeReferralRewardAmount returns 50 percent rounded integer', () => {
  assert.equal(computeReferralRewardAmount(200000, 50), 100000)
  assert.equal(computeReferralRewardAmount(199999, 50), 100000)
})

test('canApplyReferralForUser rejects self-referral and users with orders', () => {
  assert.equal(canApplyReferralForUser({
    currentUserId: 5,
    referrerUserId: 5,
    hasExistingOrders: false,
    alreadyReferred: false,
  }).ok, false)

  assert.equal(canApplyReferralForUser({
    currentUserId: 5,
    referrerUserId: 9,
    hasExistingOrders: true,
    alreadyReferred: false,
  }).ok, false)
})

test('shouldRewardReferralOnCompletedOrder only rewards first completed order once', () => {
  assert.equal(shouldRewardReferralOnCompletedOrder({
    nextStatus: 'completed',
    previousStatus: 'processing',
    hasReferrer: true,
    completedOrdersBeforeUpdate: 0,
    rewardExistsForOrder: false,
  }), true)

  assert.equal(shouldRewardReferralOnCompletedOrder({
    nextStatus: 'completed',
    previousStatus: 'completed',
    hasReferrer: true,
    completedOrdersBeforeUpdate: 1,
    rewardExistsForOrder: true,
  }), false)
})

test('mapReferralSummary returns profile-safe referral payload', () => {
  const summary = mapReferralSummary({
    user: { id: 5, referral_code: 'TESTAB12', referred_by_user_id: 9 },
    referrer: { id: 9, username: 'owner' },
    rewards: [{ id: 1, reward_amount: 100000, reward_percent: 50, status: 'paid', created_at: '2026-05-31 10:00:00', source_order_id: 33 }],
  })

  assert.equal(summary.referralCode, 'TESTAB12')
  assert.equal(summary.referredBy.username, 'owner')
  assert.equal(summary.stats.totalEarned, 100000)
})

test('shouldReverseReferralReward only reverses a paid reward on refunded status', () => {
  assert.equal(shouldReverseReferralReward({
    nextStatus: 'refunded',
    previousStatus: 'completed',
    rewardStatus: 'paid',
  }), true)

  assert.equal(shouldReverseReferralReward({
    nextStatus: 'cancelled',
    previousStatus: 'completed',
    rewardStatus: 'paid',
  }), false)
})

test('compat admin dashboard can expose referral stats', () => {
  const dashboard = buildCompatAdminDashboard({
    users: 1,
    orders: 1,
    revenue: 1000,
    pendingDeposits: 0,
    recentOrders: [],
    referralStats: { totalRewards: 3, totalPaid: 150000, pendingReversals: 1 },
  })

  assert.equal(dashboard.referralStats.totalPaid, 150000)
})
