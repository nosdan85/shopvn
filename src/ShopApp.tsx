import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { api, dateTime, depositMethod, depositStatus, money, orderStatus, uploadImage } from './api'
import type { AdminChat, AdminOrderChat, BalanceLog, ChatMessage, Deposit, Item, Notification, Order, OrderItem, Review, Settings, User } from './types'

type Page =
  | 'home'
  | 'items'
  | 'item'
  | 'login'
  | 'register'
  | 'forgot'
  | 'reset'
  | 'deposit'
  | 'deposits'
  | 'cart'
  | 'orders'
  | 'order'
  | 'profile'
  | 'review'
  | 'chat'
  | 'admin'

const emptyItem = {
  name: '',
  slug: '',
  item_code: '',
  image: '',
  gallery: [],
  short_description: '',
  description: '',
  price: '',
  original_price: '',
  sale_price: '',
  stock: '',
  is_featured: 0,
  is_best_seller: 0,
  is_sale: 0,
  status: 'active',
  sort_order: '',
  seo_title: '',
  seo_description: '',
}

const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="720" height="540" viewBox="0 0 720 540"%3E%3Crect width="720" height="540" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="28"%3ESailor Piece Item%3C/text%3E%3C/svg%3E'

type CartItem = { item: Item; quantity: number | '' }
const cartStorageKey = 'sailor_piece_cart'

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : 'Có lỗi xảy ra, vui lòng thử lại.'
}

function numberInputValue(value: unknown) {
  return value === 0 || value === null || value === undefined || value === '' ? '' : String(value)
}

function numberInputNext(value: string): number | '' {
  return value === '' ? '' : Number(value)
}

function safeQuantity(value: number | '') {
  return Math.max(1, Number(value || 1))
}

function loadSavedCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(cartStorageKey) || '[]')
    return Array.isArray(parsed) ? parsed.filter((entry) => entry?.item?.id).map((entry) => ({ item: entry.item, quantity: safeQuantity(entry.quantity) })) : []
  } catch (_error) {
    return []
  }
}

function itemPayload(item: Record<string, unknown>) {
  return {
    ...item,
    price: Number(item.price || 0),
    original_price: Number(item.original_price || 0),
    sale_price: item.sale_price === '' || item.sale_price === null || item.sale_price === undefined ? null : Number(item.sale_price),
    stock: Number(item.stock || 0),
    sort_order: Number(item.sort_order || 0),
  }
}

function bankQrUrl(settings: Settings, deposit: Deposit) {
  const accountNumber = settings.bank_account_number || '09696969696969'
  const accountName = settings.bank_account_name || 'DOAN BAO SON'
  const rawTemplate = String(settings.bank_qr_url || '').trim().replace(/^BANK_QR_URL=/, '')
  const template = rawTemplate.startsWith('http') ? rawTemplate : `https://img.vietqr.io/image/MB-{account_number}-compact2.png?amount={amount}&addInfo={content}&accountName={accountName}`
  return template
    .replace(/MB-\d+-compact2\.png/, `MB-${accountNumber}-compact2.png`)
    .replace('{amount}', String(deposit.amount))
    .replace('{content}', encodeURIComponent(deposit.transfer_content))
    .replace('{account_number}', accountNumber)
    .replace('{accountName}', encodeURIComponent(accountName))
}

async function copyText(value: string, setNotice: (message: string) => void) {
  try {
    await navigator.clipboard.writeText(value)
    setNotice('Đã sao chép.')
  } catch (_error) {
    setNotice('Không thể sao chép tự động, vui lòng bôi đen và copy thủ công.')
  }
}

function BootScreen() {
  return (
    <div className="boot-screen" role="status" aria-live="polite">
      <div className="boot-card">
        <div className="boot-dog">🐕</div>
        <div className="boot-track"><span /></div>
        <strong>Đang tải tài khoản...</strong>
        <p>Shop đang kiểm tra phiên đăng nhập của bạn.</p>
      </div>
    </div>
  )
}

function ShopApp() {
  const [page, setPage] = useState<Page>('home')
  const [routeId, setRouteId] = useState<string>('')
  const [user, setUser] = useState<User | null>(null)
  const [booting, setBooting] = useState(true)
  const [settings, setSettings] = useState<Settings>({})
  const [notice, setNotice] = useState('')
  const [cart, setCart] = useState<CartItem[]>(loadSavedCart)
  const lastNotificationId = useRef<number | null>(null)
  const lastAdminUnread = useRef({ support: 0, order: 0 })

  useEffect(() => {
    let active = true
    api<{ user: User }>('/auth/me')
      .then((data) => {
        if (active) setUser(data.user)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setBooting(false)
      })
    api<Settings>('/settings/public').then((data) => {
      if (active) setSettings(data)
    }).catch(() => undefined)
    const params = new URLSearchParams(window.location.search)
    if (window.location.pathname.includes('reset-password') || params.has('token')) {
      setPage('reset')
    }
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart.filter((entry) => entry.item?.id).map((entry) => ({ ...entry, quantity: safeQuantity(entry.quantity) }))))
  }, [cart])

  useEffect(() => {
    if (!user) return undefined
    const refreshUser = () => api<{ user: User }>('/auth/me').then((data) => {
      setUser((current) => {
        if (current && data.user.balance > current.balance) setNotice(`Số dư đã được cộng: ${money(data.user.balance - current.balance)}.`)
        return data.user
      })
    }).catch(() => undefined)
    const timer = window.setInterval(refreshUser, 15000)
    return () => window.clearInterval(timer)
  }, [user?.id])

  useEffect(() => {
    if (!user) return undefined
    const checkNotifications = () => {
      api<{ notifications: Notification[] }>('/notifications').then((data) => {
        const latest = data.notifications[0]
        if (!latest) return
        if (lastNotificationId.current === null) {
          lastNotificationId.current = latest.id
          return
        }
        if (latest.id > lastNotificationId.current) {
          lastNotificationId.current = latest.id
          setNotice(`${latest.title}: ${latest.content}`)
        }
      }).catch(() => undefined)
      if (user.role !== 'user') {
        Promise.all([
          api<{ chats: AdminChat[] }>('/admin/chats'),
          api<{ chats: AdminOrderChat[] }>('/admin/order-chats'),
        ]).then(([support, order]) => {
          const supportUnread = support.chats.reduce((sum, chat) => sum + Number(chat.unread_count || 0), 0)
          const orderUnread = order.chats.reduce((sum, chat) => sum + Number(chat.unread_count || 0), 0)
          if (supportUnread > lastAdminUnread.current.support) setNotice('Support chat có tin nhắn mới.')
          if (orderUnread > lastAdminUnread.current.order) setNotice('Order chat có tin nhắn mới.')
          lastAdminUnread.current = { support: supportUnread, order: orderUnread }
        }).catch(() => undefined)
      }
    }
    checkNotifications()
    const timer = window.setInterval(checkNotifications, 12000)
    return () => window.clearInterval(timer)
  }, [user?.id, user?.role])

  function go(nextPage: Page, id = '') {
    setPage(nextPage)
    setRouteId(id)
    setNotice('')
    window.scrollTo({ top: 0 })
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
      setUser(null)
      go('home')
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }

  function addToCart(item: Item, quantity = 1) {
    setCart((current) => {
      const existing = current.find((entry) => entry.item.id === item.id)
      if (existing) return current.map((entry) => entry.item.id === item.id ? { ...entry, quantity: Math.min(item.stock, safeQuantity(entry.quantity) + quantity) } : entry)
      return [...current, { item, quantity: Math.min(item.stock, quantity) }]
    })
    setNotice('Đã thêm vào giỏ hàng.')
  }

  const context = { user, setUser, go, settings, setNotice, addToCart }
  const cartCount = cart.reduce((sum, entry) => sum + safeQuantity(entry.quantity), 0)
  const navItems = [
    { page: 'home' as Page, label: 'Trang chủ', icon: '⌂', show: true },
    { page: 'items' as Page, label: 'Item', icon: '◆', show: true },
    { page: 'cart' as Page, label: `Giỏ (${cartCount})`, icon: '🛒', show: true },
    { page: 'deposit' as Page, label: 'Nạp', icon: '₫', show: true },
    { page: 'orders' as Page, label: 'Đơn', icon: '☰', show: Boolean(user) },
    { page: 'chat' as Page, label: 'Chat', icon: '✉', show: Boolean(user) },
    { page: 'admin' as Page, label: 'Admin', icon: '⚙', show: Boolean(user && user.role !== 'user') },
  ].filter((item) => item.show)
  const mobileNavItems = user
    ? [...navItems, { page: 'profile' as Page, label: 'Tài khoản', icon: '👤', show: true }]
    : [...navItems, { page: 'login' as Page, label: 'Đăng nhập', icon: '↪', show: true }, { page: 'register' as Page, label: 'Đăng ký', icon: '+', show: true }]

  if (booting) return <BootScreen />

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => go('home')}>
          <span className="brand-mark">SP</span>
          <span>
            <strong>{settings.site_name || 'Sailor Piece Shop'}</strong>
            <small>Roblox item store</small>
          </span>
        </button>
        <nav className="desktop-nav">
          {navItems.map((item) => <button className={page === item.page ? 'active' : ''} key={item.page} onClick={() => go(item.page)}>{item.label}</button>)}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <button className="wallet" onClick={() => go('profile')}>{money(user.balance)}</button>
              <button className="ghost" onClick={logout}>Đăng xuất</button>
            </>
          ) : (
            <>
              <button className="ghost" onClick={() => go('login')}>Đăng nhập</button>
              <button className="primary" onClick={() => go('register')}>Đăng ký</button>
            </>
          )}
        </div>
      </header>
      <nav className="mobile-bottom-nav">
        {mobileNavItems.map((item) => <button className={page === item.page ? 'active' : ''} key={item.page} onClick={() => go(item.page)}><span>{item.icon}</span><small>{item.label}</small></button>)}
      </nav>

      {notice && <div className="toast">{notice}</div>}

      <main>
        {page === 'home' && <Home {...context} />}
        {page === 'items' && <ItemsPage {...context} />}
        {page === 'item' && <ItemDetail {...context} slug={routeId} />}
        {page === 'login' && <Login {...context} />}
        {page === 'register' && <Register {...context} />}
        {page === 'forgot' && <ForgotPassword setNotice={setNotice} />}
        {page === 'reset' && <ResetPassword setNotice={setNotice} />}
        {page === 'deposit' && <DepositPage {...context} />}
        {page === 'deposits' && <DepositsPage />}
        {page === 'cart' && <CartPage user={user} cart={cart} setCart={setCart} go={go} setUser={setUser} setNotice={setNotice} />}
        {page === 'orders' && <OrdersPage go={go} />}
        {page === 'order' && <OrderDetail id={routeId} />}
        {page === 'profile' && <Profile {...context} />}
        {page === 'review' && <ReviewPage setNotice={setNotice} />}
        {page === 'chat' && <ChatPage user={user} go={go} setNotice={setNotice} />}
        {page === 'admin' && <AdminPanel {...context} />}
      </main>

      <footer className="footer">
        <div>
          <strong>{settings.site_name || 'Sailor Piece Shop'}</strong>
          <p>{settings.slogan || 'Shop item Sailor Piece Roblox uy tín, giao nhanh, hỗ trợ tận tâm.'}</p>
        </div>
        <div>
          <p>Hỗ trợ: {settings.support_phone || '0900 000 000'} · {settings.support_email || 'support@sailorpiece.local'}</p>
          <p>Facebook · Discord · Zalo</p>
        </div>
      </footer>
    </div>
  )
}

