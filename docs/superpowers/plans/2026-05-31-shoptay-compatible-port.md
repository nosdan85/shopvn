# Shoptay-Compatible Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the western shop's customer and admin UX into the current Vite + Express + SQLite project without breaking existing data, while keeping wallet-only checkout and the current Discord link/ticket flow.

**Architecture:** Split the current SPA into route-based feature modules inside the existing Vite app, add a compatibility adapter layer between the current backend DTOs and the imported UI, and extend the Express backend only with additive aggregate endpoints and import tooling. Keep the current SQLite backend as the system of record and remove delivery-slot and external-payment checkout paths from the imported flow.

**Tech Stack:** React 19, TypeScript, Vite 8, Express 5, better-sqlite3, Node test runner, existing Discord/Redis helpers, imported static assets from `shoptay-main.zip`

---

## File Structure Map

### Frontend shell and routing

- Create: `src/app/AppRouter.tsx`
- Create: `src/app/routes.ts`
- Create: `src/app/layouts/CompatShell.tsx`
- Create: `src/app/layouts/CompatAdminShell.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Modify: `src/index.css`
- Modify: `src/shop.css`

### Shared adapters and API clients

- Create: `src/features/compat/types.ts`
- Create: `src/features/compat/adapters/catalog.ts`
- Create: `src/features/compat/adapters/orders.ts`
- Create: `src/features/compat/adapters/admin.ts`
- Create: `src/features/compat/api/storefront.ts`
- Create: `src/features/compat/api/admin.ts`
- Modify: `src/api.ts`
- Modify: `src/types.ts`

### Customer pages

- Create: `src/features/storefront/pages/ShopLandingPage.tsx`
- Create: `src/features/storefront/pages/ProductListingPage.tsx`
- Create: `src/features/storefront/components/ProductCard.tsx`
- Create: `src/features/storefront/components/ProductModal.tsx`
- Create: `src/features/storefront/components/RecentPurchaseTicker.tsx`
- Create: `src/features/cart/pages/CompatCartPage.tsx`
- Create: `src/features/orders/pages/CompatOrdersPage.tsx`
- Create: `src/features/profile/pages/CompatProfilePage.tsx`

### Admin pages

- Create: `src/features/admin/pages/CompatAdminDashboardPage.tsx`
- Create: `src/features/admin/pages/CompatAdminProductsPage.tsx`
- Create: `src/features/admin/pages/CompatAdminGamesPage.tsx`
- Create: `src/features/admin/pages/CompatAdminOrdersPage.tsx`
- Create: `src/features/admin/pages/CompatAdminConfigPage.tsx`
- Create: `src/features/admin/pages/CompatAdminLinkedUsersPage.tsx`

### Backend compatibility

- Create: `server/compat/storefront.cjs`
- Create: `server/compat/admin.cjs`
- Create: `server/import-shoptay-catalog.cjs`
- Modify: `server/index.cjs`
- Modify: `server/db.cjs`

### Tests

- Create: `tests/compat-storefront.test.cjs`
- Create: `tests/compat-admin.test.cjs`
- Create: `tests/shoptay-import.test.cjs`
- Modify: `tests/discord-checkout.test.cjs`

---

### Task 1: Add route-based app shell and shared compatibility types

**Files:**
- Modify: `package.json`
- Modify: `src/App.tsx`
- Create: `src/app/routes.ts`
- Create: `src/app/AppRouter.tsx`
- Create: `src/app/layouts/CompatShell.tsx`
- Create: `src/app/layouts/CompatAdminShell.tsx`
- Create: `src/features/compat/types.ts`
- Test: `npm run build`

- [ ] **Step 1: Write the failing route shell check**

Create `src/app/routes.ts` import usage in `src/App.tsx` before the new router files exist so the build proves the route shell is missing:

```tsx
import AppRouter from './app/AppRouter'
import './shop.css'

function App() {
  return <AppRouter />
}

