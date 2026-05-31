function normalizeReferralStem(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function defaultRandomSuffix() {
  return Math.random().toString(36).slice(2, 6).toUpperCase()
}

function buildReferralCode(username, randomSuffixFactory = defaultRandomSuffix) {
  const stem = normalizeReferralStem(username).slice(0, 6) || 'USER'
  return `${stem}${String(randomSuffixFactory() || '').toUpperCase()}`
}

function computeReferralRewardAmount(totalAmount, percent) {
  return Math.round((Number(totalAmount || 0) * Number(percent || 0)) / 100)
}

function canApplyReferralForUser({ currentUserId, referrerUserId, hasExistingOrders, alreadyReferred }) {
  if (!referrerUserId || currentUserId === referrerUserId) return { ok: false, code: 'SELF_REFERRAL' }
  if (alreadyReferred) return { ok: false, code: 'ALREADY_REFERRED' }
  if (hasExistingOrders) return { ok: false, code: 'HAS_ORDERS' }
  return { ok: true }
}

function shouldRewardReferralOnCompletedOrder({ nextStatus, previousStatus, hasReferrer, completedOrdersBeforeUpdate, rewardExistsForOrder }) {
  return nextStatus === 'completed'
    && previousStatus !== 'completed'
    && hasReferrer
    && completedOrdersBeforeUpdate === 0
    && !rewardExistsForOrder
}

function shouldReverseReferralReward({ nextStatus, previousStatus, rewardStatus }) {
  return nextStatus === 'refunded' && previousStatus !== 'refunded' && rewardStatus === 'paid'
}

function mapReferralSummary({ user, referrer, rewards }) {
  const rows = Array.isArray(rewards) ? rewards : []
  return {
    referralCode: user?.referral_code || '',
    referredBy: referrer ? { id: referrer.id, username: referrer.username } : null,
    stats: {
      totalEarned: rows.filter((row) => row.status === 'paid').reduce((sum, row) => sum + Number(row.reward_amount || 0), 0),
      totalRewards: rows.length,
      pendingReversals: rows.filter((row) => row.status === 'reversal_pending').length,
    },
    rewards: rows.map((row) => ({
      id: row.id,
      rewardAmount: Number(row.reward_amount || 0),
      rewardPercent: Number(row.reward_percent || 0),
      status: row.status,
      createdAt: row.created_at,
      paidAt: row.paid_at || '',
      sourceOrderId: row.source_order_id,
    })),
  }
}

module.exports = {
  buildReferralCode,
  canApplyReferralForUser,
  computeReferralRewardAmount,
  mapReferralSummary,
  shouldReverseReferralReward,
  shouldRewardReferralOnCompletedOrder,
}
