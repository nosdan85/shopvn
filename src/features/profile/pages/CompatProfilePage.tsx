import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { backendUrl, dateTime, money } from '../../../api'
import { appRoutes } from '../../../app/routes'
import type { ReferralSummary, User } from '../../../types'
import { api } from '../../../api'
import { applyReferralCode, fetchMyReferralSummary } from '../../compat/api/referrals'

export function CompatProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [referral, setReferral] = useState<ReferralSummary | null>(null)
  const [referralCodeInput, setReferralCodeInput] = useState('')
  const [applyingReferral, setApplyingReferral] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ user: User }>('/auth/me')
      .then((data) => setUser(data.user))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Can dang nhap de xem profile.'))
    fetchMyReferralSummary()
      .then(setReferral)
      .catch(() => setReferral(null))
  }, [])

  async function submitReferralCode() {
    setApplyingReferral(true)
    try {
      const data = await applyReferralCode(referralCodeInput)
      setReferral(data)
      setReferralCodeInput('')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong ap dung duoc referral code.')
    } finally {
      setApplyingReferral(false)
    }
  }

  return (
    <div className="page-section compat-profile-page">
      <section className="panel compat-page-head">
        <div>
          <span className="eyebrow">Compat profile</span>
          <h1>Tai khoan va Discord</h1>
        </div>
        <Link className="ghost" to={appRoutes.shop}>Ve shop</Link>
      </section>
      <section className="panel compat-profile-card">
        {error && <p className="compat-error">{error}</p>}
        {!user && !error && <p>Dang tai thong tin tai khoan...</p>}
        {user && (
          <>
            <p><strong>{user.username}</strong> · {user.email}</p>
            <p>So du: <strong>{money(user.balance)}</strong></p>
            <p>Tong nap: <strong>{money(user.total_deposited)}</strong></p>
            <p>Tong tieu: <strong>{money(user.total_spent)}</strong></p>
            {referral && (
              <div className="compat-referral-card">
                <p>Referral code cua ban: <strong>{referral.referralCode || 'Dang tao...'}</strong></p>
                <p>Tong thuong referral: <strong>{money(referral.stats.totalEarned)}</strong></p>
                <p>So lan thuong: <strong>{referral.stats.totalRewards}</strong></p>
                {referral.referredBy
                  ? <p>Ban duoc gioi thieu boi <strong>{referral.referredBy.username}</strong>.</p>
                  : (
                    <div className="compat-action-row">
                      <input value={referralCodeInput} onChange={(event) => setReferralCodeInput(event.target.value)} placeholder="Nhap referral code" />
                      <button className="ghost" type="button" disabled={applyingReferral || !referralCodeInput.trim()} onClick={() => void submitReferralCode()}>
                        {applyingReferral ? 'Dang ap dung...' : 'Ap dung'}
                      </button>
                    </div>
                  )}
              </div>
            )}
            <p>
              Discord:{' '}
              {user.discord_id
                ? <strong>{user.discord_username || user.discord_id}</strong>
                : <strong>Chua lien ket</strong>}
            </p>
            {user.discord_linked_at && <p>Lien ket luc {dateTime(user.discord_linked_at)}</p>}
            <div className="compat-action-row">
              {!user.discord_id && <button className="primary" type="button" onClick={() => { window.location.href = backendUrl(`/discord/link?return_to=${encodeURIComponent('/profile?discord_linked=1')}`) }}>Lien ket Discord</button>}
              <button className="ghost" type="button" onClick={() => window.location.assign('/shop?legacy=1')}>Mo giao dien cu</button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
