# Discord Link + Ticket Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Discord account linking and Discord ticket creation to the current shop checkout flow while keeping the existing Vietnamese top-up flow, Sepay bot, card bot, theme, colors, layout, and animations unchanged.

**Architecture:** Keep the current React + Vite frontend and Express + SQLite backend as the system of record. Add a thin Discord module for OAuth linking and ticket channel creation, then gate checkout so a user who has not linked Discord is prompted to link before the order is finalized. After the order is created successfully, the backend creates the Discord ticket and stores the ticket metadata on the order.

**Tech Stack:** React 19 + TypeScript + Vite, Express 5 + better-sqlite3, Discord OAuth2 + Discord REST API, existing `server/index.cjs`, `server/db.cjs`, `src/ShopApp.tsx`, `src/api.ts`, `src/types.ts`, `src/shop.css`.

---

### Task 1: Add Discord data model and helper primitives

**Files:**
- Modify: `server/db.cjs`
- Create: `server/discord.cjs`
- Modify: `src/types.ts`
- Create: `tests/discord-module.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

process.env.DATABASE_PATH = path.join(__dirname, '.tmp-discord-module.sqlite');
const { db } = require('../server/db.cjs');
const { buildDiscordAuthUrl, buildDiscordTicketChannelName } = require('../server/discord.cjs');

test('users and orders expose discord link/ticket columns', () => {
  const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  const orderCols = db.prepare('PRAGMA table_info(orders)').all().map((c) => c.name);
  assert.equal(userCols.includes('discord_id'), true);
  assert.equal(userCols.includes('discord_username'), true);
  assert.equal(userCols.includes('discord_linked_at'), true);
  assert.equal(orderCols.includes('discord_ticket_status'), true);
  assert.equal(orderCols.includes('discord_ticket_channel_id'), true);
  assert.equal(orderCols.includes('discord_ticket_url'), true);
});

test('discord helpers build stable auth and ticket values', () => {
  const authUrl = buildDiscordAuthUrl({
    clientId: '123',
    redirectUri: 'https://example.com/api/discord/link/callback',
    state: 'order-9001',
  });
  assert.match(authUrl, /discord\.com\/oauth2\/authorize/);
  assert.match(authUrl, /client_id=123/);
  assert.match(authUrl, /state=order-9001/);

  assert.equal(buildDiscordTicketChannelName('SP1234', 'Nguyen Van A'), 'ticket-sp1234-nguyen-van-a');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/discord-module.test.cjs`
Expected: fail because the new Discord columns and helper module do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add Discord columns in `server/db.cjs` for user linkage and order ticket metadata, then implement `server/discord.cjs` with:

```js
module.exports = {
  buildDiscordAuthUrl,
  exchangeDiscordCode,
  fetchDiscordIdentity,
  buildDiscordTicketChannelName,
  createDiscordTicketChannel,
};
```

Update `src/types.ts` so the frontend can read the linked Discord identity and ticket fields:

```ts
export type User = {
  // existing fields...
  discord_id?: string
  discord_username?: string
  discord_linked_at?: string
}

export type Order = {
  // existing fields...
  discord_ticket_status?: string
  discord_ticket_channel_id?: string
  discord_ticket_url?: string
  discord_ticket_error?: string
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/discord-module.test.cjs`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add server/db.cjs server/discord.cjs src/types.ts tests/discord-module.test.cjs
git commit -m "feat: add discord data and helper primitives"
```

### Task 2: Gate checkout on Discord link and create Discord tickets after order creation

**Files:**
- Modify: `server/index.cjs`
- Modify: `server/discord.cjs`
- Create: `tests/discord-checkout.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
const assert = require('node:assert/strict');
const test = require('node:test');
const { shouldRequireDiscordLink, buildDiscordTicketPayload } = require('../server/discord.cjs');

test('checkout requires discord link when user has no linked discord id', () => {
  assert.equal(shouldRequireDiscordLink({ discord_id: '', discord_username: '' }), true);
  assert.equal(shouldRequireDiscordLink({ discord_id: '1234567890', discord_username: 'Nos User' }), false);
});