function Home({ go, settings }: { go: (page: Page, id?: string) => void; settings: Settings }) {
  const [data, setData] = useState<{
    featured: Item[]
    bestSellers: Item[]
    sales: Item[]
    reviews: Review[]
  }>({ featured: [], bestSellers: [], sales: [], reviews: [] })

  useEffect(() => {
    api<typeof data & { settings: Settings }>('/home').then(setData)
  }, [])

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">Roblox Sailor Piece Store</span>
          <h1>{settings.hero_banner || 'Săn item Sailor Piece Roblox chỉ trong vài phút.'}</h1>
          <p>{settings.slogan || 'Mua item Sailor Piece dễ dàng, an toàn, nhanh chóng.'}</p>
          <div className="hero-buttons">
            <button className="primary large" onClick={() => go('items')}>Mua item ngay</button>
            <button className="secondary large" onClick={() => go('deposit')}>Nạp tiền</button>
          </div>
          <div className="trust-grid">
            {['Giao item nhanh', 'Uy tín minh bạch', 'Hỗ trợ sau mua', 'Bảo mật thông tin'].map((text) => <span key={text}>{text}</span>)}
          </div>
        </div>
        <div className="hero-card">
          <div className="ship">⛵</div>
          <h3>Hot deal hôm nay</h3>
          <p>Item hiếm, số lượng giới hạn, xử lý đơn thủ công an toàn.</p>
        </div>
      </section>

      <NoticeCard text={settings.homepage_notice || 'Tin mới: shop đang cập nhật thêm item Sailor Piece hiếm.'} />
      <ItemSection title="Item nổi bật" items={data.featured} go={go} />
      <ItemSection title="Item bán chạy" items={data.bestSellers} go={go} />
      <ItemSection title="Item đang giảm giá" items={data.sales} go={go} />

      <section className="section two-col">
        <div className="panel">
          <h2>Hướng dẫn mua hàng</h2>
          <ol className="steps">
            <li>Đăng ký hoặc đăng nhập tài khoản.</li>
            <li>Nạp tiền vào ví bằng chuyển khoản.</li>
            <li>Chọn item Sailor Piece muốn mua.</li>
            <li>Nhập đúng Roblox Username.</li>
            <li>Xác nhận mua và chờ admin giao item.</li>
          </ol>
        </div>
        <div className="panel">
          <h2>Đánh giá khách hàng</h2>
          <div className="review-list">
            {data.reviews.map((review) => (
              <article key={review.id} className="review-card">
                <strong>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</strong>
                <p>{review.content}</p>
                <small>{review.username} · {review.item_name}</small>
              </article>
            ))}
            {!data.reviews.length && <p>Chưa có đánh giá được duyệt.</p>}
          </div>
        </div>
      </section>
    </>
  )
}

function NoticeCard({ text }: { text: string }) {
  return <div className="notice-card"><strong>Thông báo:</strong> {text}</div>
}

function ItemSection({ title, items, go }: { title: string; items: Item[]; go: (page: Page, id?: string) => void }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        <button onClick={() => go('items')}>Xem tất cả</button>
      </div>
      <div className="item-grid">
        {items.map((item) => <ItemCard key={item.id} item={item} go={go} />)}
      </div>
      {!items.length && <div className="empty-state">Chưa có item trong mục này.</div>}
    </section>
  )
}

function ItemCard({ item, go }: { item: Item; go: (page: Page, id?: string) => void }) {
  return (
    <article className="item-card">
      <button className="image-button" onClick={() => go('item', item.slug)}>
        <img src={item.image || placeholderImage} alt={item.name} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.src = placeholderImage }} />
        {item.discount_percent > 0 && <span className="sale-badge">-{item.discount_percent}%</span>}
        <span className={item.stock > 0 ? 'stock-badge' : 'stock-badge out'}>{item.stock > 0 ? 'Còn hàng' : 'Hết hàng'}</span>
      </button>
      <div className="item-body">
        <h3>{item.name}</h3>
        <p>{item.short_description}</p>
        <div className="price-row">
          <strong>{money(item.current_price)}</strong>
          {item.original_price && item.original_price > item.current_price && <del>{money(item.original_price)}</del>}
        </div>
        <div className="meta-row">
          <span>{item.stock > 0 ? `Còn ${item.stock}` : 'Hết hàng'}</span>
          <span>Đã bán {item.sold_count}</span>
        </div>
        <div className="card-actions">
          <button onClick={() => go('item', item.slug)}>Xem chi tiết</button>
          <button className="primary" disabled={item.stock < 1} onClick={() => go('item', item.slug)}>Mua ngay</button>
        </div>
      </div>
    </article>
  )
}

function ItemsPage({ go }: { go: (page: Page, id?: string) => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const params = new URLSearchParams({ filter, sort, search: debouncedSearch })
    setLoading(true)
    setError('')
    api<{ items: Item[] }>(`/items?${params}`)
      .then((data) => setItems(data.items))
      .catch((err) => setError(messageFromError(err)))
      .finally(() => setLoading(false))
  }, [filter, sort, debouncedSearch])

  return (
    <section className="page-section">
      <div className="section-head">
        <div>
          <span className="eyebrow">Sailor Piece inventory</span>
          <h1>Danh sách item</h1>
        </div>
      </div>
      <div className="filters">
        <input placeholder="Tìm item gần đúng..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="choice-group">
          {[
            ['all', 'Tất cả'],
            ['featured', 'Nổi bật'],
            ['best-seller', 'Bán chạy'],
            ['sale', 'Giảm giá'],
            ['in-stock', 'Còn hàng'],
          ].map(([value, label]) => <button type="button" key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}
        </div>
        <div className="choice-group">
          {[
            ['', 'Mặc định'],
            ['price-asc', 'Giá thấp'],
            ['price-desc', 'Giá cao'],
          ].map(([value, label]) => <button type="button" key={value || 'default'} className={sort === value ? 'active' : ''} onClick={() => setSort(value)}>{label}</button>)}
        </div>
      </div>
      {loading && <div className="skeleton-grid"><span /><span /><span /></div>}
      {error && <div className="empty-state"><p>{error}</p><button onClick={() => { setSearch(''); setFilter('all'); setSort('') }}>Thử lại</button></div>}
      <div className="item-grid">
        {!loading && !error && items.map((item) => <ItemCard key={item.id} item={item} go={go} />)}
      </div>
      {!loading && !error && !items.length && <div className="empty-state">Không tìm thấy sản phẩm phù hợp.</div>}
    </section>
  )
}

