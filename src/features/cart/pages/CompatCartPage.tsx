import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api, backendUrl, money } from '../../../api'
import { appRoutes } from '../../../app/routes'
import type { CompatStorefrontSummary } from '../../compat/types'
import { fetchCompatStorefront, searchCompatRobloxUser } from '../../compat/api/storefront'
import { loadCompatCart, removeCompatCartItem, saveCompatCart, setCompatCartQuantity, type CompatCartEntry } from '../../storefront/lib/compatCart'
import type { User } from '../../../types'

const pendingDiscordCheckoutKey = 'pending_discord_checkout'

function savePendingCheckout(payload: { robloxUsername: string; customerNote: string; items: Array<{ itemId: number; quantity: number }> }) {
  window.sessionStorage.setItem(pendingDiscordCheckoutKey, JSON.stringify(payload))
}

function loadPendingCheckout() {
  try {
    const raw = window.sessionStorage.getItem(pendingDiscordCheckoutKey)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearPendingCheckout() {
  window.sessionStorage.removeItem(pendingDiscordCheckoutKey)
}

export function CompatCartPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<CompatStorefrontSummary | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [cart, setCart] = useState<CompatCartEntry[]>(() => loadCompatCart())
  const [robloxUsername, setRobloxUsername] = useState('')
  const [robloxLookupLoading, setRobloxLookupLoading] = useState(false)
  const [robloxLookup, setRobloxLookup] = useState<null | { userId: string; username: string; displayName: string; avatar: string }>(null)
  const [customerNote, setCustomerNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    fetchCompatStorefront().then((data) => {
      if (active) setSummary(data)
    }).catch(() => undefined)
    api<{ user: User }>('/auth/me').then((data) => {
      if (active) setUser(data.user)
    }).catch(() => {
      if (active) setUser(null)
    })
    return () => {
      active = false
    }
  }, [])

  const productMap = useMemo(() => {
    return new Map((summary?.products || []).map((product) => [product.id, product]))
  }, [summary])

  const cartRows = useMemo(() => cart.map((entry) => ({
    ...entry,
    product: productMap.get(entry.productId) || null,
  })), [cart, productMap])

  const total = useMemo(() => cartRows.reduce((sum, entry) => sum + Number(entry.product?.price || 0) * entry.quantity, 0), [cartRows])

  useEffect(() => {
    saveCompatCart(cart)
  }, [cart])

  async function lookupRoblox() {
    if (!robloxUsername.trim()) return
    setRobloxLookupLoading(true)
    setError('')
    try {
      const result = await searchCompatRobloxUser(robloxUsername.trim())
      setRobloxLookup(result)
      setRobloxUsername(result.username)
    } catch (err) {
      setRobloxLookup(null)
      setError(err instanceof Error ? err.message : 'Khong tim duoc Roblox user.')
    } finally {
      setRobloxLookupLoading(false)
    }
  }

  async function submitCheckout(payloadOverride?: { robloxUsername: string; customerNote: string; items: Array<{ itemId: number; quantity: number }> }) {
    const payload = payloadOverride || {
      robloxUsername,
      customerNote,
      items: cart.map((entry) => ({ itemId: entry.productId, quantity: entry.quantity })),
    }
    setSubmitting(true)
    setError('')
    try {
      const data = await api<{ order: { id: number } }>('/orders/buy', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      clearPendingCheckout()
      setCart([])
      saveCompatCart([])
      navigate(appRoutes.orders, { replace: true, state: { createdOrderId: data.order.id } })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DISCORD_LINK_REQUIRED') {
        savePendingCheckout(payload)
        window.location.href = backendUrl(`/discord/link?return_to=${encodeURIComponent('/cart?discord_linked=1')}`)
        return
      }
      if (err instanceof ApiError && err.status === 401) {
        setError('Can dang nhap. Mo giao dien cu de dang nhap truoc khi checkout.')
      } else {
        setError(err instanceof Error ? err.message : 'Khong checkout duoc.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('discord_linked') !== '1' || !user) return
    const pending = loadPendingCheckout()
    if (!pending) return
    clearPendingCheckout()
    const resumeTimer = window.setTimeout(() => {
      void submitCheckout(pending)
    }, 0)
    params.delete('discord_linked')
    window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`)
    return () => window.clearTimeout(resumeTimer)
  }, [user])

  return (
    <div className="page-section compat-cart-page">
      <section className="panel compat-page-head">
        <div>
          <span className="eyebrow">Compat cart</span>
          <h1>Wallet checkout</h1>
          <p>Bo qua payment guide va delivery-step, chi mua bang so du hien co.</p>
        </div>
        <Link className="ghost" to={appRoutes.shop}>Quay lai shop</Link>
      </section>

      <section className="compat-cart-layout">
        <div className="panel">
          <h2>Gio hang</h2>
          {!cartRows.length && <p>Chua co san pham. Quay lai shop de them item.</p>}
          <div className="compat-cart-list">
            {cartRows.map((entry) => (
              <article className="compat-cart-row" key={entry.productId}>
                <div>
                  <strong>{entry.product?.name || `Item #${entry.productId}`}</strong>
                  <p>{money(Number(entry.product?.price || 0))}</p>
                </div>
                <div className="compat-cart-controls">
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={entry.quantity}
                    onChange={(event) => setCart(setCompatCartQuantity(cart, entry.productId, Number(event.target.value || 1)))}
                  />
                  <button className="ghost" type="button" onClick={() => setCart(removeCompatCartItem(cart, entry.productId))}>Xoa</button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel compat-checkout-card">
          <h2>Thong tin giao item</h2>
          <p>Số dư hiện tại: <strong>{money(user?.balance || 0)}</strong></p>
          <label className="compat-field">
            <span>Roblox username</span>
            <div className="compat-inline-search">
              <input value={robloxUsername} onChange={(event) => setRobloxUsername(event.target.value)} placeholder="player123" />
              <button className="ghost" type="button" disabled={robloxLookupLoading || !robloxUsername.trim()} onClick={() => void lookupRoblox()}>
                {robloxLookupLoading ? 'Dang tim...' : 'Tim'}
              </button>
            </div>
          </label>
          {robloxLookup && (
            <div className="compat-roblox-result">
              {robloxLookup.avatar ? <img src={robloxLookup.avatar} alt={robloxLookup.username} /> : null}
              <div>
                <strong>{robloxLookup.displayName}</strong>
                <span>@{robloxLookup.username}</span>
              </div>
            </div>
          )}
          <label className="compat-field">
            <span>Ghi chu</span>
            <textarea value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} placeholder="Can giao nhanh neu co the" />
          </label>
          <div className="compat-total-row">
            <span>Tong tien</span>
            <strong>{money(total)}</strong>
          </div>
          {error && <p className="compat-error">{error}</p>}
          <div className="compat-action-row">
            <button className="ghost" type="button" onClick={() => window.location.assign('/shop?legacy=1')}>Mo giao dien cu</button>
            <button className="primary" type="button" disabled={submitting || !cart.length} onClick={() => void submitCheckout()}>
              {submitting ? 'Dang mua...' : 'Mua bang so du'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
