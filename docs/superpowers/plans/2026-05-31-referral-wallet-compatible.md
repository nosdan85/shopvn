# Referral Wallet-Compatible Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real referral system that rewards the referrer with 50% of the referred user's first completed order, without changing the current wallet-only checkout and Discord ticket flow.

**Architecture:** Add backward-compatible SQLite fields and a dedicated referral helper module, then wire referral apply/read endpoints and hook reward/reversal logic into the existing order-status lifecycle. Keep buyer-facing referral state separate from payment math and surface it in compat profile/admin views.

**Tech Stack:** Express 5, better-sqlite3, Node test runner, React 19, TypeScript, existing compat frontend/admin shell

---

## File Structure Map

### Backend schema and helpers

- Modify: `server/db.cjs`
- Create: `server/referrals.cjs`
- Modify: `server/index.cjs`

### Frontend integration

- Modify: `src/types.ts`
- Create: `src/features/compat/api/referrals.ts`
- Modify: `src/features/profile/pages/CompatProfilePage.tsx`
- Modify: `src/features/admin/pages/CompatAdminDashboardPage.tsx`
- Modify: `src/shop.css`

### Tests

- Create: `tests/referral-module.test.cjs`
- Modify: `tests/discord-checkout.test.cjs`

---

### Task 1: Add referral schema migration and helper module

**Files:**
- Modify: `server/db.cjs`
- Create: `server/referrals.cjs`
- Create: `tests/referral-module.test.cjs`

- [ ] **Step 1: Write the failing helper tests**

Create `tests/referral-module.test.cjs`:

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildReferralCode,
  computeReferralRewardAmount,
  canApplyReferralForUser,
  shouldRewardReferralOnCompletedOrder,
} = require('../server/referrals.cjs')

test('buildReferralCode returns uppercase code using username stem', () => {
  const code = buildReferralCode('tester-name', () => 'AB12')
  assert.equal(code, 'TESTERAB12')
})

test('computeReferralRewardAmount returns 50 percent rounded integer', () => {
  assert.equal(computeReferralRewardAmount(200000, 50), 100000)
  assert.equal(computeReferralRewardAmount(199999, 50), 100000)
})

test('canApplyReferralForUser rejects self-referral and users with orders', () => {
  assert.equal(canApplyReferralForUser({
    currentUserId: 5,
    referrerUserId: 5,
    hasExistingOrders: false,
    alreadyReferred: false,
  }).ok, false)

  assert.equal(canApplyReferralForUser({
    currentUserId: 5,
    referrerUserId: 9,
    hasExistingOrders: true,
    alreadyReferred: false,
  }).ok, false)
})

test('shouldRewardReferralOnCompletedOrder only rewards first completed order once', () => {
  assert.equal(shouldRewardReferralOnCompletedOrder({
    nextStatus: 'completed',
    previousStatus: 'processing',
    hasReferrer: true,
    completedOrdersBeforeUpdate: 0,
    rewardExistsForOrder: false,
  }), true)

  assert.equal(shouldRewardReferralOnCompletedOrder({
    nextStatus: 'completed',
    previousStatus: 'completed',
    hasReferrer: true,
    completedOrdersBeforeUpdate: 1,
    rewardExistsForOrder: true,
  }), false)
})
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `node --test tests/referral-module.test.cjs`
Expected: FAIL because `server/referrals.cjs` does not exist yet.

- [ ] **Step 3: Write minimal referral helper implementation**

Create `server/referrals.cjs`:

```js
function normalizeReferralStem(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function buildReferralCode(username, randomSuffixFactory = defaultRandomSuffix) {
  const stem = normalizeReferralStem(username).slice(0, 6) || 'USER'
  return `${stem}${String(randomSuffixFactory() || '').toUpperCase()}`
}

function defaultRandomSuffix() {
  return Math.random().toString(36).slice(2, 6).toUpperCase()
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

module.exports = {
  buildReferralCode,
  computeReferralRewardAmount,
  canApplyReferralForUser,
  shouldRewardReferralOnCompletedOrder,
}
```

Update `server/db.cjs` migration section to add additive fields and table:

```js
if (!userColumns.includes('referral_code')) {
  originalPrepare('ALTER TABLE users ADD COLUMN referral_code TEXT').run()
}
if (!userColumns.includes('referred_by_user_id')) {
  originalPrepare('ALTER TABLE users ADD COLUMN referred_by_user_id INTEGER REFERENCES users(id)').run()
}
if (!userColumns.includes('referral_linked_at')) {
  originalPrepare('ALTER TABLE users ADD COLUMN referral_linked_at TEXT').run()
}
originalPrepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)').run()
originalPrepare('CREATE INDEX IF NOT EXISTS idx_users_referred_by_user_id ON users(referred_by_user_id)').run()
originalPrepare(`
  CREATE TABLE IF NOT EXISTS referral_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_user_id INTEGER NOT NULL,
    referred_user_id INTEGER NOT NULL,
    source_order_id INTEGER NOT NULL UNIQUE,
    reward_percent INTEGER NOT NULL,
    reward_amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TEXT,
    reversed_at TEXT,
    reversal_note TEXT,
    FOREIGN KEY (referrer_user_id) REFERENCES users(id),
    FOREIGN KEY (referred_user_id) REFERENCES users(id),
    FOREIGN KEY (source_order_id) REFERENCES orders(id)
  )
`).run()
originalPrepare('CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_user_id ON referral_rewards(referrer_user_id)').run()
originalPrepare('CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred_user_id ON referral_rewards(referred_user_id)').run()
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run: `node --test tests/referral-module.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/db.cjs server/referrals.cjs tests/referral-module.test.cjs
git commit -m "feat: add referral schema and helper module"
```

### Task 2: Add referral registration, apply, and summary APIs

**Files:**
- Modify: `server/index.cjs`
- Modify: `tests/referral-module.test.cjs`

- [ ] **Step 1: Write failing API-focused tests into the same referral test file**

Append to `tests/referral-module.test.cjs`:

```js
const {
  mapReferralSummary,
} = require('../server/referrals.cjs')