function ItemDetail({
  slug,
  user,
  go,
  setUser,
  setNotice,
  addToCart,
}: {
  slug: string
  user: User | null
  go: (page: Page, id?: string) => void
  setUser: (user: User | null) => void
  setNotice: (message: string) => void
  addToCart: (item: Item, quantity?: number) => void
}) {
  const [item, setItem] = useState<Item | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [form, setForm] = useState<{ quantity: number | ''; robloxUsername: string; customerNote: string }>({ quantity: 1, robloxUsername: '', customerNote: '' })

  useEffect(() => {
    api<{ item: Item; reviews: Review[] }>(`/items/${slug}`).then((data) => {
      setItem(data.item)
      setReviews(data.reviews)
    })
  }, [slug])

  async function buy(event: FormEvent) {
    event.preventDefault()
    if (!user) {
      setNotice('Vui lòng đăng nhập trước khi mua.')
      go('login')
      return
    }
    if (!item) return
    try {
      const data = await api<{ order: Order }>('/orders/buy', {
        method: 'POST',
        body: JSON.stringify({ itemId: item.id, ...form, quantity: safeQuantity(form.quantity) }),
      })
      const me = await api<{ user: User }>('/auth/me')
      setUser(me.user)
      setNotice(`Đã tạo đơn ${data.order.order_code}.`)
      go('order', String(data.order.id))
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }

  if (!item) return <section className="page-section">Đang tải item...</section>

  return (
    <section className="page-section detail-layout">
      <div className="gallery">
        <img src={item.image || placeholderImage} alt={item.name} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.src = placeholderImage }} />
        <div className="thumbs">{item.gallery.map((image) => <img key={image} src={image || placeholderImage} alt={`${item.name} gallery`} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.src = placeholderImage }} />)}</div>
      </div>
      <div className="detail-card">
        <button className="ghost" onClick={() => go('items')}>Quay lại danh sách item</button>
        <h1>{item.name}</h1>
        <p>{item.description}</p>
        <div className="price-row big">
          <strong>{money(item.current_price)}</strong>
          {item.original_price && item.original_price > item.current_price && <del>{money(item.original_price)}</del>}
          {item.discount_percent > 0 && <span className="sale-badge inline">-{item.discount_percent}%</span>}
        </div>
        <div className="meta-grid">
          <span>Số lượng còn: <strong>{item.stock}</strong></span>
          <span>Đã bán: <strong>{item.sold_count}</strong></span>
          <span>Trạng thái: <strong>{item.stock > 0 ? 'Còn hàng' : 'Hết hàng'}</strong></span>
        </div>
        <div className="info-box">
          <h3>Hướng dẫn nhận item</h3>
          <p>Nhập đúng Roblox Username, giữ online hoặc theo dõi thông báo để admin liên hệ giao item.</p>
          <h3>Lưu ý trước khi mua</h3>
          <p>Shop chỉ bán item Sailor Piece, không hỏi mật khẩu Roblox và không bán nick/account.</p>
        </div>
        <form className="form-card" onSubmit={buy}>
          <h2>Form mua hàng</h2>
          <input required placeholder="Roblox Username" value={form.robloxUsername} onChange={(event) => setForm({ ...form, robloxUsername: event.target.value })} />
          <label>Số lượng mua<input required min={1} max={item.stock} type="number" placeholder="Nhập số lượng" value={numberInputValue(form.quantity)} onChange={(event) => setForm({ ...form, quantity: numberInputNext(event.target.value) })} /></label>
          <textarea placeholder="Ghi chú cho shop" value={form.customerNote} onChange={(event) => setForm({ ...form, customerNote: event.target.value })} />
          <button type="button" onClick={() => addToCart(item, safeQuantity(form.quantity))}>Thêm vào giỏ hàng</button>
          <button className="primary large" disabled={item.stock < 1}>Mua ngay bằng số dư</button>
        </form>
        <div className="review-list">
          <h2>Đánh giá đã duyệt</h2>
          {reviews.map((review) => <article className="review-card" key={review.id}><strong>{'★'.repeat(review.rating)}</strong><p>{review.content}</p><small>{review.username}</small></article>)}
        </div>
      </div>
    </section>
  )
}

function CartPage({ user, cart, setCart, go, setUser, setNotice }: { user: User | null; cart: CartItem[]; setCart: (cart: CartItem[]) => void; go: (page: Page, id?: string) => void; setUser: (user: User | null) => void; setNotice: (message: string) => void }) {
  const [form, setForm] = useState({ robloxUsername: '', customerNote: '' })
  const total = cart.reduce((sum, entry) => sum + entry.item.current_price * safeQuantity(entry.quantity), 0)
  function updateQuantity(itemId: number, quantity: number | '') {
    setCart(cart.map((entry) => entry.item.id === itemId ? { ...entry, quantity: quantity === '' ? '' : Math.max(1, Math.min(entry.item.stock, quantity)) } : entry))
  }
  async function checkout(event: FormEvent) {
    event.preventDefault()
    if (!user) {
      setNotice('Vui lòng đăng nhập trước khi mua.')
      go('login')
      return
    }
    if (!cart.length) {
      setNotice('Giỏ hàng đang trống.')
      return
    }
    try {
      const data = await api<{ order: Order }>('/orders/buy', {
        method: 'POST',
        body: JSON.stringify({
          robloxUsername: form.robloxUsername,
          customerNote: form.customerNote,
          items: cart.map((entry) => ({ itemId: entry.item.id, quantity: safeQuantity(entry.quantity) })),
        }),
      })
      const me = await api<{ user: User }>('/auth/me')
      setUser(me.user)
      setCart([])
      setNotice(`Đã tạo đơn ${data.order.order_code}.`)
      go('order', String(data.order.id))
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  return (
    <section className="page-section two-col">
      <div className="panel">
        <h1>Giỏ hàng</h1>
        {!cart.length && <p className="muted">Giỏ hàng đang trống.</p>}
        {cart.map((entry) => (
          <div className="cart-row" key={entry.item.id}>
            <img src={entry.item.image || placeholderImage} alt={entry.item.name} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.src = placeholderImage }} />
            <div>
              <strong>{entry.item.name}</strong>
              <p>{money(entry.item.current_price)} · Còn {entry.item.stock}</p>
              <input min={1} max={entry.item.stock} type="number" value={numberInputValue(entry.quantity)} onChange={(event) => updateQuantity(entry.item.id, numberInputNext(event.target.value))} />
            </div>
            <button onClick={() => setCart(cart.filter((item) => item.item.id !== entry.item.id))}>Xóa</button>
          </div>
        ))}
        <h2>Tổng: {money(total)}</h2>
      </div>
      <form className="panel" onSubmit={checkout}>
        <h2>Thanh toán giỏ hàng</h2>
        <input required placeholder="Roblox Username" value={form.robloxUsername} onChange={(event) => setForm({ ...form, robloxUsername: event.target.value })} />
        <textarea placeholder="Ghi chú cho shop" value={form.customerNote} onChange={(event) => setForm({ ...form, customerNote: event.target.value })} />
        <button className="primary large" disabled={!cart.length}>Mua tất cả bằng số dư</button>
        <button type="button" onClick={() => go('items')}>Tiếp tục chọn item</button>
      </form>
    </section>
  )
}

function Login({ setUser, go, setNotice }: { setUser: (user: User | null) => void; go: (page: Page, id?: string) => void; setNotice: (message: string) => void }) {
  const [form, setForm] = useState({ account: '', password: '' })
  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const data = await api<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(form) })
      setUser(data.user)
      setNotice('Đăng nhập thành công.')
      go(data.user.role === 'user' ? 'profile' : 'admin')
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  return (
    <AuthCard title="Đăng nhập" onSubmit={submit}>
      <input required placeholder="Username hoặc email" value={form.account} onChange={(event) => setForm({ ...form, account: event.target.value })} />
      <input required type="password" placeholder="Mật khẩu" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
      <button className="primary large">Đăng nhập</button>
      <button type="button" className="ghost" onClick={() => go('forgot')}>Quên mật khẩu?</button>
    </AuthCard>
  )
}

function Register({ setUser, go, setNotice }: { setUser: (user: User | null) => void; go: (page: Page, id?: string) => void; setNotice: (message: string) => void }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const data = await api<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(form) })
      setUser(data.user)
      setNotice('Đăng ký thành công.')
      go('profile')
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  return (
    <AuthCard title="Đăng ký tài khoản" onSubmit={submit}>
      <input required placeholder="Username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
      <input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <input required type="password" placeholder="Mật khẩu" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
      <input required type="password" placeholder="Nhập lại mật khẩu" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
      <button className="primary large">Tạo tài khoản</button>
    </AuthCard>
  )
}

function AuthCard({ title, onSubmit, children }: { title: string; onSubmit: (event: FormEvent) => void; children: React.ReactNode }) {
  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <span className="eyebrow">Sailor Piece Account</span>
        <h1>{title}</h1>
        {children}
      </form>
    </section>
  )
}

function ForgotPassword({ setNotice }: { setNotice: (message: string) => void }) {
  const [email, setEmail] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const data = await api<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
      setNotice(data.message)
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  return <AuthCard title="Quên mật khẩu" onSubmit={submit}><input required type="email" placeholder="Email đã đăng ký" value={email} onChange={(event) => setEmail(event.target.value)} /><button className="primary large">Gửi mã về Gmail</button></AuthCard>
}

function ResetPassword({ setNotice }: { setNotice: (message: string) => void }) {
  const params = new URLSearchParams(window.location.search)
  const [form, setForm] = useState({ email: params.get('email') || '', token: params.get('token') || '', password: '', confirmPassword: '' })
  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const data = await api<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(form) })
      setNotice(data.message)
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  return (
    <AuthCard title="Đặt lại mật khẩu" onSubmit={submit}>
      <input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <input required inputMode="numeric" placeholder="Mã xác nhận trong Gmail" value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value })} />
      <input required type="password" placeholder="Mật khẩu mới" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
      <input required type="password" placeholder="Nhập lại mật khẩu" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
      <button className="primary large">Cập nhật mật khẩu</button>
    </AuthCard>
  )
}

