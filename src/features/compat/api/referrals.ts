import { api } from '../../../api'
import type { ReferralSummary } from '../../../types'

export function fetchMyReferralSummary() {
  return api<ReferralSummary>('/referrals/me')
}

export function applyReferralCode(code: string) {
  return api<ReferralSummary>('/referrals/apply', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}
