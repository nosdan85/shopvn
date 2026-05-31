import { useEffect, useMemo, useState } from 'react'
import { dateTime, money, orderStatus } from '../../../api'
import type { Deposit, GameCategory, Item, Order, Review, Settings, User } from '../../../types'
import {
  createAdminGame,
  createAdminProduct,
  fetchAdminDeposits,
  fetchAdminGames,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminReviews,
  fetchAdminSettings,
  fetchAdminUsers,
  fetchCompatAdminDashboard,
  type CompatAdminDashboard,
  updateAdminGame,
  updateAdminOrderStatus,
  updateAdminProduct,
  updateAdminSettings,
  updateAdminUser,
} from '../../compat/api/admin'

type AdminTab = 'dashboard' | 'products' | 'games' | 'orders' | 'users' | 'config' | 'modules'

const defaultProductForm = {
  id: 0,
  name: '',
  slug: '',
  game_category_id: '',
  image: '',
  short_description: '',
  description: '',
  price: '0',
  stock: '999999',
  status: 'active',
}

const defaultGameForm = {
  id: 0,
  name: '',
  slug: '',
  icon: '',
  status: 'active',
}

export function CompatAdminDashboardPage() {
  const [tab, setTab] = useState<AdminTab>('dashboard')
  const [dashboard, setDashboard] = useState<CompatAdminDashboard | null>(null)
  const [products, setProducts] = useState<Item[]>([])
  const [games, setGames] = useState<GameCategory[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [productForm, setProductForm] = useState(defaultProductForm)
  const [gameForm, setGameForm] = useState(defaultGameForm)
  const [settingsDraft, setSettingsDraft] = useState<Settings>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function refreshAll() {
    const [
      dashboardData,
      productsData,
      gamesData,
      ordersData,
      usersData,
      settingsData,
      reviewsData,
      depositsData,
    ] = await Promise.all([
      fetchCompatAdminDashboard(),
      fetchAdminProducts(),
      fetchAdminGames(),
      fetchAdminOrders(),
      fetchAdminUsers(),
      fetchAdminSettings(),
      fetchAdminReviews(),
      fetchAdminDeposits(),
    ])
    setDashboard(dashboardData)
    setProducts(productsData.items)
    setGames(gamesData.categories)
    setOrders(ordersData.orders)
    setUsers(usersData.users)
    setSettingsDraft(settingsData.settings)
    setReviews(reviewsData.reviews)
    setDeposits(depositsData.deposits)
  }

  useEffect(() => {
    refreshAll().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Khong tai duoc admin.'))
  }, [])

  const linkedUsers = useMemo(() => users.filter((user) => Boolean(user.discord_id)), [users])
  const pendingDeposits = useMemo(() => deposits.filter((deposit) => deposit.status === 'pending'), [deposits])
  const moduleFlags = useMemo(() => ({
    luckyWheel: settingsDraft.compat_lucky_wheel_enabled === 'true',
    referral: settingsDraft.compat_referral_enabled === 'true',
    proofs: settingsDraft.compat_proofs_enabled === 'true',
  }), [settingsDraft])

  async function saveProduct() {
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...productForm,
        game_category_id: productForm.game_category_id || null,
        price: Number(productForm.price || 0),
        stock: Number(productForm.stock || 0),
      }
      if (productForm.id) await updateAdminProduct(productForm.id, payload)
      else await createAdminProduct(payload)
      setProductForm(defaultProductForm)
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong luu duoc san pham.')
    } finally {
      setSaving(false)
    }
  }

  async function saveGame() {
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: gameForm.name,
        slug: gameForm.slug,
        icon: gameForm.icon,
        status: gameForm.status,
      }
      if (gameForm.id) await updateAdminGame(gameForm.id, payload)
      else await createAdminGame(payload)
      setGameForm(defaultGameForm)
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong luu duoc category.')
    } finally {
      setSaving(false)
    }
  }

  async function saveSettings() {
    setSaving(true)
    setError('')
    try {
      await updateAdminSettings(settingsDraft)
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong luu duoc cau hinh.')
    } finally {
      setSaving(false)
    }
  }

  async function setOrderStatus(orderId: number, status: string) {
    setSaving(true)
    setError('')
    try {
      await updateAdminOrderStatus(orderId, { status, admin_note: `Updated from compat admin: ${status}` })
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong cap nhat duoc don.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleUser(user: User) {
    setSaving(true)
    setError('')
    try {
      await updateAdminUser(user.id, { status: user.status === 'active' ? 'locked' : 'active' })
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong cap nhat duoc user.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-section compat-admin-page">
      <section className="panel compat-page-head">
        <div>
          <span className="eyebrow">Compat admin</span>
          <h1>Western admin layout on current backend</h1>
          <p>Quan ly san pham, category, don hang, user, config va module phu bang du lieu SQLite hien tai.</p>
        </div>
        <div className="compat-nav-actions">
          <button className="ghost" type="button" onClick={() => void refreshAll()}>Tai lai du lieu</button>
          <button className="ghost" type="button" onClick={() => window.location.assign('/admin?legacy=1')}>Mo admin cu</button>
        </div>
      </section>

      <section className="panel compat-admin-tabs">
        {(['dashboard', 'products', 'games', 'orders', 'users', 'config', 'modules'] as const).map((entry) => (
          <button className={tab === entry ? 'compat-chip active' : 'compat-chip'} key={entry} type="button" onClick={() => setTab(entry)}>
            {entry}
          </button>
        ))}
      </section>

      {error && <section className="panel"><p className="compat-error">{error}</p></section>}

      {tab === 'dashboard' && dashboard && (
        <>
          <section className="panel">
            <div className="compat-section-head"><div><span className="eyebrow">Overview</span><h2>Core metrics</h2></div></div>
            <div className="compat-stat-grid">
              {dashboard.cards.map((card) => (
                <article className="stat-card" key={card.key}>
                  <span>{card.label}</span>
                  <strong>{card.key === 'revenue' ? money(card.value) : card.value}</strong>
                </article>
              ))}
              <article className="stat-card"><span>Linked Discord</span><strong>{linkedUsers.length}</strong></article>
              <article className="stat-card"><span>Pending reviews</span><strong>{reviews.filter((review) => review.status === 'pending').length}</strong></article>
            </div>
          </section>
          <section className="panel">
            <div className="compat-section-head"><div><span className="eyebrow">Recent orders</span><h2>Operational feed</h2></div></div>
            <div className="compat-admin-order-list">
              {dashboard.recentOrders.map((order) => (
                <article className="compat-admin-order-row" key={order.id}>
                  <strong>{order.orderCode}</strong>
                  <span>{order.username}</span>
                  <span>{money(order.totalAmount)}</span>
                  <span>{order.status}</span>
                  <span>{dateTime(order.createdAt)}</span>
                </article>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="compat-section-head"><div><span className="eyebrow">Top products</span><h2>Revenue leaders</h2></div></div>
            <div className="compat-admin-order-list">
              {dashboard.topProducts.map((product) => (
                <article className="compat-admin-order-row" key={product.id}>
                  <strong>{product.name}</strong>
                  <span>{money(product.revenue)}</span>
                  <span>{product.quantitySold} sold</span>
                </article>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="compat-section-head"><div><span className="eyebrow">Proof analytics</span><h2>Review-backed vouch flow</h2></div></div>
            <div className="compat-stat-grid">
              <article className="stat-card"><span>Total proofs</span><strong>{dashboard.proofStats.totalProofs}</strong></article>
              <article className="stat-card"><span>Pending proofs</span><strong>{dashboard.proofStats.pendingProofs}</strong></article>
              <article className="stat-card"><span>Lucky wheel title</span><strong>{dashboard.modules.luckyWheelTitle}</strong></article>
              <article className="stat-card"><span>Referral paid</span><strong>{money(dashboard.referralStats.totalPaid)}</strong></article>
            </div>
            <div className="compat-admin-order-list">
              {dashboard.proofStats.recentProofs.map((proof) => (
                <article className="compat-admin-order-row" key={proof.id}>
                  <strong>{proof.username}</strong>
                  <span>{proof.itemName || 'Proof item'}</span>
                  <span>{proof.status}</span>
                  <span>{dateTime(proof.createdAt)}</span>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === 'products' && (
        <>
          <section className="panel compat-form-grid">
            <div className="compat-section-head"><div><span className="eyebrow">Catalog</span><h2>{productForm.id ? 'Sua san pham' : 'Them san pham'}</h2></div></div>
            <div className="compat-field-grid">
              <label className="compat-field"><span>Name</span><input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label>
              <label className="compat-field"><span>Slug</span><input value={productForm.slug} onChange={(event) => setProductForm({ ...productForm, slug: event.target.value })} /></label>
              <label className="compat-field"><span>Category</span><select value={productForm.game_category_id} onChange={(event) => setProductForm({ ...productForm, game_category_id: event.target.value })}><option value="">None</option>{games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></label>
              <label className="compat-field"><span>Image</span><input value={productForm.image} onChange={(event) => setProductForm({ ...productForm, image: event.target.value })} /></label>
              <label className="compat-field"><span>Short description</span><input value={productForm.short_description} onChange={(event) => setProductForm({ ...productForm, short_description: event.target.value })} /></label>
              <label className="compat-field"><span>Price</span><input type="number" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></label>
              <label className="compat-field"><span>Stock</span><input type="number" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} /></label>
              <label className="compat-field"><span>Status</span><select value={productForm.status} onChange={(event) => setProductForm({ ...productForm, status: event.target.value })}><option value="active">active</option><option value="hidden">hidden</option></select></label>
              <label className="compat-field compat-field-wide"><span>Description</span><textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></label>
            </div>
            <div className="compat-action-row">
              <button className="ghost" type="button" onClick={() => setProductForm(defaultProductForm)}>Reset</button>
              <button className="primary" type="button" disabled={saving} onClick={() => void saveProduct()}>{saving ? 'Dang luu...' : 'Luu san pham'}</button>
            </div>
          </section>
          <section className="panel">
            <div className="compat-section-head"><div><span className="eyebrow">Inventory</span><h2>Products</h2></div></div>
            <div className="compat-admin-order-list">
              {products.map((product) => (
                <article className="compat-admin-order-row" key={product.id}>
                  <strong>{product.name}</strong>
                  <span>{product.game_category_name || 'No category'}</span>
                  <span>{money(product.current_price)}</span>
                  <span>Stock {product.stock}</span>
                  <button className="ghost" type="button" onClick={() => setProductForm({
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    game_category_id: product.game_category_id ? String(product.game_category_id) : '',
                    image: product.image,
                    short_description: product.short_description,
                    description: product.description,
                    price: String(product.price),
                    stock: String(product.stock),
                    status: product.status,
                  })}>Sua</button>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === 'games' && (
        <>
          <section className="panel compat-form-grid">
            <div className="compat-section-head"><div><span className="eyebrow">Filters</span><h2>{gameForm.id ? 'Sua category' : 'Them category'}</h2></div></div>
            <div className="compat-field-grid">
              <label className="compat-field"><span>Name</span><input value={gameForm.name} onChange={(event) => setGameForm({ ...gameForm, name: event.target.value })} /></label>
              <label className="compat-field"><span>Slug</span><input value={gameForm.slug} onChange={(event) => setGameForm({ ...gameForm, slug: event.target.value })} /></label>
              <label className="compat-field"><span>Icon</span><input value={gameForm.icon} onChange={(event) => setGameForm({ ...gameForm, icon: event.target.value })} /></label>
              <label className="compat-field"><span>Status</span><select value={gameForm.status} onChange={(event) => setGameForm({ ...gameForm, status: event.target.value })}><option value="active">active</option><option value="hidden">hidden</option></select></label>
            </div>
            <div className="compat-action-row">
              <button className="ghost" type="button" onClick={() => setGameForm(defaultGameForm)}>Reset</button>
              <button className="primary" type="button" disabled={saving} onClick={() => void saveGame()}>{saving ? 'Dang luu...' : 'Luu category'}</button>
            </div>
          </section>
          <section className="panel">
            <div className="compat-admin-order-list">
              {games.map((game) => (
                <article className="compat-admin-order-row" key={game.id}>
                  <strong>{game.name}</strong>
                  <span>{game.slug}</span>
                  <span>{game.status}</span>
                  <button className="ghost" type="button" onClick={() => setGameForm({ id: game.id, name: game.name, slug: game.slug, icon: game.icon, status: game.status })}>Sua</button>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === 'orders' && (
        <section className="panel">
          <div className="compat-admin-order-list">
            {orders.map((order) => (
              <article className="compat-admin-order-row" key={order.id}>
                <strong>{order.order_code}</strong>
                <span>{order.username}</span>
                <span>{money(order.total_amount)}</span>
                <span>{orderStatus[order.status] || order.status}</span>
                <select value={order.status} onChange={(event) => void setOrderStatus(order.id, event.target.value)}>
                  {['pending', 'processing', 'completed', 'cancelled', 'refunded'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'users' && (
        <section className="panel">
          <div className="compat-section-head"><div><span className="eyebrow">Accounts</span><h2>Users and linked Discord</h2></div></div>
          <div className="compat-admin-order-list">
            {users.map((user) => (
              <article className="compat-admin-order-row" key={user.id}>
                <strong>{user.username}</strong>
                <span>{money(user.balance)}</span>
                <span>{user.discord_username || user.discord_id || 'No Discord'}</span>
                <span>{user.status}</span>
                <button className="ghost" type="button" onClick={() => void toggleUser(user)}>{user.status === 'active' ? 'Khoa' : 'Mo khoa'}</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'config' && (
        <section className="panel compat-form-grid">
          <div className="compat-section-head"><div><span className="eyebrow">Settings</span><h2>Compat + legacy config</h2></div></div>
          <div className="compat-field-grid">
            {['site_name', 'slogan', 'hero_banner', 'homepage_notice', 'banners', 'best_seller_ids', 'purchase_enabled'].map((key) => (
              <label className="compat-field" key={key}>
                <span>{key}</span>
                <textarea value={settingsDraft[key] || ''} onChange={(event) => setSettingsDraft({ ...settingsDraft, [key]: event.target.value })} />
              </label>
            ))}
          </div>
          <div className="compat-action-row">
            <button className="primary" type="button" disabled={saving} onClick={() => void saveSettings()}>{saving ? 'Dang luu...' : 'Luu settings'}</button>
          </div>
        </section>
      )}

      {tab === 'modules' && (
        <>
          <section className="panel">
            <div className="compat-section-head"><div><span className="eyebrow">Modules</span><h2>Lucky wheel, referral, proofs, analytics</h2></div></div>
            <div className="compat-stat-grid">
              <article className="stat-card"><span>Lucky wheel</span><strong>{moduleFlags.luckyWheel ? 'ON' : 'OFF'}</strong></article>
              <article className="stat-card"><span>Referral</span><strong>{moduleFlags.referral ? 'ON' : 'OFF'}</strong></article>
              <article className="stat-card"><span>Proofs</span><strong>{moduleFlags.proofs ? 'ON' : 'OFF'}</strong></article>
              <article className="stat-card"><span>Pending deposits</span><strong>{pendingDeposits.length}</strong></article>
              <article className="stat-card"><span>Referral rewards</span><strong>{dashboard?.referralStats.totalRewards || 0}</strong></article>
              <article className="stat-card"><span>Pending reversals</span><strong>{dashboard?.referralStats.pendingReversals || 0}</strong></article>
            </div>
            <div className="compat-toggle-grid">
              <label className="compat-toggle"><input type="checkbox" checked={moduleFlags.luckyWheel} onChange={(event) => setSettingsDraft({ ...settingsDraft, compat_lucky_wheel_enabled: String(event.target.checked) })} /> Compat lucky wheel</label>
              <label className="compat-toggle"><input type="checkbox" checked={moduleFlags.referral} onChange={(event) => setSettingsDraft({ ...settingsDraft, compat_referral_enabled: String(event.target.checked) })} /> Compat referral</label>
              <label className="compat-toggle"><input type="checkbox" checked={moduleFlags.proofs} onChange={(event) => setSettingsDraft({ ...settingsDraft, compat_proofs_enabled: String(event.target.checked) })} /> Compat proofs</label>
            </div>
            <div className="compat-field-grid">
              <label className="compat-field"><span>Lucky wheel title</span><input value={settingsDraft.compat_lucky_wheel_title || dashboard?.modules.luckyWheelTitle || ''} onChange={(event) => setSettingsDraft({ ...settingsDraft, compat_lucky_wheel_title: event.target.value })} /></label>
              <label className="compat-field"><span>Lucky wheel message</span><textarea value={settingsDraft.compat_lucky_wheel_message || dashboard?.modules.luckyWheelMessage || ''} onChange={(event) => setSettingsDraft({ ...settingsDraft, compat_lucky_wheel_message: event.target.value })} /></label>
              <label className="compat-field"><span>Referral headline</span><input value={settingsDraft.compat_referral_headline || ''} onChange={(event) => setSettingsDraft({ ...settingsDraft, compat_referral_headline: event.target.value })} /></label>
              <label className="compat-field"><span>Referral details</span><textarea value={settingsDraft.compat_referral_details || ''} onChange={(event) => setSettingsDraft({ ...settingsDraft, compat_referral_details: event.target.value })} /></label>
              <label className="compat-field"><span>Preview tickets</span><input type="number" min={0} value={settingsDraft.compat_lucky_wheel_preview_tickets || '1'} onChange={(event) => setSettingsDraft({ ...settingsDraft, compat_lucky_wheel_preview_tickets: event.target.value })} /></label>
            </div>
            <div className="compat-action-row">
              <button className="primary" type="button" disabled={saving} onClick={() => void saveSettings()}>{saving ? 'Dang luu...' : 'Luu module flags'}</button>
            </div>
          </section>

          <section className="panel">
            <div className="compat-section-head"><div><span className="eyebrow">Proofs</span><h2>Recent reviews as proof stream</h2></div></div>
            <div className="compat-admin-order-list">
              {reviews.slice(0, 20).map((review) => (
                <article className="compat-admin-order-row" key={review.id}>
                  <strong>{review.username || `User #${review.user_id}`}</strong>
                  <span>{review.item_name || `Item #${review.item_id}`}</span>
                  <span>{review.status}</span>
                  <span>{review.content}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="compat-section-head"><div><span className="eyebrow">Deposits</span><h2>Top-up analytics snapshot</h2></div></div>
            <div className="compat-admin-order-list">
              {pendingDeposits.slice(0, 20).map((deposit) => (
                <article className="compat-admin-order-row" key={deposit.id}>
                  <strong>{deposit.transaction_code}</strong>
                  <span>{deposit.username}</span>
                  <span>{money(deposit.amount)}</span>
                  <span>{deposit.status}</span>
                  <span>{dateTime(deposit.created_at)}</span>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