function DepositPage({ settings, go, user, setUser, setNotice }: { settings: Settings; go: (page: Page, id?: string) => void; user: User | null; setUser: (user: User | null) => void; setNotice: (message: string) => void }) {
  const [amount, setAmount] = useState(100000)
  const [method, setMethod] = useState('bank_transfer')
  const [card, setCard] = useState({ provider: 'viettel_card', serial: '', code: '', declaredValue: 20000 })
  const [deposit, setDeposit] = useState<Deposit | null>(null)
  const [confirmingDeposit, setConfirmingDeposit] = useState<Deposit | null>(null)
  const [failedCardDeposit, setFailedCardDeposit] = useState<Deposit | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!user) {
      setNotice('Vui lòng đăng nhập để nạp tiền.')
      go('login')
      return
    }
    const payload = method === 'bank_transfer'
      ? { amount, method }
      : { amount: card.declaredValue, method: card.provider, serial: card.serial, code: card.code }
    if (Number(payload.amount) < 10000) {
      setNotice('Số tiền nạp tối thiểu là 10.000đ.')
      return
    }
    try {
      const data = await api<{ deposit: Deposit }>('/deposits', { method: 'POST', body: JSON.stringify(payload) })
      setDeposit(data.deposit)
      if (method !== 'bank_transfer' && data.deposit.status === 'failed') setFailedCardDeposit(data.deposit)
      if (method !== 'bank_transfer' && data.deposit.status === 'success') {
        setConfirmingDeposit(data.deposit)
        const me = await api<{ user: User }>('/auth/me')
        setUser(me.user)
        window.setTimeout(() => window.location.reload(), 900)
      }
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }

  const qrUrl = deposit && method === 'bank_transfer'
    ? bankQrUrl(settings, deposit)
    : ''
  const isBankDeposit = deposit?.method === 'bank_transfer'
  const isCardDeposit = Boolean(deposit && deposit.method !== 'bank_transfer')

  useEffect(() => {
    if (!deposit || deposit.status !== 'pending') return undefined
    const timer = window.setInterval(async () => {
      try {
        const data = await api<{ deposits: Deposit[] }>('/deposits')
        const current = data.deposits.find((item) => item.id === deposit.id)
        if (current) setDeposit(current)
        if (current?.status === 'success') {
          setConfirmingDeposit(current)
          const me = await api<{ user: User }>('/auth/me')
          setUser(me.user)
          setNotice('Nạp tiền thành công, số dư đã được cộng vào ví.')
          window.clearInterval(timer)
          window.setTimeout(() => window.location.reload(), 900)
        }
        if (current?.status === 'failed' && current.method !== 'bank_transfer') {
          setFailedCardDeposit(current)
          window.clearInterval(timer)
        }
      } catch (_error) {
        window.clearInterval(timer)
      }
    }, isCardDeposit ? 2000 : 5000)
    return () => window.clearInterval(timer)
  }, [deposit, setNotice, setUser])

  return (
    <section className="page-section two-col">
      <form className="panel deposit-panel" onSubmit={submit}>
        <span className="eyebrow">Wallet top-up</span>
        <h1>Nạp tiền vào ví</h1>
        <p>Chọn chuyển khoản để tạo nội dung nạp riêng, hoặc gửi thông tin thẻ cào để chờ cổng thẻ xử lý tự động.</p>
        <div className="method-grid">
          <button type="button" className={method === 'bank_transfer' ? 'primary' : ''} onClick={() => setMethod('bank_transfer')}>Chuyển khoản</button>
          <button type="button" className={method !== 'bank_transfer' ? 'primary' : ''} onClick={() => setMethod(card.provider)}>Thẻ cào</button>
        </div>
        {method === 'bank_transfer' ? (
          <label>Số tiền muốn nạp<input required type="number" min={10000} step={10000} placeholder="Tối thiểu 10000" value={numberInputValue(amount)} onChange={(event) => setAmount(Number(event.target.value || 0))} /></label>
        ) : (
          <>
            <div className="choice-group">
              {[
                ['viettel_card', 'Viettel'],
                ['mobifone_card', 'Mobifone'],
                ['vinaphone_card', 'Vinaphone'],
              ].map(([value, label]) => <button type="button" key={value} className={card.provider === value ? 'active' : ''} onClick={() => { setCard({ ...card, provider: value }); setMethod(value) }}>{label}</button>)}
            </div>
            <label>Mệnh giá thẻ<input type="number" min={10000} step={10000} placeholder="Ví dụ: 20000" value={numberInputValue(card.declaredValue)} onChange={(event) => setCard({ ...card, declaredValue: Number(event.target.value || 0) })} /></label>
            <label>Số serial thẻ<input required placeholder="Nhập số serial in trên thẻ" value={card.serial} onChange={(event) => setCard({ ...card, serial: event.target.value })} /></label>
            <label>Mã thẻ/PIN<input required placeholder="Nhập mã thẻ/PIN" value={card.code} onChange={(event) => setCard({ ...card, code: event.target.value })} /></label>
          </>
        )}
        <button className="primary large">Tạo giao dịch nạp</button>
        <button type="button" onClick={() => go('deposits')}>Xem lịch sử nạp</button>
      </form>
      <div className="panel deposit-guide">
        <h2>Thông tin thanh toán</h2>
        {(!deposit || isBankDeposit) && (
          <>
            <p>Ngân hàng: <strong>{settings.bank_name || 'MB Bank'}</strong></p>
            <p>Chủ tài khoản: <strong>{settings.bank_account_name}</strong></p>
            <p>Số tài khoản: <strong>{settings.bank_account_number}</strong></p>
          </>
        )}
        {deposit && (
          <div className="bank-box">
            <h3>Giao dịch vừa tạo</h3>
            <p>Mã: <strong>{deposit.transaction_code}</strong></p>
            <p>Phương thức: <strong>{depositMethod[deposit.method] || deposit.method}</strong></p>
            <p>Số tiền: <strong>{money(deposit.amount)}</strong></p>
            {isBankDeposit ? (
              <>
                <div className="copy-box">
                  <span>Nội dung chuyển khoản bắt buộc</span>
                  <strong>{deposit.transfer_content}</strong>
                  <button type="button" onClick={() => copyText(deposit.transfer_content, setNotice)}>Sao chép mã</button>
                </div>
                <div className="copy-box">
                  <span>Số tài khoản</span>
                  <strong>{settings.bank_account_number}</strong>
                  <button type="button" onClick={() => copyText(settings.bank_account_number || '', setNotice)}>Sao chép STK</button>
                </div>
                <p className="warning-box">Lưu ý: QR đã tự điền sẵn số tiền và nội dung. Nếu chuyển khoản thủ công, bắt buộc nhập đúng nội dung <strong>{deposit.transfer_content}</strong> để SePay/bot tự cộng tiền.</p>
              </>
            ) : (
              <p className="warning-box">Thẻ đã được gửi lên hệ thống. Vui lòng chờ xử lý, số dư sẽ tự cập nhật khi thẻ hợp lệ.</p>
            )}
            <p>Trạng thái: {depositStatus[deposit.status]}</p>
            {deposit.status === 'success' && (
              <div className="success-box">
                <h3>Đã nhận được tiền</h3>
                <p>Số dư tài khoản của bạn đã được cộng. Bạn có thể quay về trang chủ để tiếp tục mua item.</p>
                <button className="primary large" onClick={() => go('home')}>Quay về trang chủ</button>
              </div>
            )}
            {qrUrl && <img className="qr-preview" src={qrUrl} alt={`QR nạp ${money(deposit.amount)} nội dung ${deposit.transfer_content}`} />}
          </div>
        )}
      </div>
      {isCardDeposit && deposit?.status === 'pending' && !failedCardDeposit && <DepositWaitingOverlay deposit={deposit} />}
      {confirmingDeposit && <DepositWaitingOverlay deposit={confirmingDeposit} />}
      {failedCardDeposit && <CardFailedOverlay deposit={failedCardDeposit} onClose={() => { setFailedCardDeposit(null); setDeposit(null) }} />}
    </section>
  )
}

function cardFailureMessage(deposit: Deposit) {
  return String(deposit.admin_note || 'Mã thẻ sai, không tồn tại hoặc đã được sử dụng. Vui lòng kiểm tra lại serial, mã thẻ và mệnh giá.')
    .replace(/gachthefast/gi, 'hệ thống')
}

function CardFailedOverlay({ deposit, onClose }: { deposit: Deposit; onClose: () => void }) {
  return (
    <div className="deposit-waiting-overlay" role="alert" aria-live="assertive">
      <div className="deposit-waiting-card deposit-error-card">
        <h2>Thẻ không hợp lệ</h2>
        <p>{cardFailureMessage(deposit)}</p>
        <button className="primary large" type="button" onClick={onClose}>Nhập lại thẻ</button>
      </div>
    </div>
  )
}

function DepositWaitingOverlay({ deposit }: { deposit: Deposit }) {
  return (
    <div className="deposit-waiting-overlay" role="status" aria-live="polite">
      <div className="deposit-waiting-card">
        <div className="dog-runner" aria-hidden="true">{'\uD83D\uDC15'}</div>
        <div className="loading-track"><span /></div>
        <h2>{'\u0110ang ch\u1edd c\u1ed9ng ti\u1ec1n'}</h2>
        <p>{'Vui l\u00f2ng ch\u1edd v\u00e0i gi\u00e2y \u0111\u1ec3 h\u1ec7 th\u1ed1ng x\u00e1c nh\u1eadn giao d\u1ecbch '}<strong>{deposit.transaction_code}</strong>.</p>
        <p className="muted">{'B\u1ea1n kh\u00f4ng c\u1ea7n t\u1ea1o th\u00eam giao d\u1ecbch m\u1edbi. Khi ti\u1ec1n \u0111\u01b0\u1ee3c c\u1ed9ng, web s\u1ebd t\u1ef1 t\u1ea3i l\u1ea1i.'}</p>
      </div>
    </div>
  )
}

function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  useEffect(() => {
    api<{ deposits: Deposit[] }>('/deposits').then((data) => setDeposits(data.deposits))
  }, [])
  return <TablePage title="Lịch sử nạp tiền" headers={['Mã GD', 'Phương thức', 'Số tiền', 'Trạng thái', 'Tạo lúc', 'Hoàn thành']} rows={deposits.map((deposit) => [deposit.transaction_code, depositMethod[deposit.method] || deposit.method, money(deposit.amount), depositStatus[deposit.status], dateTime(deposit.created_at), dateTime(deposit.completed_at)])} />
}