test('ticket payload includes order and user identifiers', () => {
  const payload = buildDiscordTicketPayload({
    orderCode: 'SPABC123',
    orderId: 42,
    username: 'demo',
    discordId: '111222333',
    totalAmount: 250000,
  });
  assert.equal(payload.channelName.startsWith('ticket-spabc123-'), true);
  assert.equal(payload.topic.includes('SPABC123'), true);
  assert.equal(payload.meta.orderId, 42);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/discord-checkout.test.cjs`
Expected: fail because checkout gate and ticket payload helpers do not exist yet.

- [ ] **Step 3: Write minimal implementation**

In `server/index.cjs`, keep the existing top-up routes untouched and only change the purchase branch:

```js
if (!req.user.discord_id) {
  return res.status(409).json({
    code: 'DISCORD_LINK_REQUIRED',
    message: 'Vui lòng liên kết Discord trước khi hoàn tất đơn.',
  });
}
```

After a successful `/api/orders/buy`, call the Discord ticket helper and persist:

```js
UPDATE orders
SET discord_ticket_status = ?, discord_ticket_channel_id = ?, discord_ticket_url = ?, discord_ticket_error = ?, updated_at = CURRENT_TIMESTAMP
```

Use the helper in `server/discord.cjs` to create the channel with the bot token from env, then store the returned channel id and URL on the order.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/discord-checkout.test.cjs`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add server/index.cjs server/discord.cjs tests/discord-checkout.test.cjs
git commit -m "feat: gate checkout behind discord link"
```

### Task 3: Add Discord link UI without changing the existing theme

**Files:**
- Modify: `src/ShopApp.tsx`
- Modify: `src/types.ts`
- Modify: `src/shop.css`

- [ ] **Step 1: Write the failing test**

There is no browser test harness in this repo, so use the TypeScript build as the failing check. Add the new checkout/link state and expect `npm run build` to fail until the new fields and flow are wired.

Run: `npm run build`
Expected: TypeScript/build failure because the checkout flow does not yet know how to handle `DISCORD_LINK_REQUIRED` or resume the pending checkout.

- [ ] **Step 2: Run the failing build check**

Run: `npm run build`
Expected: fail.

- [ ] **Step 3: Write minimal implementation**

Keep the current panels, colors, spacing, and animation classes. Only add a narrow gate inside the existing cart checkout flow:

```ts
if (error instanceof Error && error.message.includes('DISCORD_LINK_REQUIRED')) {
  window.sessionStorage.setItem('pendingCheckout', JSON.stringify({ items, robloxUsername, customerNote }));
  setDiscordLinkModalOpen(true);
  return;
}
```

Add a small Discord-link modal inside `ShopApp.tsx` that:
- explains the user must link Discord before the order finalizes
- opens the backend Discord OAuth URL
- resumes the stored checkout after the callback returns
- keeps the current visual system intact by reusing the same panel/button classes

After order creation succeeds, route the user to the existing order detail/ticket view and show the Discord ticket URL or ticket status from the order payload.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/ShopApp.tsx src/types.ts src/shop.css
git commit -m "feat: add discord link checkout flow"
```

### Task 4: Document the new module and verify the full flow

**Files:**
- Modify: `README.md`
- Modify: `DEPLOYMENT.md`
- Create: `server/.env.example`

- [ ] **Step 1: Write the failing test**

This task is documentation and deployment guidance, so the verification is a full repo smoke check instead of a code test.

Run: `npm test`
Run: `npm run build`
Expected: both pass after the module work is complete.

- [ ] **Step 2: Run the smoke checks**

Run: `npm test`
Run: `npm run build`
Expected: pass.

- [ ] **Step 3: Write minimal implementation**

Document the new env values and flow:

```text
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
DISCORD_TICKET_CATEGORY_ID=
DISCORD_REDIRECT_URI=
```

Describe the user journey in plain Vietnamese:
1. Nạp tiền bằng hệ thống Sepay/card hiện tại.
2. Mua item bằng số dư.
3. Checkout xong thì nếu chưa link Discord, web yêu cầu liên kết.
4. Sau khi link thành công, backend tạo ticket Discord nhận hàng.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Run: `npm run build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add README.md DEPLOYMENT.md server/.env.example
git commit -m "docs: describe discord link and ticket flow"
```

## Coverage check

- Existing Vietnamese top-up flow stays intact because all deposit routes, SePay worker logic, and card worker logic remain untouched.
- Discord linking is isolated to new helper code and a checkout gate, so the current theme, colors, and animation classes do not need a redesign.
- Ticket creation happens only after order creation, which keeps the current balance deduction and inventory logic unchanged.
- The plan is scoped to one module and one user journey; it does not fold in PayPal, LTC, Lucky Wheel, referral, or other web-tây systems.
