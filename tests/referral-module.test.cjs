const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildReferralCode,
  computeReferralRewardAmount,
  canApplyReferralForUser,
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