function OrdersPage({ go }: { go: (page: Page, id?: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  useEffect(() => {
    api<{ orders: Order[] }>('/orders').then((data) => setOrders(data.orders))
  }, [])
  return (
    <section className="page-section">
      <h1>Lịch sử mua hàng</h1>
      <div className="table-card">
        <table>
          <thead><tr><th>Mã đơn</th><th>Item</th><th>Tổng tiền</th><th>Roblox Username</th><th>Trạng thái</th><th>Thời gian</th><th></th></tr></thead>
          <tbody>{orders.map((order) => <tr key={order.id}><td>{order.order_code}</td><td>{order.item_names}</td><td>{money(order.total_amount)}</td><td>{order.roblox_username}</td><td>{orderStatus[order.status]}</td><td>{dateTime(order.created_at)}</td><td><button onClick={() => go('order', String(order.id))}>Chi tiết</button></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  )
}

function OrderDetail({ id }: { id: string }) {
  const [data, setData] = useState<{ order: Order; items: Array<{ item_name: string; quantity: number; price: number; total_price: number }>; logs: Array<{ old_status?: string; new_status: string; note?: string; created_at: string }>; messages: ChatMessage[] } | null>(null)
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const load = () => api<typeof data>(`/orders/${id}`).then(setData)
  useEffect(() => {
    load()
  }, [id])
  async function uploadChatImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const data = await uploadImage(file, '/uploads/chat-image')
    setImageUrl(data.url)
  }
  async function send(event: FormEvent) {
    event.preventDefault()
    await api(`/orders/${id}/chat`, { method: 'POST', body: JSON.stringify({ message, image_url: imageUrl }) })
    setMessage('')
    setImageUrl('')
    load()
  }
  if (!data) return <section className="page-section">{'Đang tải đơn hàng...'}</section>
  return (
    <section className="page-section detail-layout">
      <div className="panel">
        <h1>{'Đơn'} {data.order.order_code}</h1>
        <p>{'Trạng thái:'} <strong>{orderStatus[data.order.status]}</strong></p>
        <p>Roblox Username: <strong>{data.order.roblox_username}</strong></p>
        <p>{'Ghi chú khách:'} {data.order.customer_note || '-'}</p>
        <p>{'Ghi chú admin:'} {data.order.admin_note || '-'}</p>
        <p>{'Tổng tiền:'} <strong>{money(data.order.total_amount)}</strong></p>
        <h2>{'Item trong đơn'}</h2>
        {data.items.map((item) => <p key={item.item_name}>{item.quantity} x {item.item_name} · {money(item.total_price)}</p>)}
      </div>
      <div className="panel chat-panel">
        <h2>{'Chat đơn hàng'}</h2>
        <div className="chat-box">
          {data.messages.length === 0 && <p className="muted">{'Chưa có tin nhắn đơn hàng.'}</p>}
          {data.messages.map((item) => <ChatBubble key={item.id} item={item} mine={item.sender_role === 'user'} />)}
        </div>
        <form className="chat-form" onSubmit={send}>
          <input placeholder={'Nhắn cho shop về đơn này'} value={message} onChange={(event) => setMessage(event.target.value)} />
          <label className="upload-button">{'Ảnh'}<input type="file" accept="image/*" onChange={uploadChatImage} /></label>
          <button className="primary" disabled={!message && !imageUrl}>{'Gửi'}</button>
        </form>
        {imageUrl && <img className="chat-image-preview" src={imageUrl} alt={'Ảnh chuẩn bị gửi'} />}
        <h2>{'Lịch sử trạng thái'}</h2>
        {data.logs.map((log, index) => <p key={index}>{dateTime(log.created_at)} · {orderStatus[log.new_status] || log.new_status} · {log.note}</p>)}
      </div>
    </section>
  )
}

function Profile({ setUser, user, go, setNotice }: { setUser: (user: User | null) => void; user: User | null; go: (page: Page, id?: string) => void; setNotice: (message: string) => void }) {
  const [summary, setSummary] = useState<{ user: User; total_deposited: number; total_spent: number } | null>(null)
  const [logs, setLogs] = useState<BalanceLog[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [profile, setProfile] = useState({ full_name: '', phone: '' })
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  useEffect(() => {
    if (!user) {
      go('login')
      return
    }
    api<typeof summary>('/profile/summary').then((data) => {
      setSummary(data)
      setProfile({ full_name: data?.user.full_name || '', phone: data?.user.phone || '' })
    })
    api<{ logs: BalanceLog[] }>('/balance-logs').then((data) => setLogs(data.logs))
    api<{ notifications: Notification[] }>('/notifications').then((data) => setNotifications(data.notifications))
  }, [go, user])

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    try {
      const data = await api<{ user: User }>('/profile', { method: 'PATCH', body: JSON.stringify(profile) })
      setUser(data.user)
      setNotice('Đã cập nhật hồ sơ.')
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    try {
      const data = await api<{ message: string }>('/profile/change-password', { method: 'POST', body: JSON.stringify(password) })
      setNotice(data.message)
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }

  if (!summary) return <section className="page-section">Đang tải hồ sơ...</section>

  return (
    <section className="page-section">
      <div className="section-head">
        <h1>Hồ sơ cá nhân</h1>
        <button onClick={() => go('deposit')}>Nạp tiền</button>
      </div>
      <div className="stats-grid">
        <Stat label="Số dư" value={money(summary.user.balance)} />
        <Stat label="Tổng đã nạp" value={money(summary.total_deposited)} />
        <Stat label="Tổng đã mua" value={money(summary.total_spent)} />
        <Stat label="Ngày tạo" value={dateTime(summary.user.created_at)} />
      </div>
      <section className="two-col">
        <form className="panel" onSubmit={saveProfile}>
          <h2>Cập nhật thông tin</h2>
          <input value={profile.full_name} placeholder="Họ tên" onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} />
          <input value={profile.phone} placeholder="Số điện thoại/Zalo" onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
          <button className="primary">Lưu hồ sơ</button>
        </form>
        <form className="panel" onSubmit={changePassword}>
          <h2>Đổi mật khẩu</h2>
          <input type="password" placeholder="Mật khẩu hiện tại" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} />
          <input type="password" placeholder="Mật khẩu mới" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} />
          <input type="password" placeholder="Nhập lại mật khẩu mới" value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} />
          <button className="primary">Đổi mật khẩu</button>
        </form>
      </section>
      <TablePage title="Biến động số dư" headers={['Loại', 'Số tiền', 'Trước', 'Sau', 'Ghi chú', 'Thời gian']} rows={logs.map((log) => [log.type, money(log.amount), money(log.balance_before), money(log.balance_after), log.note || '', dateTime(log.created_at)])} />
      <TablePage title="Thông báo" headers={['Tiêu đề', 'Nội dung', 'Loại', 'Thời gian']} rows={notifications.map((item) => [item.title, item.content, item.type, dateTime(item.created_at)])} />
    </section>
  )
}

function ReviewPage({ setNotice }: { setNotice: (message: string) => void }) {
  const [form, setForm] = useState({ orderId: '', rating: 5, content: '', image: '' })
  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const data = await api<{ message: string }>('/reviews', { method: 'POST', body: JSON.stringify(form) })
      setNotice(data.message)
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  return (
    <AuthCard title="Đánh giá sau mua" onSubmit={submit}>
      <input required placeholder="ID đơn hàng đã hoàn thành" value={form.orderId} onChange={(event) => setForm({ ...form, orderId: event.target.value })} />
      <label>Số sao<input required min={1} max={5} type="number" placeholder="Từ 1 đến 5" value={numberInputValue(form.rating)} onChange={(event) => setForm({ ...form, rating: Number(event.target.value || 0) })} /></label>
      <textarea required placeholder="Nội dung đánh giá" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
      <input placeholder="Link ảnh minh họa (nếu có)" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} />
      <button className="primary large">Gửi đánh giá</button>
    </AuthCard>
  )
}

function ChatBubble({ item, mine }: { item: ChatMessage; mine: boolean }) {
  const imageMatch = item.message.match(/(?:^|\n)Ảnh: (\S+)/)
  const text = item.message.replace(/(?:^|\n)Ảnh: \S+/, '').trim()
  return <div className={`chat-message ${mine ? 'mine' : 'staff'}`}><strong>{mine ? 'Bạn' : item.sender_username || 'Admin'}</strong>{text && <p>{text}</p>}{imageMatch && <img className="chat-image" src={imageMatch[1]} alt="Ảnh chat" />}<small>{dateTime(item.created_at)}</small></div>
}