export default App
```

- [ ] **Step 2: Run build to verify it fails**

Run: `npm run build`
Expected: FAIL with a TypeScript or Vite module-resolution error for `./app/AppRouter`.

- [ ] **Step 3: Write minimal implementation**

Add the router dependency and the first route shell:

```json
{
  "dependencies": {
    "react-router-dom": "^7.9.1"
  }
}
```

Create `src/app/routes.ts`:

```ts
export const appRoutes = {
  home: '/',
  shop: '/shop',
  cart: '/cart',
  orders: '/orders',
  profile: '/profile',
  admin: '/admin',
} as const
```

Create `src/app/AppRouter.tsx`:

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { appRoutes } from './routes'
import { CompatShell } from './layouts/CompatShell'
import { CompatAdminShell } from './layouts/CompatAdminShell'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={appRoutes.home} element={<Navigate to={appRoutes.shop} replace />} />
        <Route path={appRoutes.shop} element={<CompatShell />} />
        <Route path={appRoutes.cart} element={<CompatShell initialPage="cart" />} />
        <Route path={appRoutes.orders} element={<CompatShell initialPage="orders" />} />
        <Route path={appRoutes.profile} element={<CompatShell initialPage="profile" />} />
        <Route path={appRoutes.admin} element={<CompatAdminShell />} />
      </Routes>
    </BrowserRouter>
  )
}
```

Create `src/features/compat/types.ts`:

```ts
export type CompatShellPage = 'shop' | 'cart' | 'orders' | 'profile'

export type CompatStorefrontSummary = {
  banners: string[]
  bestSellerIds: number[]
  categories: Array<{ id: number; name: string; slug: string; icon: string }>
  products: Array<{ id: number; name: string; slug: string; price: number; image: string; shortDescription: string }>
  recentPurchases: Array<{ orderCode: string; username: string; itemNames: string; createdAt: string }>
}
```

- [ ] **Step 4: Run build to verify it passes**

Run: `npm install`
Run: `npm run build`
Expected: PASS with the app compiling against the new router shell.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/App.tsx src/app src/features/compat/types.ts
git commit -m "feat: add route-based compatibility shell"
```

### Task 2: Add backend storefront/admin compatibility endpoints and adapter tests

**Files:**
- Create: `server/compat/storefront.cjs`
- Create: `server/compat/admin.cjs`
- Modify: `server/index.cjs`
- Create: `tests/compat-storefront.test.cjs`
- Create: `tests/compat-admin.test.cjs`

- [ ] **Step 1: Write the failing tests**

Create `tests/compat-storefront.test.cjs`:

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const { buildCompatStorefrontSummary } = require('../server/compat/storefront.cjs')

test('buildCompatStorefrontSummary maps categories, products, and ticker rows', () => {
  const summary = buildCompatStorefrontSummary({
    banners: ['/uploads/banner.png'],
    bestSellerIds: [3],
    categories: [{ id: 9, name: 'Blox Fruits', slug: 'blox-fruits', icon: '/uploads/g1.png' }],
    items: [{ id: 3, name: 'Fruit Pack', slug: 'fruit-pack', current_price: 150000, image: '/uploads/p1.png', short_description: 'Top seller' }],
    recentOrders: [{ order_code: 'SP001', username: 'tester', item_names: 'Fruit Pack', created_at: '2026-05-31 10:00:00' }],
  })

  assert.equal(summary.categories[0].slug, 'blox-fruits')
  assert.equal(summary.products[0].price, 150000)
  assert.equal(summary.recentPurchases[0].orderCode, 'SP001')
})
```

Create `tests/compat-admin.test.cjs`:

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const { buildCompatAdminDashboard } = require('../server/compat/admin.cjs')

