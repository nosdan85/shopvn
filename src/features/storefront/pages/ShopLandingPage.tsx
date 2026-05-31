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
  const [cart, setCart] = useState<CompatCartEntry[]>([])
  const [selectedProduct, setSelectedProduct] = useState<CompatStorefrontProduct | null>(null)

  useEffect(() => {
    let active = true
    fetchCompatStorefront()
      .then((data) => {
        if (active) setSummary(data)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Khong tai duoc storefront.')
      })
    api<{ user: User }>('/auth/me').then((data) => {
      if (active) setUser(data.user)
    }).catch(() => {
      if (active) setUser(null)
    })
    setCart(loadCompatCart())
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    saveCompatCart(cart)
  }, [cart])

  const products = summary?.products || []
  const proofs = summary?.proofs || []
  const categories = summary?.categories || []
  const bestSellerIds = new Set(summary?.bestSellerIds || [])
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const byCategory = category === 'all' || product.categorySlug === category
      const bySearch = !search || `${product.name} ${product.shortDescription || ''}`.toLowerCase().includes(search.toLowerCase())
      return byCategory && bySearch
    })
  }, [category, products, search])
  const bestSellers = useMemo(() => products.filter((product) => bestSellerIds.has(product.id)).slice(0, 6), [bestSellerIds, products])

  if (error) {
    return <section className="page-section"><div className="panel"><h1>Compat storefront</h1><p>{error}</p></div></section>
  }

  if (!summary) {
    return <section className="page-section"><div className="panel"><h1>Compat storefront</h1><p>Dang tai du lieu...</p></div></section>
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
    <div className="page-section compat-storefront">
      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={handleAddToCart} onBuyNow={handleBuyNow} />
      <section className="panel compat-nav">
        <div className="compat-nav-brand">
          <span className="eyebrow">Compat shop</span>
          <strong>Shoptay x ShopVN</strong>
        </div>
        <div className="compat-nav-actions">
          <Link className="ghost" to={appRoutes.proofs}>Proofs</Link>
          <Link className="ghost" to={appRoutes.orders}>Don hang</Link>
          <Link className="ghost" to={appRoutes.profile}>{user ? user.username : 'Profile'}</Link>
          <Link className="primary" to={appRoutes.cart}>Gio hang ({cartCount})</Link>
        </div>
      </section>
      <section className="hero-grid panel">
        <div className="hero-copy">
          <span className="eyebrow">Shoptay Compatible</span>
          <h1>Giao dien web tay tren backend web Viet</h1>
          <p>Mua bang so du, giu Discord ticket flow cu, va port dan UX/admin moi theo tung phase.</p>
          <div className="compat-hero-pills">
            <span>Mua bang vi</span>
            <span>Discord ticket</span>
            <span>Import catalog that</span>
          </div>
          <div className="compat-stat-strip">
            <article><strong>{summary.analytics.totalOrders}</strong><span>Orders</span></article>
            <article><strong>{money(summary.analytics.totalRevenue)}</strong><span>Revenue</span></article>
            <article><strong>{summary.analytics.linkedDiscordUsers}</strong><span>Discord linked</span></article>
          </div>
        </div>
        <div className="hero-banner">
          {heroBanner ? <img src={assetUrl(heroBanner)} alt="Store banner" /> : <div className="hero-banner-fallback">No banner</div>}
        </div>
      </section>

      <RecentPurchaseTicker purchases={summary.recentPurchases} />

      <section className="panel">
        <SectionTitle title="Modules" note="Lucky wheel, referral, proofs, analytics" />
        <div className="compat-module-grid">
          <article className="compat-module-card">
            <small>Lucky wheel</small>
            <h3>{summary.modules.luckyWheel.title}</h3>
            <p>{summary.modules.luckyWheel.message}</p>
            <strong>{summary.modules.luckyWheel.enabled ? `${summary.modules.luckyWheel.tickets} preview ticket(s)` : 'Disabled'}</strong>
          </article>
          <article className="compat-module-card">
            <small>Referral</small>
            <h3>{summary.modules.referral.headline}</h3>
            <p>{summary.modules.referral.details}</p>
            <strong>{summary.modules.referral.enabled ? 'Tracking enabled' : 'Disabled'}</strong>
          </article>
          <article className="compat-module-card">
            <small>Proofs</small>
            <h3>Public vouch stream</h3>
            <p>Approved reviews are rendered in a separate proofs grid and previewed here.</p>
            <Link className="ghost" to={appRoutes.proofs}>Mo proofs ({summary.modules.proofs.total})</Link>
          </article>
        </div>
      </section>

      <section className="panel">
        <SectionTitle title="Games" note="Imported from current categories" />
        <div className="compat-chip-row">
          <button className={category === 'all' ? 'compat-chip active' : 'compat-chip'} type="button" onClick={() => setCategory('all')}>Tat ca</button>
          {categories.map((entry) => (
            <button className={category === entry.slug ? 'compat-chip active' : 'compat-chip'} type="button" key={entry.id} onClick={() => setCategory(entry.slug)}>{entry.name}</button>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionTitle title="Best sellers" note="Imported + current inventory" />
        <div className="compat-product-grid">
          {bestSellers.map((product) => (
            <ProductCard key={`best-${product.id}`} product={product} onOpen={setSelectedProduct} />
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionTitle title="Products" note="Search, filter, modal, local cart" />
        <div className="compat-toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tim san pham..." />
          <div className="compat-module-pills">
            <span className={summary.modules.luckyWheel.enabled ? 'compat-pill on' : 'compat-pill'}>Lucky wheel</span>
            <span className={summary.modules.referral.enabled ? 'compat-pill on' : 'compat-pill'}>Referral</span>
            <span className={summary.modules.proofs.enabled ? 'compat-pill on' : 'compat-pill'}>Proofs</span>
          </div>
        </div>
        <div className="compat-product-grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onOpen={setSelectedProduct} />
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionTitle title="Proof preview" note="Public vouches" />
        <div className="compat-proof-preview-grid">
          {proofs.slice(0, 3).map((proof) => (
            <article className="compat-proof-preview-card" key={proof.id}>
              <div className="compat-proof-preview-head">
                <strong>{proof.username}</strong>
                <span>{money(proof.totalAmount)}</span>
              </div>
              <h3>{proof.itemName || 'Proof item'}</h3>
              <p>{proof.content || 'Approved feedback from a completed order.'}</p>
              <div className="compat-proof-preview-foot">
                <span>{'★'.repeat(Math.max(1, Math.min(5, proof.rating || 5)))}</span>
                <span>{proof.imageUrls.length ? 'Has image' : 'Text proof'}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
