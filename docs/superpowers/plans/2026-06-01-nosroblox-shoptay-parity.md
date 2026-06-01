# NosRoblox Shoptay Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa `NosRoblox` đạt parity tính năng cốt lõi với tài liệu `shoptay` trên stack hiện tại, đồng thời loại bỏ hoàn toàn lịch giao hàng và các payment method PayPal/LTC/Cash App/Square.

**Architecture:** Giữ `Vite + React + Express + SQLite + discord.js`, mở rộng các module hiện có thay vì port kiến trúc `shoptay`. Frontend sẽ hợp nhất route/UI dưới design system `NosRoblox`, backend sẽ chuẩn hóa coupon/referral/order/proof/admin flow, và bot sẽ được nâng lên để xử lý ticket lifecycle cùng reward flow.

**Tech Stack:** React, React Router, TypeScript, Express, SQLite (`better-sqlite3`), Node.js, Discord.js, Node test runner

---

### Task 1: Freeze Scope and Remove Unsupported Features

**Files:**
- Modify: `C:\Users\shhshs\Documents\shopvn-main\docs\superpowers\specs\2026-06-01-nosroblox-shoptay-parity-design.md`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\tests\nosroblox-copy.test.cjs`
- Test: `C:\Users\shhshs\Documents\shopvn-main\tests\nosroblox-copy.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
test('public copy no longer exposes removed payment and scheduling features', () => {
  const storefrontSource = fs.readFileSync(path.join(root, 'src/features/storefront/pages/ShopLandingPage.tsx'), 'utf8')
  const legacySource = fs.readFileSync(path.join(root, 'src/ShopApp.tsx'), 'utf8')
  assert.doesNotMatch(storefrontSource, /paypal|ltc|cash app|square|delivery slot|delivery window/i)
  assert.doesNotMatch(legacySource, /paypal|ltc|cash app|square|delivery slot|delivery window/i)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/nosroblox-copy.test.cjs`

Expected: FAIL because `ShopApp.tsx` and related public flows still contain old copy or missing removal assertions.

- [ ] **Step 3: Extend the existing copy-regression test**

```js
assert.doesNotMatch(storefrontSource, /paypal|ltc|cash app|square|delivery slot|delivery window/i)
assert.doesNotMatch(legacySource, /paypal|ltc|cash app|square|delivery slot|delivery window/i)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/nosroblox-copy.test.cjs`

Expected: PASS after all public copy has been cleaned in later tasks.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-06-01-nosroblox-shoptay-parity-design.md docs/superpowers/plans/2026-06-01-nosroblox-shoptay-parity.md tests/nosroblox-copy.test.cjs
git commit -m "docs: define NosRoblox shoptay parity scope"
```

### Task 2: Unify Router and Route-Backed Page Navigation

**Files:**
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\app\AppRouter.tsx`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\app\routes.ts`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\ShopApp.tsx`
- Test: `C:\Users\shhshs\Documents\shopvn-main\tests\compat-route-parity.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
test('legacy ShopApp syncs internal page changes back to router URLs', () => {
  assert.match(legacyShopSource, /useNavigate/)
  assert.match(legacyShopSource, /routeForPage\(nextPage, id\)/)
  assert.match(legacyShopSource, /navigate\(nextRoute\)/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/compat-route-parity.test.cjs`

Expected: FAIL if `ShopApp` still changes page state without pushing canonical route URLs.

- [ ] **Step 3: Implement route synchronization**

```ts
import { useNavigate } from 'react-router-dom'
import { appRoutes } from './app/routes'

function routeForPage(page: Page, routeId = '') {
  if (page === 'login') return appRoutes.login
  if (page === 'register') return appRoutes.register
  if (page === 'forgot') return appRoutes.forgotPassword
  if (page === 'deposit') return appRoutes.deposit
  if (page === 'deposits') return appRoutes.deposits
  if (page === 'cart') return appRoutes.cart
  if (page === 'orders') return appRoutes.orders
  if (page === 'profile') return appRoutes.profile
  if (page === 'admin') return appRoutes.admin
  return appRoutes.shop
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/compat-route-parity.test.cjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/AppRouter.tsx src/app/routes.ts src/ShopApp.tsx tests/compat-route-parity.test.cjs
git commit -m "feat: sync NosRoblox page flows with canonical routes"
```

### Task 3: Retheme All Legacy User-Facing Screens to NosRoblox

**Files:**
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\nosroblox.css`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\ShopApp.tsx`
- Test: `C:\Users\shhshs\Documents\shopvn-main\tests\nosroblox-copy.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
const nosCssSource = fs.readFileSync(path.join(root, 'src/nosroblox.css'), 'utf8')
assert.match(nosCssSource, /\.app-shell input,/)
assert.match(nosCssSource, /background: rgba\(255, 255, 255, 0\.94\) !important;/)
assert.match(legacySource, /const shopName = 'NosRoblox'/)
assert.match(legacySource, /Tài khoản NosRoblox/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/nosroblox-copy.test.cjs`

Expected: FAIL until the legacy shell is visually aligned and brand text is updated.

- [ ] **Step 3: Implement the retheme**

```css
.app-shell input,
.app-shell textarea,
.app-shell select {
  color: var(--nos-text) !important;
  border: 1px solid rgba(45, 80, 104, 0.18) !important;
  background: rgba(255, 255, 255, 0.94) !important;
}
```

```ts
const shopName = 'NosRoblox'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/nosroblox-copy.test.cjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/nosroblox.css src/ShopApp.tsx tests/nosroblox-copy.test.cjs
git commit -m "feat: retheme legacy NosRoblox flows"
```

### Task 4: Remove Delivery Slots and External Payment Methods from Public Flows

**Files:**
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\ShopApp.tsx`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\features\storefront\pages\ShopLandingPage.tsx`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\server\index.cjs`
- Test: `C:\Users\shhshs\Documents\shopvn-main\tests\nosroblox-copy.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
assert.doesNotMatch(legacySource, /paypal|ltc|cash app|square|delivery slot|delivery window/i)
assert.doesNotMatch(storefrontSource, /paypal|ltc|cash app|square|delivery slot|delivery window/i)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/nosroblox-copy.test.cjs`

Expected: FAIL while old copy or branching logic still exists.

- [ ] **Step 3: Remove unsupported branches**

```ts
// Keep only wallet/deposit + Discord flows in UI copy and buttons
description="Mua bằng số dư ví, theo dõi đơn rõ ràng và nhận hàng qua ticket Discord."
```

```js
// Remove or ignore deprecated payment settings from public config responses
delete publicConfig.paypal
delete publicConfig.ltc
delete publicConfig.square
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/nosroblox-copy.test.cjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ShopApp.tsx src/features/storefront/pages/ShopLandingPage.tsx server/index.cjs tests/nosroblox-copy.test.cjs
git commit -m "refactor: remove unsupported payment and schedule flows"
```

### Task 5: Complete Coupon and Referral Parity

**Files:**
- Modify: `C:\Users\shhshs\Documents\shopvn-main\server\index.cjs`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\server\referrals.cjs`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\features\cart\pages\CompatCartPage.tsx`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\ShopApp.tsx`
- Test: `C:\Users\shhshs\Documents\shopvn-main\tests\referral-module.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
test('checkout can preview and apply referral-linked discounts', () => {
  assert.equal(typeof computeReferralRewardAmount(100000), 'number')
  assert.match(serverSource, /app\.post\('\/api\/referrals\/apply'/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/referral-module.test.cjs`

Expected: FAIL if parity logic or endpoint behavior is incomplete.

- [ ] **Step 3: Implement minimal parity behavior**

```js
app.post('/api/referrals/apply', requireAuth, (req, res) => {
  // validate code, block self-referral, persist linkage
})
```

```ts
// surface referral code, apply action, and discount preview in checkout/profile
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/referral-module.test.cjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/index.cjs server/referrals.cjs src/features/cart/pages/CompatCartPage.tsx src/ShopApp.tsx tests/referral-module.test.cjs
git commit -m "feat: complete NosRoblox referral and coupon parity"
```

### Task 6: Normalize Order, Ticket, and Chat Lifecycle

**Files:**
- Modify: `C:\Users\shhshs\Documents\shopvn-main\server\index.cjs`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\server\discord.cjs`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\ShopApp.tsx`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\types.ts`
- Test: `C:\Users\shhshs\Documents\shopvn-main\tests\discord-checkout.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
test('checkout returns ticket metadata after order creation', () => {
  assert.match(serverSource, /discord_ticket_status/)
  assert.match(serverSource, /createDiscordTicketForOrder/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/discord-checkout.test.cjs`

Expected: FAIL until order/ticket fields and chat state are fully surfaced.

- [ ] **Step 3: Implement ticket-aware order responses**

```js
res.json({
  order: orderWithTicket,
  discord_ticket: ticketResult,
})
```

```ts
{orderDetail.order.discord_ticket_url && <a href={orderDetail.order.discord_ticket_url}>Mở ticket Discord</a>}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/discord-checkout.test.cjs tests/discord-module.test.cjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/index.cjs server/discord.cjs src/ShopApp.tsx src/types.ts tests/discord-checkout.test.cjs tests/discord-module.test.cjs
git commit -m "feat: unify order ticket and chat lifecycle"
```

### Task 7: Restore Proof/Vouch Management on NosRoblox Terms

**Files:**
- Modify: `C:\Users\shhshs\Documents\shopvn-main\server\index.cjs`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\features\proofs\pages\CompatProofsPage.tsx`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\app\AppRouter.tsx`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\ShopApp.tsx`
- Test: `C:\Users\shhshs\Documents\shopvn-main\tests\compat-storefront.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
test('proofs route mounts a NosRoblox-compatible proofs surface when re-enabled', () => {
  assert.match(routerSource, /appRoutes\.proofs/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/compat-storefront.test.cjs`

Expected: FAIL until proof flow is restored with current scope and styling.

- [ ] **Step 3: Reintroduce proof management without reviving removed features**

```js
app.get('/api/compat/proofs', publicCache, (req, res) => {
  // return moderated proof rows
})
```

```tsx
export function CompatProofsPage() {
  // NosRoblox-styled public proof list
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/compat-storefront.test.cjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/index.cjs src/features/proofs/pages/CompatProofsPage.tsx src/app/AppRouter.tsx src/ShopApp.tsx tests/compat-storefront.test.cjs
git commit -m "feat: restore NosRoblox proof and vouch surfaces"
```

### Task 8: Expand Admin to Full Data Control

**Files:**
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\ShopApp.tsx`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\server\index.cjs`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\src\features\admin\pages\CompatAdminDashboardPage.tsx`
- Test: `C:\Users\shhshs\Documents\shopvn-main\tests\compat-admin.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
test('compat admin dashboard returns card totals and recent rows', () => {
  assert.equal(typeof dashboard.cards.orders.value, 'number')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/compat-admin.test.cjs`

Expected: FAIL if admin surface still hides or omits required CRUD areas.

- [ ] **Step 3: Implement admin parity improvements**

```ts
['dashboard', 'games', 'items', 'orders', 'users', 'deposits', 'sepay-bot', 'balance', 'chats', 'reviews', 'settings']
```

```js
app.get('/api/admin/order-chats', requireAdmin, (_req, res) => { ... })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/compat-admin.test.cjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ShopApp.tsx server/index.cjs src/features/admin/pages/CompatAdminDashboardPage.tsx tests/compat-admin.test.cjs
git commit -m "feat: expand admin control surface for NosRoblox parity"
```

### Task 9: Upgrade Discord Bot Command Side Effects

**Files:**
- Modify: `C:\Users\shhshs\Documents\shopvn-main\server\discord-bot.cjs`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\server\discord.cjs`
- Modify: `C:\Users\shhshs\Documents\shopvn-main\server\index.cjs`
- Test: `C:\Users\shhshs\Documents\shopvn-main\tests\discord-module.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
test('discord helpers build stable auth and ticket values', () => {
  assert.equal(buildDiscordTicketChannelName('SP1234', 'Nguyen Van A'), 'ticket-sp1234-nguyen-van-a')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/discord-module.test.cjs`

Expected: FAIL if bot-side helper coverage is incomplete for command-driven lifecycle changes.

- [ ] **Step 3: Implement command-driven order updates**

```js
if (command === 'done') {
  // update order status in DB, mark completed, trigger reward logic, then close channel
}
```

```js
if (command === 'close') {
  // update ticket/order state before deleting channel
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/discord-module.test.cjs tests/discord-checkout.test.cjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/discord-bot.cjs server/discord.cjs server/index.cjs tests/discord-module.test.cjs tests/discord-checkout.test.cjs
git commit -m "feat: align Discord bot commands with order lifecycle"
```

### Task 10: End-to-End Verification Sweep

**Files:**
- Modify: `C:\Users\shhshs\Documents\shopvn-main\TESTING_GUIDE.md` if a local project testing note is needed
- Test: `C:\Users\shhshs\Documents\shopvn-main\tests\*.test.cjs`

- [ ] **Step 1: Run full automated test suite**

Run: `npm test`

Expected: all tests pass

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: successful build with generated `dist/` assets

- [ ] **Step 3: Perform browser QA**

Run:

```text
/shop
/login
/register
/deposit
/cart
/orders
/profile
/admin
```

Expected:

- no black legacy input surfaces
- no route desync
- no removed payment/schedule mentions
- admin login can reach full dashboard
- product modal, cart, deposit, and order chat all work

- [ ] **Step 4: Record residual follow-ups**

```md
- Copy still mentioning old game name
- Admin labels needing polish
- Optional lucky wheel / anti-fraud follow-up
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "test: verify NosRoblox shoptay parity pass"
```