test('mapReferralSummary returns profile-safe referral payload', () => {
  const summary = mapReferralSummary({
    user: { id: 5, referral_code: 'TESTAB12', referred_by_user_id: 9 },
    referrer: { id: 9, username: 'owner' },
    rewards: [{ id: 1, reward_amount: 100000, status: 'paid', created_at: '2026-05-31 10:00:00' }],
  })

  assert.equal(summary.referralCode, 'TESTAB12')
  assert.equal(summary.referredBy.username, 'owner')
  assert.equal(summary.stats.totalEarned, 100000)
})
```

- [ ] **Step 2: Run the referral test file to verify it fails**

Run: `node --test tests/referral-module.test.cjs`
Expected: FAIL because `mapReferralSummary` is not implemented yet.

- [ ] **Step 3: Add summary mapper and wire registration/apply/read routes**

Extend `server/referrals.cjs`:

```js
function mapReferralSummary({ user, referrer, rewards }) {
  const rows = Array.isArray(rewards) ? rewards : []
  return {
    referralCode: user?.referral_code || '',
    referredBy: referrer ? { id: referrer.id, username: referrer.username } : null,
    stats: {
      totalEarned: rows.reduce((sum, row) => sum + Number(row.reward_amount || 0), 0),
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
```

Update registration route in `server/index.cjs`:

```js
let referralCode = ''
do {
  referralCode = buildReferralCode(username)
} while (db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referralCode))

const result = db.prepare(`
  INSERT INTO users (username, email, password_hash, role, status, referral_code)
  VALUES (?, ?, ?, 'user', 'active', ?)
`).run(username, email, passwordHash, referralCode)
```

Add routes in `server/index.cjs`:

```js
app.get('/api/referrals/me', requireAuth, (req, res) => {
  const referrer = req.user.referred_by_user_id
    ? db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.user.referred_by_user_id)
    : null
  const rewards = db.prepare(`
    SELECT * FROM referral_rewards
    WHERE referrer_user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id)
  res.json(mapReferralSummary({ user: req.user, referrer, rewards }))
})

app.post('/api/referrals/apply', requireAuth, (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase()
  if (!code) {
    res.status(400).json({ message: 'Vui long nhap referral code.' })
    return
  }
  const referrer = db.prepare('SELECT id, username FROM users WHERE referral_code = ?').get(code)
  const existingOrder = db.prepare('SELECT id FROM orders WHERE user_id = ? LIMIT 1').get(req.user.id)
  const validation = canApplyReferralForUser({
    currentUserId: req.user.id,
    referrerUserId: referrer?.id || 0,
    hasExistingOrders: Boolean(existingOrder),
    alreadyReferred: Boolean(req.user.referred_by_user_id),
  })
  if (!validation.ok) {
    res.status(400).json({ code: validation.code, message: 'Khong the ap dung referral code nay.' })
    return
  }
  db.prepare('UPDATE users SET referred_by_user_id = ?, referral_linked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(referrer.id, req.user.id)
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json(mapReferralSummary({ user: updatedUser, referrer, rewards: [] }))
})
```

Remember to add the new imports at top of `server/index.cjs`:

```js
const {
  buildReferralCode,
  canApplyReferralForUser,
  computeReferralRewardAmount,
  mapReferralSummary,
  shouldRewardReferralOnCompletedOrder,
} = require('./referrals.cjs')
```

- [ ] **Step 4: Run the referral tests to verify they pass**

Run: `node --test tests/referral-module.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/index.cjs server/referrals.cjs tests/referral-module.test.cjs
git commit -m "feat: add referral apply and summary api"
```

### Task 3: Add referral reward and reversal logic to order status updates

**Files:**
- Modify: `server/index.cjs`
- Modify: `tests/referral-module.test.cjs`

- [ ] **Step 1: Write failing reward-lifecycle tests**

Append:

```js
const {
  shouldReverseReferralReward,
} = require('../server/referrals.cjs')

test('shouldReverseReferralReward only reverses a paid reward on refunded status', () => {
  assert.equal(shouldReverseReferralReward({
    nextStatus: 'refunded',
    previousStatus: 'completed',
    rewardStatus: 'paid',
  }), true)

  assert.equal(shouldReverseReferralReward({
    nextStatus: 'cancelled',
    previousStatus: 'completed',
    rewardStatus: 'paid',
  }), false)
})
```

- [ ] **Step 2: Run the referral tests to verify they fail**

Run: `node --test tests/referral-module.test.cjs`
Expected: FAIL because `shouldReverseReferralReward` is not implemented yet.

- [ ] **Step 3: Implement reward/reversal helper and wire order status flow**

Extend `server/referrals.cjs`:

```js
function shouldReverseReferralReward({ nextStatus, previousStatus, rewardStatus }) {
  return nextStatus === 'refunded' && previousStatus !== 'refunded' && rewardStatus === 'paid'
}
```

Inside `/api/admin/orders/:id/status` transaction in `server/index.cjs`, after loading `order`, add:

```js
const buyer = db.prepare('SELECT * FROM users WHERE id = ?').get(order.user_id)
const completedOrdersBeforeUpdate = db.prepare(`
  SELECT COUNT(*) AS count FROM orders
  WHERE user_id = ? AND status = 'completed' AND id != ?
`).get(order.user_id, order.id).count
const existingReferralReward = db.prepare('SELECT * FROM referral_rewards WHERE source_order_id = ?').get(order.id)
```

In the `status === 'completed'` branch, after existing notifications:

```js
if (shouldRewardReferralOnCompletedOrder({
  nextStatus: status,
  previousStatus: order.status,
  hasReferrer: Boolean(buyer.referred_by_user_id),
  completedOrdersBeforeUpdate,
  rewardExistsForOrder: Boolean(existingReferralReward),
})) {
  const referrer = db.prepare('SELECT * FROM users WHERE id = ?').get(buyer.referred_by_user_id)
  const rewardPercent = 50
  const rewardAmount = computeReferralRewardAmount(order.total_amount, rewardPercent)
  const before = referrer.balance
  const after = before + rewardAmount
  db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(after, referrer.id)
  createBalanceLog({
    userId: referrer.id,
    type: 'referral_reward',
    amount: rewardAmount,
    before,
    after,
    referenceId: order.id,
    referenceType: 'order',
    note: `Thuong referral tu don ${order.order_code}`,
    createdBy: req.user.id,
  })
  db.prepare(`
    INSERT INTO referral_rewards (referrer_user_id, referred_user_id, source_order_id, reward_percent, reward_amount, status, paid_at)
    VALUES (?, ?, ?, ?, ?, 'paid', CURRENT_TIMESTAMP)
  `).run(referrer.id, buyer.id, order.id, rewardPercent, rewardAmount)
  notifyUser(referrer.id, 'Ban nhan thuong referral', `Don ${order.order_code} da cong ${money(rewardAmount)} vao vi.`, 'balance')
}
```

In the `status === 'refunded'` branch, after refunding the buyer:

```js
if (shouldReverseReferralReward({
  nextStatus: status,
  previousStatus: order.status,
  rewardStatus: existingReferralReward?.status,
})) {
  const referrer = db.prepare('SELECT * FROM users WHERE id = ?').get(existingReferralReward.referrer_user_id)
  if (referrer.balance >= existingReferralReward.reward_amount) {
    const before = referrer.balance
    const after = before - existingReferralReward.reward_amount
    db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(after, referrer.id)
    createBalanceLog({
      userId: referrer.id,
      type: 'referral_reversal',
      amount: -Number(existingReferralReward.reward_amount || 0),
      before,
      after,
      referenceId: order.id,
      referenceType: 'order',
      note: `Hoan nguoc referral do refund don ${order.order_code}`,
      createdBy: req.user.id,
    })
    db.prepare(`
      UPDATE referral_rewards
      SET status = 'reversed', reversed_at = CURRENT_TIMESTAMP, reversal_note = ?
      WHERE id = ?
    `).run(`Refunded order ${order.order_code}`, existingReferralReward.id)
  } else {
    db.prepare(`
      UPDATE referral_rewards
      SET status = 'reversal_pending', reversal_note = ?
      WHERE id = ?
    `).run(`Insufficient balance while refunding order ${order.order_code}`, existingReferralReward.id)
  }
}
```

- [ ] **Step 4: Run the referral tests to verify they pass**

Run: `node --test tests/referral-module.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/index.cjs server/referrals.cjs tests/referral-module.test.cjs
git commit -m "feat: add referral reward and reversal lifecycle"
```

### Task 4: Add referral profile/admin frontend surfaces

**Files:**
- Modify: `src/types.ts`
- Create: `src/features/compat/api/referrals.ts`
- Modify: `src/features/profile/pages/CompatProfilePage.tsx`
- Modify: `src/features/admin/pages/CompatAdminDashboardPage.tsx`
- Modify: `src/shop.css`

- [ ] **Step 1: Write the failing build expectation**

Modify `src/features/profile/pages/CompatProfilePage.tsx` to import a not-yet-existing referral API:

```ts
import { fetchMyReferralSummary } from '../../compat/api/referrals'
```

- [ ] **Step 2: Run build to verify it fails**

Run: `npm run build`
Expected: FAIL because `../../compat/api/referrals` does not exist yet.

- [ ] **Step 3: Add minimal referral types and UI**

Add to `src/types.ts`:

```ts
export type ReferralReward = {
  id: number
  rewardAmount: number
  rewardPercent: number
  status: string
  createdAt: string
  paidAt?: string
  sourceOrderId: number
}

export type ReferralSummary = {
  referralCode: string
  referredBy: null | { id: number; username: string }
  stats: {
    totalEarned: number
    totalRewards: number
    pendingReversals: number
  }
  rewards: ReferralReward[]
}
```

Create `src/features/compat/api/referrals.ts`:

```ts
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
```

Update `CompatProfilePage.tsx` to load and render:

```tsx
const [referral, setReferral] = useState<ReferralSummary | null>(null)
const [referralCodeInput, setReferralCodeInput] = useState('')
const [applyingReferral, setApplyingReferral] = useState(false)
```

Add effect:

```tsx
fetchMyReferralSummary().then(setReferral).catch(() => setReferral(null))
```

Add action:

```tsx
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
```

Render profile section:

```tsx
{referral && (
  <div className="compat-referral-card">
    <p>Referral code cua ban: <strong>{referral.referralCode || 'Dang tao...'}</strong></p>
    <p>Tong thuong: <strong>{money(referral.stats.totalEarned)}</strong></p>
    {referral.referredBy ? <p>Ban duoc gioi thieu boi <strong>{referral.referredBy.username}</strong></p> : (
      <div className="compat-action-row">
        <input value={referralCodeInput} onChange={(event) => setReferralCodeInput(event.target.value)} placeholder="Nhap referral code" />
        <button className="ghost" type="button" disabled={applyingReferral || !referralCodeInput.trim()} onClick={() => void submitReferralCode()}>
          {applyingReferral ? 'Dang ap dung...' : 'Ap dung'}
        </button>
      </div>
    )}
  </div>
)}
```

Update compat admin modules section to show referral totals from dashboard once backend aggregate is extended:

```tsx
<article className="stat-card"><span>Referral rewards</span><strong>{dashboard?.referralStats.totalRewards || 0}</strong></article>
<article className="stat-card"><span>Referral paid</span><strong>{money(dashboard?.referralStats.totalPaid || 0)}</strong></article>
```

Add scoped CSS in `src/shop.css`:

```css
.compat-referral-card {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid rgba(88, 101, 242, 0.12);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
}
```

- [ ] **Step 4: Run build to verify it passes**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/features/compat/api/referrals.ts src/features/profile/pages/CompatProfilePage.tsx src/features/admin/pages/CompatAdminDashboardPage.tsx src/shop.css
git commit -m "feat: add referral profile and admin surfaces"
```

### Task 5: Extend admin aggregate and run full verification

**Files:**
- Modify: `server/compat/admin.cjs`
- Modify: `server/index.cjs`
- Modify: `src/features/compat/api/admin.ts`
- Modify: `src/features/admin/pages/CompatAdminDashboardPage.tsx`
- Modify: `tests/referral-module.test.cjs`

- [ ] **Step 1: Write the failing aggregate test**

Append to `tests/referral-module.test.cjs`:

```js
const { buildCompatAdminDashboard } = require('../server/compat/admin.cjs')

test('compat admin dashboard can expose referral stats', () => {
  const dashboard = buildCompatAdminDashboard({
    users: 1,
    orders: 1,
    revenue: 1000,
    pendingDeposits: 0,
    recentOrders: [],
    referralStats: { totalRewards: 3, totalPaid: 150000, pendingReversals: 1 },
  })
  assert.equal(dashboard.referralStats.totalPaid, 150000)
})
```

- [ ] **Step 2: Run the referral test file to verify it fails**

Run: `node --test tests/referral-module.test.cjs`
Expected: FAIL because compat admin builder does not expose `referralStats` yet.

- [ ] **Step 3: Extend admin aggregate and frontend typing**

Update `server/compat/admin.cjs`:

```js
function buildCompatAdminDashboard({ users, orders, revenue, pendingDeposits, recentOrders, topProducts = [], proofStats = {}, moduleConfig = {}, referralStats = {} }) {
  return {
    // existing fields,
    referralStats: {
      totalRewards: Number(referralStats.totalRewards || 0),
      totalPaid: Number(referralStats.totalPaid || 0),
      pendingReversals: Number(referralStats.pendingReversals || 0),
    },
  }
}
```

Update `/api/compat/admin/dashboard` in `server/index.cjs`:

```js
const referralRows = db.prepare('SELECT * FROM referral_rewards').all()
const referralStats = {
  totalRewards: referralRows.length,
  totalPaid: referralRows.filter((row) => row.status === 'paid').reduce((sum, row) => sum + Number(row.reward_amount || 0), 0),
  pendingReversals: referralRows.filter((row) => row.status === 'reversal_pending').length,
}
```

Then pass `referralStats` into `buildCompatAdminDashboard(...)`.

Update `src/features/compat/api/admin.ts` type with:

```ts
  referralStats: {
    totalRewards: number
    totalPaid: number
    pendingReversals: number
  }
```

- [ ] **Step 4: Run full verification**

Run: `node --test tests/referral-module.test.cjs`
Expected: PASS.

Run: `npm test`
Expected: PASS, 0 failures.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/compat/admin.cjs server/index.cjs src/features/compat/api/admin.ts src/features/admin/pages/CompatAdminDashboardPage.tsx tests/referral-module.test.cjs
git commit -m "feat: expose referral metrics in compat admin"
```