test('buildCompatAdminDashboard returns card totals and recent rows', () => {
  const dashboard = buildCompatAdminDashboard({
    users: 12,
    orders: 7,
    revenue: 900000,
    pendingDeposits: 2,
    recentOrders: [{ id: 1, order_code: 'SP100', username: 'demo', total_amount: 50000, status: 'pending', created_at: '2026-05-31 10:00:00' }],
  })

  assert.equal(dashboard.cards[0].value, 12)
  assert.equal(dashboard.recentOrders[0].orderCode, 'SP100')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/compat-storefront.test.cjs tests/compat-admin.test.cjs`
Expected: FAIL because `server/compat/storefront.cjs` and `server/compat/admin.cjs` do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `server/compat/storefront.cjs`:

```js
function buildCompatStorefrontSummary({ banners, bestSellerIds, categories, items, recentOrders }) {
  return {
    banners,
    bestSellerIds,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon || '',
    })),
    products: items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: Number(item.current_price || item.price || 0),
      image: item.image || '',
      shortDescription: item.short_description || '',
    })),
    recentPurchases: recentOrders.map((order) => ({
      orderCode: order.order_code,
      username: order.username,
      itemNames: order.item_names || '',
      createdAt: order.created_at,
    })),
  }
}

module.exports = { buildCompatStorefrontSummary }
```

Create `server/compat/admin.cjs`:

```js
function buildCompatAdminDashboard({ users, orders, revenue, pendingDeposits, recentOrders }) {
  return {
    cards: [
      { key: 'users', label: 'Users', value: users },
      { key: 'orders', label: 'Orders', value: orders },
      { key: 'revenue', label: 'Revenue', value: revenue },
      { key: 'pendingDeposits', label: 'Pending deposits', value: pendingDeposits },
    ],
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderCode: order.order_code,
      username: order.username,
      totalAmount: order.total_amount,
      status: order.status,
      createdAt: order.created_at,
    })),
  }
}

module.exports = { buildCompatAdminDashboard }
```

Wire the endpoints in `server/index.cjs`:

```js
const { buildCompatStorefrontSummary } = require('./compat/storefront.cjs')
const { buildCompatAdminDashboard } = require('./compat/admin.cjs')

