import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assetUrl, money } from '../../../api'
import { appRoutes } from '../../../app/routes'
import { fetchCompatStorefront } from '../../compat/api/storefront'
import type { CompatStorefrontProduct, CompatStorefrontSummary } from '../../compat/types'
import { ProductCard } from '../components/ProductCard'
import { ProductModal } from '../components/ProductModal'
import { RecentPurchaseTicker } from '../components/RecentPurchaseTicker'
import { loadCompatCart, mergeCompatCart, saveCompatCart, type CompatCartEntry } from '../lib/compatCart'
import { api } from '../../../api'
import type { User } from '../../../types'

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div className="compat-section-head">
      <div>
        <span className="eyebrow">{note}</span>
        <h2>{title}</h2>
      </div>
    </div>
  )
}

export function ShopLandingPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<CompatStorefrontSummary | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [cart, setCart] = useState<CompatCartEntry[]>(() => loadCompatCart())
  const [selectedProduct, setSelectedProduct] = useState<CompatStorefrontProduct | null>(null)

  useEffect(() => {
    let active = true
    fetchCompatStorefront()
      .then((data) => {
        if (active) setSummary(data)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được shop.')
      })
    api<{ user: User }>('/auth/me').then((data) => {
      if (active) setUser(data.user)
    }).catch(() => {
      if (active) setUser(null)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    saveCompatCart(cart)
  }, [cart])

  const products = useMemo(() => summary?.products || [], [summary])
  const proofs = useMemo(() => summary?.proofs || [], [summary])
  const categories = useMemo(() => summary?.categories || [], [summary])
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const byCategory = category === 'all' || product.categorySlug === category
      const bySearch = !search || `${product.name} ${product.shortDescription || ''}`.toLowerCase().includes(search.toLowerCase())
      return byCategory && bySearch
    })
  }, [category, products, search])
  const bestSellers = useMemo(() => {
    const bestSellerIds = new Set(summary?.bestSellerIds || [])
    const picked = products.filter((product) => bestSellerIds.has(product.id)).slice(0, 6)
    return picked.length ? picked : products.slice(0, 6)
  }, [products, summary])

  if (error) {
    return <section className="page-section"><div className="panel"><h1>NOSMarket</h1><p>{error}</p></div></section>
  }

  if (!summary) {
    return <section className="page-section"><div className="panel"><h1>NOSMarket</h1><p>Đang tải dữ liệu...</p></div></section>
  }

  const heroBanner = summary.banners[0]
  const cartCount = cart.reduce((sum, entry) => sum + entry.quantity, 0)

  function handleAddToCart(product: CompatStorefrontProduct, quantity: number) {
    setCart((current) => mergeCompatCart(current, product.id, quantity))
    setSelectedProduct(null)
  }

  function handleBuyNow(product: CompatStorefrontProduct, quantity: number) {
    setCart((current) => mergeCompatCart(current, product.id, quantity))
    setSelectedProduct(null)
    navigate(appRoutes.cart)
  }

  return (
    <div className="compat-storefront shoptay-storefront">
      <ProductModal key={selectedProduct?.id || 'empty'} product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={handleAddToCart} onBuyNow={handleBuyNow} />

      <section className="compat-nav shoptay-navbar">
        <Link className="shoptay-brand" to={appRoutes.shop}>
          <img src="/pictures/site-logo.png" alt="NOSMarket" onError={(event) => { event.currentTarget.style.display = 'none' }} />
          <span>NOS<strong>Market</strong></span>
        </Link>
        <div className="compat-nav-actions shoptay-nav-actions">
          <Link to={appRoutes.shop}>Shop</Link>
          <Link to={appRoutes.proofs}>Proofs</Link>
          <Link to={appRoutes.orders}>Đơn hàng</Link>
          <Link to={appRoutes.profile}>{user ? user.username : 'Đăng nhập'}</Link>
          <Link className="primary" to={appRoutes.cart}>Giỏ hàng ({cartCount})</Link>
        </div>
      </section>

      <section className="shoptay-hero">
        <div className="shoptay-hero-copy">
          <span className="eyebrow">NOSMARKET ROBLOX SHOP</span>
          <h1>Premium Roblox items, giao nhanh qua Discord ticket.</h1>
          <p>Chọn item, thêm vào giỏ, thanh toán bằng số dư ví. Không còn bước chọn lịch hay chọn phương thức thanh toán của shoptay cũ.</p>
          <div className="shoptay-hero-actions">
            <button className="primary" type="button" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>Shop now</button>
            <Link className="ghost" to={appRoutes.proofs}>View proofs</Link>
          </div>
          <div className="compat-stat-strip shoptay-stat-strip">
            <article><strong>{summary.analytics.totalOrders}</strong><span>Orders</span></article>
            <article><strong>{money(summary.analytics.totalRevenue)}</strong><span>Revenue</span></article>
            <article><strong>{summary.analytics.linkedDiscordUsers}</strong><span>Discord linked</span></article>
          </div>
        </div>
        <div className="shoptay-hero-media">
          {heroBanner ? <img src={assetUrl(heroBanner)} alt="Store banner" /> : <img src="/pictures/banner.jpg" alt="NOS banner" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
        </div>
      </section>

      <RecentPurchaseTicker purchases={summary.recentPurchases} />

      <section className="shoptay-panel">
        <SectionTitle title="Featured modules" note="Lucky wheel, referral, proofs" />
        <div className="compat-module-grid">
          <article className="compat-module-card"><small>Lucky wheel</small><h3>{summary.modules.luckyWheel.title || 'Lucky Wheel'}</h3><p>Liên kết Discord để nhận spin và ưu đãi hỗ trợ.</p></article>
          <article className="compat-module-card"><small>Referral</small><h3>{summary.modules.referral.headline || 'Invite buyers'}</h3><p>Giữ nguyên ví, Discord ticket flow và referral tracking.</p></article>
          <article className="compat-module-card"><small>Proofs</small><h3>Public vouch stream</h3><p>Đánh giá đã duyệt hiển thị ở trang proofs.</p><Link className="ghost" to={appRoutes.proofs}>Mở proofs ({summary.modules.proofs.total})</Link></article>
        </div>
      </section>

      <section className="shoptay-panel">
        <SectionTitle title="Games" note="Categories" />
        <div className="compat-chip-row">
          <button className={category === 'all' ? 'compat-chip active' : 'compat-chip'} type="button" onClick={() => setCategory('all')}>Tất cả</button>
          {categories.map((entry) => <button className={category === entry.slug ? 'compat-chip active' : 'compat-chip'} type="button" key={entry.id} onClick={() => setCategory(entry.slug)}>{entry.name}</button>)}
        </div>
      </section>

      <section className="shoptay-panel">
        <SectionTitle title="Best sellers" note="Hot items" />
        <div className="compat-product-grid">
          {bestSellers.map((product) => <ProductCard key={`best-${product.id}`} product={product} onOpen={setSelectedProduct} />)}
        </div>
      </section>

      <section id="products" className="shoptay-panel">
        <SectionTitle title="Products" note="Search, filter, modal, local cart" />
        <div className="compat-toolbar shoptay-toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm..." />
          <div className="compat-module-pills">
            <span className="compat-pill on">Wallet checkout</span>
            <span className="compat-pill on">Discord required</span>
            <span className="compat-pill on">No schedule/payment step</span>
          </div>
        </div>
        <div className="compat-product-grid">
          {filteredProducts.map((product) => <ProductCard key={product.id} product={product} onOpen={setSelectedProduct} />)}
        </div>
      </section>

      <section className="shoptay-panel">
        <SectionTitle title="Proof preview" note="Public vouches" />
        <div className="compat-proof-preview-grid">
          {proofs.slice(0, 3).map((proof) => (
            <article className="compat-proof-preview-card" key={proof.id}>
              <div className="compat-proof-preview-head"><strong>{proof.username}</strong><span>{money(proof.totalAmount)}</span></div>
              <h3>{proof.itemName || 'Proof item'}</h3>
              <p>{proof.content || 'Approved feedback from a completed order.'}</p>
              <div className="compat-proof-preview-foot"><span>{'★'.repeat(Math.max(1, Math.min(5, proof.rating || 5)))}</span><span>{proof.imageUrls.length ? 'Has image' : 'Text proof'}</span></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