function ChatPage({ user, go, setNotice }: { user: User | null; go: (page: Page, id?: string) => void; setNotice: (message: string) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const load = () => api<{ messages: ChatMessage[] }>('/chat').then((data) => setMessages(data.messages))
  useEffect(() => {
    if (!user) return
    load()
    const timer = window.setInterval(load, 5000)
    return () => window.clearInterval(timer)
  }, [user])
  async function uploadChatImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const data = await uploadImage(file, '/uploads/chat-image')
      setImageUrl(data.url)
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!user) {
      go('login')
      return
    }
    try {
      await api('/chat', { method: 'POST', body: JSON.stringify({ message, image_url: imageUrl }) })
      setMessage('')
      setImageUrl('')
      load()
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  if (!user) return <section className="page-section"><h1>Vui lòng đăng nhập để chat với admin.</h1><button className="primary" onClick={() => go('login')}>Đăng nhập</button></section>
  return (
    <section className="page-section">
      <div className="panel chat-panel">
        <h1>Chat với admin</h1>
        <div className="chat-box">
          {messages.length === 0 && <p className="muted">Chưa có tin nhắn nào.</p>}
          {messages.map((item) => <ChatBubble key={item.id} item={item} mine={item.sender_id === user.id} />)}
        </div>
        <form className="chat-form" onSubmit={submit}>
          <input placeholder="Nhập tin nhắn cần hỗ trợ" value={message} onChange={(event) => setMessage(event.target.value)} />
          <label className="upload-button">Ảnh<input type="file" accept="image/*" onChange={uploadChatImage} /></label>
          <button className="primary" disabled={!message && !imageUrl}>Gửi</button>
        </form>
        {imageUrl && <img className="chat-image-preview" src={imageUrl} alt="Ảnh chuẩn bị gửi" />}
      </div>
    </section>
  )
}

function AdminPanel({ user, settings, setNotice }: { user: User | null; settings: Settings; setNotice: (message: string) => void }) {
  const [tab, setTab] = useState('dashboard')
  if (!user || user.role === 'user') return <section className="page-section"><h1>Không có quyền truy cập admin.</h1></section>
  return (
    <section className="page-section admin-layout">
      <aside className="admin-menu">
        {[
          ['dashboard', 'Dashboard'],
          ['items', 'Quản lý item'],
          ['orders', 'Quản lý đơn'],
          ['users', 'Quản lý user'],
          ['deposits', 'Giao dịch nạp'],
          ['sepay-bot', 'SePay Bot'],
          ['balance', 'Log số dư'],
          ['chats', 'Support chat'],
          ['order-chats', 'Order chat'],
          ['reviews', 'Đánh giá'],
          ['settings', 'Cấu hình'],
        ].map(([key, label]) => <button className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>{label}</button>)}
      </aside>
      <div className="admin-content">
        {tab === 'dashboard' && <AdminDashboard />}
        {tab === 'items' && <AdminItems setNotice={setNotice} />}
        {tab === 'orders' && <AdminOrders setNotice={setNotice} />}
        {tab === 'users' && <AdminUsers setNotice={setNotice} />}
        {tab === 'deposits' && <AdminDeposits setNotice={setNotice} />}
        {tab === 'sepay-bot' && <AdminSepayBot setNotice={setNotice} />}
        {tab === 'balance' && <AdminBalanceLogs />}
        {tab === 'chats' && <AdminChats setNotice={setNotice} />}
        {tab === 'order-chats' && <AdminOrderChats setNotice={setNotice} />}
        {tab === 'reviews' && <AdminReviews setNotice={setNotice} />}
        {tab === 'settings' && <AdminSettings initial={settings} setNotice={setNotice} />}
      </div>
    </section>
  )
}

function AdminDashboard() {
  const [data, setData] = useState<{
    stats: Record<string, number>
    topItems: Item[]
    deposits: Deposit[]
    orders: Order[]
  } | null>(null)
  useEffect(() => {
    api<typeof data>('/admin/dashboard').then(setData)
  }, [])
  if (!data) return <p>Đang tải dashboard...</p>
  return (
    <>
      <h1>Dashboard admin</h1>
      <div className="stats-grid">
        <Stat label="Tổng user" value={data.stats.totalUsers} />
        <Stat label="Tổng số dư user" value={money(data.stats.totalUserBalance)} />
        <Stat label="Tổng doanh thu" value={money(data.stats.totalRevenue)} />
        <Stat label="Doanh thu hôm nay" value={money(data.stats.revenueToday)} />
        <Stat label="Doanh thu tháng này" value={money(data.stats.revenueMonth)} />
        <Stat label="Đơn chờ xử lý" value={data.stats.pendingOrders} />
      </div>
      <ItemSection title="Item bán chạy" items={data.topItems} go={() => undefined} />
      <TablePage title="Nạp tiền gần đây" headers={['Mã', 'User', 'Số tiền', 'Trạng thái', 'Thời gian']} rows={data.deposits.map((deposit) => [deposit.transaction_code, deposit.username || '', money(deposit.amount), depositStatus[deposit.status], dateTime(deposit.created_at)])} />
      <TablePage title="Đơn mới nhất" headers={['Mã', 'User', 'Tổng', 'Trạng thái', 'Thời gian']} rows={data.orders.map((order) => [order.order_code, order.username || '', money(order.total_amount), orderStatus[order.status], dateTime(order.created_at)])} />
    </>
  )
}

function AdminItems({ setNotice }: { setNotice: (message: string) => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [editing, setEditing] = useState<Record<string, unknown>>(emptyItem)
  const [isEditing, setIsEditing] = useState(false)
  const load = () => api<{ items: Item[] }>('/admin/items').then((data) => setItems(data.items))
  useEffect(() => {
    load()
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    const path = isEditing ? `/admin/items/${editing.id}` : '/admin/items'
    try {
      await api(path, { method: isEditing ? 'PATCH' : 'POST', body: JSON.stringify(itemPayload(editing)) })
      setEditing(emptyItem)
      setIsEditing(false)
      setNotice('Đã lưu item.')
      load()
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }

  async function hide(id: number) {
    await api(`/admin/items/${id}`, { method: 'DELETE' })
    setNotice('Đã ẩn item.')
    load()
  }

  async function uploadMainImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const data = await uploadImage(file)
      setEditing({ ...editing, image: data.url })
      setNotice('Đã upload ảnh đại diện.')
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }

  async function uploadGalleryImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const data = await uploadImage(file)
      const gallery = Array.isArray(editing.gallery) ? editing.gallery : []
      setEditing({ ...editing, gallery: [...gallery, data.url] })
      setNotice('Đã thêm ảnh vào gallery.')
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }

  return (
    <>
      <h1>Quản lý item</h1>
      <form className="admin-form" onSubmit={save}>
        <p className="form-note">Nhập tên, giá, số lượng và upload ảnh. Các ô giá có thể để trống, khi lưu hệ thống sẽ tự chuyển về 0 nếu cần.</p>
        <label>Tên item<input required placeholder="Ví dụ: Light Fruit" value={String(editing.name || '')} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>
        <label>Slug URL<input placeholder="Tự nhập hoặc để trống" value={String(editing.slug || '')} onChange={(event) => setEditing({ ...editing, slug: event.target.value })} /></label>
        <label>Ảnh đại diện URL<input placeholder="Dán link ảnh hoặc upload bên dưới" value={String(editing.image || '')} onChange={(event) => setEditing({ ...editing, image: event.target.value })} /></label>
        <label className="upload-field"><span>Upload ảnh đại diện</span><span className="upload-button">Chọn ảnh từ máy</span><input type="file" accept="image/*" onChange={uploadMainImage} /></label>
        <label className="upload-field"><span>Thêm ảnh gallery</span><span className="upload-button">Chọn ảnh gallery</span><input type="file" accept="image/*" onChange={uploadGalleryImage} /></label>
        {Boolean(editing.image) && <img className="admin-image-preview" src={String(editing.image)} alt="Ảnh item" />}
        {Array.isArray(editing.gallery) && editing.gallery.length > 0 && <div className="gallery-editor">{editing.gallery.map((image) => <span key={String(image)}><img src={String(image)} alt="Gallery" /><button type="button" onClick={() => setEditing({ ...editing, gallery: (editing.gallery as unknown[]).filter((item) => item !== image) })}>Xóa</button></span>)}</div>}
        <label>Giá bán<input type="number" placeholder="Ví dụ: 50000" value={numberInputValue(editing.price)} onChange={(event) => setEditing({ ...editing, price: numberInputNext(event.target.value) })} /></label>
        <label>Giá gốc<input type="number" placeholder="Ví dụ: 70000" value={numberInputValue(editing.original_price)} onChange={(event) => setEditing({ ...editing, original_price: numberInputNext(event.target.value) })} /></label>
        <label>Giá khuyến mãi<input type="number" placeholder="Không giảm thì bỏ trống" value={numberInputValue(editing.sale_price)} onChange={(event) => setEditing({ ...editing, sale_price: numberInputNext(event.target.value) })} /></label>
        <label>Tồn kho<input type="number" placeholder="Ví dụ: 10" value={numberInputValue(editing.stock)} onChange={(event) => setEditing({ ...editing, stock: numberInputNext(event.target.value) })} /></label>
        <label>Mô tả ngắn<textarea placeholder="Mô tả ngắn hiển thị trên card" value={String(editing.short_description || '')} onChange={(event) => setEditing({ ...editing, short_description: event.target.value })} /></label>
        <label>Mô tả chi tiết<textarea placeholder="Thông tin chi tiết cho trang sản phẩm" value={String(editing.description || '')} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></label>
        <div className="choice-group admin-flags">
          <button type="button" className={editing.is_featured ? 'active' : ''} onClick={() => setEditing({ ...editing, is_featured: editing.is_featured ? 0 : 1 })}>Nổi bật</button>
          <button type="button" className={editing.is_best_seller ? 'active' : ''} onClick={() => setEditing({ ...editing, is_best_seller: editing.is_best_seller ? 0 : 1 })}>Bán chạy</button>
          <button type="button" className={editing.is_sale ? 'active' : ''} onClick={() => setEditing({ ...editing, is_sale: editing.is_sale ? 0 : 1 })}>Giảm giá</button>
        </div>
        <button className="primary">{isEditing ? 'Cập nhật item' : 'Thêm item'}</button>
      </form>
      <TablePage title="Danh sách item" headers={['Tên', 'Giá', 'Kho', 'Trạng thái', 'Thao tác']} rows={items.map((item) => [item.name, money(item.current_price), item.stock, item.status, <span className="actions"><button onClick={() => { setEditing(item); setIsEditing(true) }}>Sửa</button><button onClick={() => hide(item.id)}>Ẩn</button></span>])} />
    </>
  )
}

function AdminOrders({ setNotice }: { setNotice: (message: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const load = () => api<{ orders: Order[] }>('/admin/orders').then((data) => setOrders(data.orders))
  useEffect(() => {
    load()
  }, [])
  async function update(id: number, status: string) {
    const adminNote = window.prompt('Ghi chú cho khách/admin:', orderStatus[status]) || ''
    const refundReason = status === 'refunded' ? window.prompt('Lý do hoàn tiền:', 'Hoàn tiền theo yêu cầu') || '' : ''
    try {
      await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, admin_note: adminNote, refund_reason: refundReason }) })
      setNotice('Đã cập nhật đơn hàng.')
      load()
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  return (
    <>
      <h1>Quản lý đơn hàng</h1>
      <TablePage title="Danh sách đơn" headers={['Mã', 'User', 'Roblox', 'Tổng', 'Trạng thái', 'Thao tác']} rows={orders.map((order) => [order.order_code, order.username || '', order.roblox_username, money(order.total_amount), orderStatus[order.status], <span className="actions"><button onClick={() => update(order.id, 'processing')}>Đang xử lý</button><button onClick={() => update(order.id, 'completed')}>Đã giao</button><button onClick={() => update(order.id, 'cancelled')}>Hủy</button><button onClick={() => update(order.id, 'refunded')}>Hoàn tiền</button></span>])} />
    </>
  )
}

function AdminUsers({ setNotice }: { setNotice: (message: string) => void }) {
  const [users, setUsers] = useState<User[]>([])
  const load = () => api<{ users: User[] }>('/admin/users').then((data) => setUsers(data.users))
  useEffect(() => {
    load()
  }, [])
  async function toggle(user: User) {
    try {
      await api(`/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ status: user.status === 'active' ? 'locked' : 'active' }) })
      load()
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  async function adjust(user: User) {
    const amount = Number(window.prompt('Nhập số tiền cộng/trừ:', '100000'))
    const note = window.prompt('Lý do cộng/trừ tiền:', 'Điều chỉnh thủ công') || ''
    if (!amount || !note) return
    try {
      await api(`/admin/users/${user.id}/adjust-balance`, { method: 'POST', body: JSON.stringify({ amount, note }) })
      setNotice('Đã điều chỉnh số dư.')
      load()
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  return <TablePage title="Quản lý user" headers={['Username', 'Email', 'Số dư', 'Vai trò', 'Trạng thái', 'Thao tác']} rows={users.map((item) => [item.username, item.email, money(item.balance), item.role, item.status, <span className="actions"><button onClick={() => toggle(item)}>{item.status === 'active' ? 'Khóa' : 'Mở khóa'}</button><button onClick={() => adjust(item)}>Cộng/trừ tiền</button></span>])} />
}

function AdminDeposits({ setNotice }: { setNotice: (message: string) => void }) {
  const [users, setUsers] = useState<User[]>([])
  const [selected, setSelected] = useState<User | null>(null)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const loadUsers = () => api<{ users: User[] }>('/admin/users').then((data) => {
    setUsers(data.users)
    if (selected) {
      const current = data.users.find((user) => user.id === selected.id)
      if (current) setSelected(current)
    }
  })
  const loadDeposits = (userId?: number) => api<{ deposits: Deposit[] }>(userId ? `/admin/deposits?user_id=${userId}` : '/admin/deposits').then((data) => setDeposits(data.deposits))
  useEffect(() => {
    loadUsers()
    loadDeposits()
  }, [])
  async function selectUser(user: User) {
    setSelected(user)
    await loadDeposits(user.id)
  }
  async function toggle(user: User) {
    try {
      await api(`/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ status: user.status === 'active' ? 'locked' : 'active' }) })
      setNotice(user.status === 'active' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.')
      loadUsers()
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  async function adjust(user: User) {
    const amount = Number(window.prompt('Nhập số tiền cộng/trừ:', '100000'))
    const note = window.prompt('Lý do cộng/trừ tiền:', 'Điều chỉnh thủ công') || ''
    if (!amount || !note) return
    try {
      await api(`/admin/users/${user.id}/adjust-balance`, { method: 'POST', body: JSON.stringify({ amount, note }) })
      setNotice('Đã điều chỉnh số dư.')
      loadUsers()
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  async function update(id: number, status: string) {
    const note = window.prompt('Ghi chú giao dịch:', depositStatus[status]) || ''
    try {
      await api(`/admin/deposits/${id}`, { method: 'PATCH', body: JSON.stringify({ status, admin_note: note }) })
      setNotice('Đã cập nhật giao dịch nạp.')
      loadUsers()
      loadDeposits(selected?.id)
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  return (
    <div className="admin-user-deposits">
      <div className="panel user-list-panel">
        <h2>Tài khoản user</h2>
        <div className="user-list">
          {users.map((user) => (
            <button key={user.id} className={selected?.id === user.id ? 'user-row active' : 'user-row'} onClick={() => selectUser(user)}>
              <strong>{user.username}</strong>
              <span>{user.email}</span>
              <small>{money(user.balance)} · {user.status}</small>
            </button>
          ))}
        </div>
      </div>
      <div>
        {selected ? (
          <div className="panel selected-user-card">
            <h2>{selected.username}</h2>
            <p>Email: <strong>{selected.email}</strong></p>
            <p>Số dư: <strong>{money(selected.balance)}</strong></p>
            <p>Đã nạp: <strong>{money(selected.total_deposited)}</strong> · Đã tiêu: <strong>{money(selected.total_spent)}</strong></p>
            <p>Trạng thái: <strong>{selected.status}</strong></p>
            <div className="actions">
              <button onClick={() => toggle(selected)}>{selected.status === 'active' ? 'Khóa acc' : 'Mở khóa acc'}</button>
              <button onClick={() => adjust(selected)}>Cộng/trừ tiền</button>
              <button onClick={() => { setSelected(null); loadDeposits() }}>Xem tất cả giao dịch</button>
            </div>
          </div>
        ) : (
          <div className="panel selected-user-card">
            <h2>Tất cả giao dịch nạp</h2>
            <p>Chọn một user bên trái để xem riêng lịch sử nạp và thao tác khóa/cộng trừ tiền.</p>
          </div>
        )}
        <TablePage title={selected ? `Lịch sử nạp của ${selected.username}` : 'Tất cả giao dịch nạp'} headers={['Mã', 'User', 'Số tiền', 'Nội dung CK', 'Trạng thái', 'Thao tác']} rows={deposits.map((deposit) => [deposit.transaction_code, deposit.username || '', money(deposit.amount), deposit.transfer_content, depositStatus[deposit.status], <span className="actions"><button onClick={() => update(deposit.id, 'success')}>Xác nhận</button><button onClick={() => update(deposit.id, 'failed')}>Từ chối</button><button onClick={() => update(deposit.id, 'cancelled')}>Hủy</button></span>])} />
      </div>
    </div>
  )
}

function AdminBalanceLogs() {
  const [logs, setLogs] = useState<BalanceLog[]>([])
  useEffect(() => {
    api<{ logs: BalanceLog[] }>('/admin/balance-logs').then((data) => setLogs(data.logs))
  }, [])
  return <TablePage title="Log biến động số dư" headers={['User', 'Loại', 'Số tiền', 'Trước', 'Sau', 'Ref', 'Ghi chú', 'Thời gian']} rows={logs.map((log) => [log.username || '', log.type, money(log.amount), money(log.balance_before), money(log.balance_after), `${log.reference_type || ''}#${log.reference_id || ''}`, log.note || '', dateTime(log.created_at)])} />
}

function AdminChats({ setNotice }: { setNotice: (message: string) => void }) {
  const [chats, setChats] = useState<AdminChat[]>([])
  const [selected, setSelected] = useState<AdminChat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const loadChats = () => api<{ chats: AdminChat[] }>('/admin/chats').then((data) => setChats(data.chats))
  async function loadThread(chat: AdminChat) {
    setSelected(chat)
    const data = await api<{ messages: ChatMessage[] }>(`/admin/chats/${chat.user_id}`)
    setMessages(data.messages)
    loadChats()
  }
  useEffect(() => {
    loadChats()
  }, [])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    try {
      await api(`/admin/chats/${selected.user_id}`, { method: 'POST', body: JSON.stringify({ message, image_url: imageUrl }) })
      setMessage('')
      setImageUrl('')
      loadThread(selected)
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  async function uploadChatImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const data = await uploadImage(file, '/uploads/chat-image')
    setImageUrl(data.url)
  }
  return (
    <div className="admin-chat-grid">
      <div className="panel">
        <h1>Support chat</h1>
        {chats.length === 0 && <p className="muted">Chưa có cuộc chat nào.</p>}
        <div className="chat-list">
          {chats.map((chat) => <button key={chat.user_id} className={selected?.user_id === chat.user_id ? 'active' : ''} onClick={() => loadThread(chat)}><strong>{chat.username}</strong><span>{chat.last_message || 'Chưa có nội dung'}</span>{chat.unread_count > 0 && <small>{chat.unread_count} mới</small>}</button>)}
        </div>
      </div>
      <div className="panel chat-panel">
        <h2>{selected ? `Đang chat với ${selected.username}` : 'Chọn user để trả lời'}</h2>
        <div className="chat-box">
          {messages.map((item) => <ChatBubble key={item.id} item={item} mine={item.sender_role !== 'user'} />)}
        </div>
        <form className="chat-form" onSubmit={submit}>
          <input disabled={!selected} placeholder={'Nhập phản hồi cho user'} value={message} onChange={(event) => setMessage(event.target.value)} />
          <label className="upload-button">{'Ảnh'}<input disabled={!selected} type="file" accept="image/*" onChange={uploadChatImage} /></label>
          <button className="primary" disabled={!selected || (!message && !imageUrl)}>{'Gửi'}</button>
        </form>
        {imageUrl && <img className="chat-image-preview" src={imageUrl} alt={'Ảnh chuẩn bị gửi'} />}
      </div>
    </div>
  )
}

function AdminOrderChats({ setNotice }: { setNotice: (message: string) => void }) {
  const [chats, setChats] = useState<AdminOrderChat[]>([])
  const [selected, setSelected] = useState<AdminOrderChat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [items, setItems] = useState<OrderItem[]>([])
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const loadChats = () => api<{ chats: AdminOrderChat[] }>('/admin/order-chats').then((data) => setChats(data.chats))
  async function loadThread(chat: AdminOrderChat) {
    setSelected(chat)
    const data = await api<{ messages: ChatMessage[]; items: OrderItem[] }>(`/admin/order-chats/${chat.order_id}`)
    setMessages(data.messages)
    setItems(data.items)
    loadChats()
  }
  useEffect(() => {
    loadChats()
  }, [])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    try {
      await api(`/admin/order-chats/${selected.order_id}`, { method: 'POST', body: JSON.stringify({ message, image_url: imageUrl }) })
      setMessage('')
      setImageUrl('')
      loadThread(selected)
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  async function uploadChatImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const data = await uploadImage(file, '/uploads/chat-image')
    setImageUrl(data.url)
  }
  return (
    <div className="admin-chat-grid">
      <div className="panel">
        <h1>Order chat</h1>
        {chats.length === 0 && <p className="muted">Chưa có chat đơn hàng nào.</p>}
        <div className="chat-list">
          {chats.map((chat) => <button key={chat.order_id} className={selected?.order_id === chat.order_id ? 'active' : ''} onClick={() => loadThread(chat)}><strong>{chat.order_code}</strong><span>{chat.username} · {money(chat.total_amount)}</span>{chat.unread_count > 0 && <small>{chat.unread_count} mới</small>}</button>)}
        </div>
      </div>
      <div className="panel chat-panel">
        <h2>{selected ? `Đơn ${selected.order_code}` : 'Chọn đơn để trả lời'}</h2>
        {selected && <div className="info-box"><p>User: <strong>{selected.username}</strong></p><p>Roblox: <strong>{selected.roblox_username}</strong></p><p>Item: {items.map((item) => `${item.item_name} x${item.quantity}`).join(', ')}</p></div>}
        <div className="chat-box">
          {messages.map((item) => <ChatBubble key={item.id} item={item} mine={item.sender_role !== 'user'} />)}
        </div>
        <form className="chat-form" onSubmit={submit}>
          <input disabled={!selected} placeholder={'Nhập phản hồi cho đơn hàng'} value={message} onChange={(event) => setMessage(event.target.value)} />
          <label className="upload-button">{'Ảnh'}<input disabled={!selected} type="file" accept="image/*" onChange={uploadChatImage} /></label>
          <button className="primary" disabled={!selected || (!message && !imageUrl)}>{'Gửi'}</button>
        </form>
      </div>
    </div>
  )
}

function AdminReviews({ setNotice }: { setNotice: (message: string) => void }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const load = () => api<{ reviews: Review[] }>('/admin/reviews').then((data) => setReviews(data.reviews))
  useEffect(() => {
    load()
  }, [])
  async function update(id: number, status: string) {
    const reply = window.prompt('Phản hồi admin (nếu có):', '') || ''
    try {
      await api(`/admin/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ status, admin_reply: reply }) })
      setNotice('Đã cập nhật đánh giá.')
      load()
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  return <TablePage title="Quản lý đánh giá" headers={['User', 'Item', 'Sao', 'Nội dung', 'Trạng thái', 'Thao tác']} rows={reviews.map((review) => [review.username || '', review.item_name || '', review.rating, review.content, review.status, <span className="actions"><button onClick={() => update(review.id, 'approved')}>Duyệt</button><button onClick={() => update(review.id, 'hidden')}>Ẩn</button><button onClick={() => update(review.id, 'deleted')}>Xóa</button></span>])} />
}

function AdminSettings({ initial, setNotice }: { initial: Settings; setNotice: (message: string) => void }) {
  const [form, setForm] = useState<Settings>(initial)
  useEffect(() => {
    api<{ settings: Settings }>('/admin/settings').then((data) => setForm(data.settings))
  }, [])
  async function save(event: FormEvent) {
    event.preventDefault()
    try {
      await api('/admin/settings', { method: 'PATCH', body: JSON.stringify(form) })
      setNotice('Đã lưu cấu hình website.')
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }
  const keys = ['site_name', 'slogan', 'support_email', 'support_phone', 'zalo_url', 'discord_url', 'facebook_url', 'maintenance_mode', 'registration_enabled', 'deposit_enabled', 'purchase_enabled', 'bank_name', 'bank_account_name', 'bank_account_number', 'bank_qr_url', 'sepay_webhook_secret', 'card_gateway_name', 'card_webhook_secret', 'google_login_enabled', 'facebook_login_enabled', 'smtp_enabled', 'homepage_notice', 'hero_banner']
  return (
    <form className="admin-form settings-form" onSubmit={save}>
      <h1>Cấu hình website</h1>
      {keys.map((key) => <label key={key}>{key}<input value={form[key] || ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}
      <button className="primary large">Lưu cấu hình</button>
    </form>
  )
}

function AdminSepayBot({ setNotice }: { setNotice: (message: string) => void }) {
  const [form, setForm] = useState<Settings>({
    sepay_bot_enabled: 'false',
    sepay_bot_api_url: '',
    sepay_bot_api_key: '',
    sepay_bot_interval_ms: '15000',
  })
  const [status, setStatus] = useState<Record<string, unknown> | null>(null)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const workerReport = status?.worker_last_result && typeof status.worker_last_result === 'object' ? status.worker_last_result as Record<string, unknown> : null
  const workerOk = Boolean(workerReport?.ok)

  const loadStatus = () => api<{ status: Record<string, unknown> }>('/admin/sepay-bot/status').then((data) => setStatus(data.status))

  useEffect(() => {
    api<{ settings: Settings }>('/admin/settings').then((data) => {
      setForm({
        sepay_bot_enabled: data.settings.sepay_bot_enabled || 'false',
        sepay_bot_api_url: data.settings.sepay_bot_api_url || '',
        sepay_bot_api_key: data.settings.sepay_bot_api_key || '',
        sepay_bot_interval_ms: data.settings.sepay_bot_interval_ms || '15000',
      })
    })
    loadStatus()
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    try {
      await api('/admin/settings', { method: 'PATCH', body: JSON.stringify(form) })
      setNotice('Đã lưu cấu hình SePay bot. Bot chạy bằng worker/tool riêng, web chỉ hiển thị trạng thái và report.')
    } catch (error) {
      setNotice(messageFromError(error))
    }
  }

  async function runNow() {
    setLoading(true)
    try {
      const data = await api<Record<string, unknown>>('/admin/sepay-bot/run', { method: 'POST' })
      setResult(data)
      loadStatus()
      setNotice('Đã chạy SePay bot thủ công.')
    } catch (error) {
      setNotice(messageFromError(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="settings-form">
      <h1>SePay Bot</h1>
      <div className="warning-box">
        <strong>Bot đang chạy riêng ngoài web.</strong>
        <span>Nếu bạn chạy bot trên máy tính, chỉ cần máy còn mở, có mạng và cấu hình `API_BASE_URL` trỏ về backend Render là bot vẫn hoạt động.</span>
      </div>
      {status && (
        <div className="bot-status-grid">
          <div className="panel bot-status-card">
            <span>Trạng thái worker</span>
            <strong className={workerOk ? 'ok-text' : 'warn-text'}>{workerOk ? 'Đang hoạt động' : 'Chưa có report'}</strong>
            <small>Lần quét: {status.worker_last_run_at ? dateTime(String(status.worker_last_run_at)) : 'Chưa có'}</small>
          </div>
          <div className="panel bot-status-card">
            <span>Cấu hình web</span>
            <strong>{status.configured ? 'Đã có API SePay' : 'Thiếu API SePay'}</strong>
            <small>Chu kỳ: {String(status.interval_ms || 15000)} ms</small>
          </div>
          <div className="panel bot-status-card">
            <span>Lỗi gần nhất</span>
            <strong className={status.worker_last_error ? 'warn-text' : 'ok-text'}>{status.worker_last_error ? 'Có lỗi' : 'Không lỗi'}</strong>
            <small>{status.worker_last_error ? String(status.worker_last_error) : 'Worker chưa báo lỗi.'}</small>
          </div>
        </div>
      )}
      <div className="panel">
        <h2>Luồng hoạt động</h2>
        <ol className="steps">
          <li>Web tạo mã nạp `NAP...` khi user chọn chuyển khoản.</li>
          <li>Bot local lấy danh sách mã pending từ web.</li>
          <li>Bot quét SePay và chỉ gửi giao dịch có nội dung chứa mã pending.</li>
          <li>Web nhận webhook, kiểm tra mã/số tiền rồi cộng tiền.</li>
        </ol>
      </div>
      <form className="admin-form" onSubmit={save}>
        <h2>Cấu hình lưu trên web</h2>
        <label>Bật bot
          <select value={form.sepay_bot_enabled || 'false'} onChange={(event) => setForm({ ...form, sepay_bot_enabled: event.target.value })}>
            <option value="false">Tắt</option>
            <option value="true">Bật</option>
          </select>
        </label>
        <label>SePay API URL<input placeholder="https://my.sepay.vn/userapi/transactions/list?limit=20" value={form.sepay_bot_api_url || ''} onChange={(event) => setForm({ ...form, sepay_bot_api_url: event.target.value })} /></label>
        <label>SePay API Key<input type="password" placeholder="API key/token SePay" value={form.sepay_bot_api_key || ''} onChange={(event) => setForm({ ...form, sepay_bot_api_key: event.target.value })} /></label>
        <label>Chu kỳ quét milliseconds<input type="number" min={5000} step={1000} value={form.sepay_bot_interval_ms || '15000'} onChange={(event) => setForm({ ...form, sepay_bot_interval_ms: event.target.value })} /></label>
        <button className="primary large">Lưu cấu hình bot</button>
        <button type="button" onClick={runNow} disabled={loading}>{loading ? 'Đang chạy...' : 'Test quét thủ công trên web'}</button>
        <button type="button" onClick={loadStatus}>Tải lại trạng thái</button>
      </form>
      {workerReport && (
        <div className="panel">
          <h2>Report worker gần nhất</h2>
          <div className="stats-grid">
            <Stat label="SePay trả về" value={String(workerReport.total ?? 0)} />
            <Stat label="Mã pending" value={String(workerReport.pending_codes ?? 0)} />
            <Stat label="Khớp mã" value={String(workerReport.matched ?? 0)} />
            <Stat label="Đã gửi web" value={String(workerReport.delivered ?? 0)} />
            <Stat label="Đã cộng tiền" value={String(workerReport.credited ?? 0)} />
            <Stat label="Bị bỏ qua" value={String(workerReport.ignored ?? 0)} />
          </div>
        </div>
      )}
      {result && (
        <div className="panel">
          <h2>Kết quả chạy bot</h2>
          <TablePage title="Thông tin bot" headers={['Trường', 'Giá trị']} rows={Object.entries(result).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : String(value)])} />
        </div>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>
}

function TablePage({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<React.ReactNode>> }) {
  return (
    <section className="table-section">
      <h2>{title}</h2>
      <div className="table-card">
        <table>
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} data-label={headers[cellIndex]}>{cell}</td>)}</tr>)}
            {!rows.length && <tr><td colSpan={headers.length}>Chưa có dữ liệu.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default ShopApp