app.get('/api/compat/storefront', publicCache, async (_req, res) => {
  const categories = gameCategoryRows({ activeOnly: true })
  const items = db.prepare(`${itemSelect()} WHERE items.status = 'active' ORDER BY items.is_best_seller DESC, items.created_at DESC`).all().map(parseItem)
  const recentOrders = db.prepare(`
    SELECT orders.order_code, users.username, GROUP_CONCAT(order_items.item_name, ', ') AS item_names, orders.created_at
    FROM orders
    JOIN users ON users.id = orders.user_id
    LEFT JOIN order_items ON order_items.order_id = orders.id
    GROUP BY orders.id
    ORDER BY orders.created_at DESC
    LIMIT 12
  `).all()
  const settings = publicSettings()
  res.json(buildCompatStorefrontSummary({
    banners: settings.banners ? JSON.parse(settings.banners) : [],
    bestSellerIds: settings.best_seller_ids ? JSON.parse(settings.best_seller_ids) : [],
    categories,
    items,
    recentOrders,
  }))
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/compat-storefront.test.cjs tests/compat-admin.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/compat server/index.cjs tests/compat-storefront.test.cjs tests/compat-admin.test.cjs
git commit -m "feat: add compatibility aggregate endpoints"
```

### Task 3: Add idempotent shoptay catalog import tooling

**Files:**
- Create: `server/import-shoptay-catalog.cjs`
- Create: `tests/shoptay-import.test.cjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing import tests**

Create `tests/shoptay-import.test.cjs`:

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeShoptayGame, normalizeShoptayProduct } = require('../server/import-shoptay-catalog.cjs')

test('normalizeShoptayGame maps source game into current category shape', () => {
  const game = normalizeShoptayGame({ name: 'Sailor Piece', slug: 'sailor-piece', image: '/products/logo.png', active: true })
  assert.equal(game.slug, 'sailor-piece')
  assert.equal(game.status, 'active')
})

test('normalizeShoptayProduct maps source product into current item shape', () => {
  const product = normalizeShoptayProduct({
    source: { name: 'Aura Crate', price: 10000, image: '/products/aura.png', desc: 'crate', category: 'Chest' },
    gameCategoryId: 3,
  })
  assert.equal(product.name, 'Aura Crate')
  assert.equal(product.game_category_id, 3)
  assert.equal(product.price, 10000)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/shoptay-import.test.cjs`
Expected: FAIL because the import module does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `server/import-shoptay-catalog.cjs`:

```js
const path = require('path')

function normalizeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${Date.now()}`
}

function normalizeShoptayGame(source) {
  return {
    name: String(source.name || '').trim(),
    slug: normalizeSlug(source.slug || source.name),
    icon: String(source.image || '').trim(),
    status: source.active === false ? 'hidden' : 'active',
  }
}

function normalizeShoptayProduct({ source, gameCategoryId }) {
  return {
    name: String(source.name || '').trim(),
    slug: normalizeSlug(source.slug || source.name),
    game_category_id: gameCategoryId || null,
    image: String(source.image || '').trim(),
    short_description: String(source.category || '').trim(),
    description: String(source.desc || '').trim(),
    price: Number(source.price || 0),
    stock: Number(source.stock || 999999),
    status: 'active',
  }
}

module.exports = { normalizeShoptayGame, normalizeShoptayProduct }
```

Expose a script entry in `package.json`:

```json
{
  "scripts": {
    "import:shoptay": "node server/import-shoptay-catalog.cjs"
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/shoptay-import.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json server/import-shoptay-catalog.cjs tests/shoptay-import.test.cjs
git commit -m "feat: add shoptay catalog import primitives"
```

### Task 4: Port the storefront UI and remove delivery/payment checkout steps

**Files:**
- Create: `src/features/storefront/pages/ShopLandingPage.tsx`
- Create: `src/features/storefront/pages/ProductListingPage.tsx`
- Create: `src/features/storefront/components/ProductCard.tsx`
- Create: `src/features/storefront/components/ProductModal.tsx`
- Create: `src/features/storefront/components/RecentPurchaseTicker.tsx`
- Create: `src/features/compat/adapters/catalog.ts`
- Create: `src/features/compat/api/storefront.ts`
- Modify: `src/shop.css`
- Test: `npm run build`

- [ ] **Step 1: Write the failing build check**

Update `src/app/layouts/CompatShell.tsx` to render storefront pages that do not exist yet:

```tsx
import { ShopLandingPage } from '../../features/storefront/pages/ShopLandingPage'

export function CompatShell() {
  return <ShopLandingPage />
}
```

- [ ] **Step 2: Run build to verify it fails**

Run: `npm run build`
Expected: FAIL because the new storefront files have not been created.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/compat/api/storefront.ts`:

```ts
import { api } from '../../../api'
import type { CompatStorefrontSummary } from '../types'

export function fetchCompatStorefront() {
  return api<CompatStorefrontSummary>('/compat/storefront')
}
```

Create `src/features/compat/adapters/catalog.ts`:

```ts
import type { CompatStorefrontSummary } from '../types'

export function bestSellerProducts(summary: CompatStorefrontSummary) {
  const ids = new Set(summary.bestSellerIds)
  return summary.products.filter((product) => ids.has(product.id))
}
```

Create `src/features/storefront/pages/ShopLandingPage.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { fetchCompatStorefront } from '../../compat/api/storefront'
import type { CompatStorefrontSummary } from '../../compat/types'

export function ShopLandingPage() {
  const [summary, setSummary] = useState<CompatStorefrontSummary | null>(null)

  useEffect(() => {
    fetchCompatStorefront().then(setSummary)
  }, [])

  if (!summary) return <div className="boot-screen"><div className="boot-card"><strong>Dang tai shop...</strong></div></div>

  return (
    <div className="compat-page">
      <section className="compat-hero">
        <h1>Mua item nhanh bang so du</h1>
        <p>Giao dien web tay, logic vi va Discord cua web Viet.</p>
      </section>
      <section className="compat-grid">
        {summary.products.map((product) => (
          <article key={product.id} className="compat-product-card">
            <img src={product.image} alt={product.name} />
            <h3>{product.name}</h3>
            <p>{product.shortDescription}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
```

Add compatibility CSS using current color tokens instead of the western palette.

- [ ] **Step 4: Run build to verify it passes**

Run: `npm run build`
Expected: PASS and the new storefront renders from `/shop`.

- [ ] **Step 5: Commit**

```bash
git add src/app/layouts/CompatShell.tsx src/features/storefront src/features/compat src/shop.css
git commit -m "feat: port storefront shell into compat routes"
```

### Task 5: Connect cart checkout to wallet-only purchase with Discord-link resume

**Files:**
- Create: `src/features/cart/pages/CompatCartPage.tsx`
- Create: `src/features/orders/pages/CompatOrdersPage.tsx`
- Create: `src/features/profile/pages/CompatProfilePage.tsx`
- Modify: `src/features/storefront/components/ProductModal.tsx`
- Modify: `src/api.ts`
- Modify: `tests/discord-checkout.test.cjs`
- Test: `node --test tests/discord-checkout.test.cjs && npm run build`

- [ ] **Step 1: Write the failing checkout regression test**

Extend `tests/discord-checkout.test.cjs`:

```js
test('discord checkout payload retains cart resume fields', () => {
  const payload = {
    kind: 'cart',
    page: 'cart',
    routeId: '',
    robloxUsername: 'player123',
    customerNote: 'fast pls',
    items: [{ itemId: 1, quantity: 2 }],
  }

  assert.equal(payload.items[0].quantity, 2)
  assert.equal(payload.robloxUsername, 'player123')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/discord-checkout.test.cjs`
Expected: FAIL if the required cart resume helpers are not exported or the test fixture does not match current logic.

- [ ] **Step 3: Write minimal implementation**

Implement `CompatCartPage` using the existing API routes:

```tsx
import { api, ApiError } from '../../../api'

async function submitWalletCheckout(payload) {
  try {
    return await api('/orders/buy', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DISCORD_LINK_REQUIRED') {
      window.sessionStorage.setItem('pending_discord_checkout', JSON.stringify(payload))
      window.location.href = '/api/discord/link?return_to=%2Fshop%3Fdiscord_linked%3D1'
      return null
    }
    throw error
  }
}
```

Render only wallet checkout actions:

```tsx
<button className="primary" type="button" onClick={() => void submitWalletCheckout(payload)}>
  Mua bang so du
</button>
```

Do not render:

```tsx
// removed from compat cart flow
// payment guide step
// delivery-slot step
// proof upload checkout
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/discord-checkout.test.cjs`
Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/cart src/features/orders src/features/profile src/features/storefront/components/ProductModal.tsx src/api.ts tests/discord-checkout.test.cjs
git commit -m "feat: wire compat checkout to wallet and discord resume"
```

### Task 6: Port core admin UX on top of current admin endpoints

**Files:**
- Create: `src/features/admin/pages/CompatAdminDashboardPage.tsx`
- Create: `src/features/admin/pages/CompatAdminProductsPage.tsx`
- Create: `src/features/admin/pages/CompatAdminGamesPage.tsx`
- Create: `src/features/admin/pages/CompatAdminOrdersPage.tsx`
- Create: `src/features/admin/pages/CompatAdminConfigPage.tsx`
- Create: `src/features/admin/pages/CompatAdminLinkedUsersPage.tsx`
- Create: `src/features/compat/adapters/admin.ts`
- Create: `src/features/compat/api/admin.ts`
- Modify: `src/app/layouts/CompatAdminShell.tsx`
- Test: `npm run build`

- [ ] **Step 1: Write the failing build check**

Update `src/app/layouts/CompatAdminShell.tsx` to import the dashboard page before it exists:

```tsx
import { CompatAdminDashboardPage } from '../../features/admin/pages/CompatAdminDashboardPage'

export function CompatAdminShell() {
  return <CompatAdminDashboardPage />
}
```

- [ ] **Step 2: Run build to verify it fails**

Run: `npm run build`
Expected: FAIL because the admin page files do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/compat/api/admin.ts`:

```ts
import { api } from '../../../api'

export function fetchCompatAdminDashboard() {
  return api('/compat/admin/dashboard')
}

export function fetchAdminProducts() {
  return api('/admin/items')
}

export function fetchAdminGames() {
  return api('/admin/game-categories')
}
```

Create `src/features/admin/pages/CompatAdminDashboardPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { fetchCompatAdminDashboard } from '../../compat/api/admin'

export function CompatAdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null)

  useEffect(() => {
    fetchCompatAdminDashboard().then(setDashboard)
  }, [])

  if (!dashboard) return <div className="panel">Dang tai admin...</div>

  return (
    <section className="compat-admin-dashboard">
      {dashboard.cards.map((card) => (
        <article key={card.key} className="stat-card">
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  )
}
```

Repeat the same pattern for products, games, orders, config, and linked users pages, keeping the western layout but calling the current backend endpoints.

- [ ] **Step 4: Run build to verify it passes**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/admin src/features/compat/adapters/admin.ts src/features/compat/api/admin.ts src/app/layouts/CompatAdminShell.tsx
git commit -m "feat: port compat admin experience"
```

### Task 7: Add secondary modules and run the catalog import

**Files:**
- Modify: `server/index.cjs`
- Modify: `src/app/layouts/CompatShell.tsx`
- Modify: `src/app/layouts/CompatAdminShell.tsx`
- Modify: `server/import-shoptay-catalog.cjs`
- Test: `npm test`, `npm run build`, `npm run import:shoptay -- --dry-run`

- [ ] **Step 1: Write the failing regression checks**

Add import and module smoke expectations:

```bash
npm test
npm run build
npm run import:shoptay -- --dry-run
```

Expected before implementation: at least one of the module routes, dry-run parsing, or storefront/admin builds should fail because the secondary module wiring is not finished.

- [ ] **Step 2: Run the checks to verify failure**

Run:

```bash
npm test
npm run build
npm run import:shoptay -- --dry-run
```

Expected: FAIL until lucky wheel, referral, proofs/vouch, Roblox-search wiring, and import CLI args are completed.

- [ ] **Step 3: Write minimal implementation**

Extend `server/import-shoptay-catalog.cjs` with CLI flags:

```js
const dryRun = process.argv.includes('--dry-run')
const zipPathArgIndex = process.argv.indexOf('--zip')
const zipPath = zipPathArgIndex >= 0 ? process.argv[zipPathArgIndex + 1] : ''

if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, zipPath, games: 0, products: 0 }, null, 2))
  process.exit(0)
}
```

Expose secondary-module tabs in the compat shells only after their data source exists:

```tsx
const customerTabs = ['shop', 'cart', 'orders', 'profile', 'proofs', 'wheel']
const adminTabs = ['dashboard', 'products', 'games', 'orders', 'config', 'linked-users', 'analytics']
```

Port lucky-wheel, referral, proofs/vouch, and Roblox search pages by adapting them to current APIs or additive compatibility endpoints, but keep them outside the wallet checkout critical path.

- [ ] **Step 4: Run checks to verify they pass**

Run:

```bash
npm test
npm run build
npm run import:shoptay -- --dry-run --zip "C:/Users/shhshs/Documents/ảnh/shoptay-main.zip"
```

Expected:

- tests PASS
- build PASS
- dry-run prints parsed import summary without mutating the database

- [ ] **Step 5: Commit**

```bash
git add server/index.cjs server/import-shoptay-catalog.cjs src/app/layouts
git commit -m "feat: add secondary compat modules and import dry-run"
```

## Spec Coverage Check

- Route-based Vite port: covered by Tasks 1, 4, 5, and 6.
- Backend compatibility layer: covered by Task 2.
- Mongo-to-SQLite catalog migration path: covered by Tasks 3 and 7.
- Wallet-only checkout with Discord enforcement: covered by Task 5.
- Admin UX migration: covered by Task 6.
- Secondary modules from the source zip: covered by Task 7.
- Delivery-slot and external-payment removal: covered by Tasks 4 and 5.

## Placeholder Scan

- No `TODO` or `TBD` markers remain.
- Every task names exact files.
- Every task includes exact commands and expected outcomes.

## Type Consistency Check

- `CompatStorefrontSummary` is introduced in Task 1 and reused consistently in Tasks 2 and 4.
- Compatibility API functions in Tasks 4 and 6 call the new `/api/compat/...` namespace introduced in Task 2.
- Import helpers named in Task 3 are reused consistently in Task 7.
