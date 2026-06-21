# Order History And Vouch Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore order history for website checkouts and make `!` image vouches reliably publish the requested Discord and privacy-safe website content.

**Architecture:** Add small pure helpers for ownership queries, ticket-channel lookup, and public proof serialization so each regression can be tested without MongoDB or Discord. Keep the active production bot in `api/bot.js`; preserve existing records by querying legacy orders through the linked Discord ID while new orders store the website account ID.

**Tech Stack:** Node.js, Express, Mongoose, discord.js, Next.js, Node test runner.

---

### Task 1: Restore Website Order Ownership

**Files:**
- Create: `api/utils/orderOwnership.js`
- Create: `api/tests/orderOwnership.test.js`
- Modify: `api/routes/shopRoutes.js`
- Modify: `api/routes/donHangRoutes.js`

- [ ] Write failing tests proving a website account query includes both `userId` and its linked `discordId`, and excludes an empty Discord ID.
- [ ] Run `npm test -- tests/orderOwnership.test.js` from `api` and verify the new helper is missing.
- [ ] Implement `buildOwnedOrdersQuery({ userId, discordId })`.
- [ ] Persist `userId`, account name, Discord display name, and Discord link flags when `/api/shop/checkout` creates an order.
- [ ] Use the ownership query for `/api/don-hang/lich-su` so existing Discord-linked orders remain visible.
- [ ] Re-run the focused test and verify it passes.

### Task 2: Make Ticket Lookup Match Stored Orders

**Files:**
- Create: `api/utils/ticketOrderLookup.js`
- Create: `api/tests/ticketOrderLookup.test.js`
- Modify: `api/bot.js`

- [ ] Write failing tests proving channel IDs are preferred and names such as `order_123`, `order_nm_123`, and `order_dh000123` resolve to stored order IDs.
- [ ] Run the focused test and verify it fails because the helper is absent.
- [ ] Implement normalized channel-name candidates and query construction.
- [ ] Update the active bot lookup to use the helper, while retaining direct `channelId` lookup.
- [ ] Re-run the focused test and verify it passes.

### Task 3: Enforce Public Proof Privacy

**Files:**
- Create: `api/utils/publicProof.js`
- Create: `api/tests/publicProof.test.js`
- Modify: `api/routes/shopRoutes.js`
- Modify: `web/app/proofs/page.tsx`
- Modify: `web/tests/proofsPrivacy.test.js`

- [ ] Write failing API and source tests proving the public proof payload contains images, product names, and quantities, but no Discord identity or price fields.
- [ ] Run the focused API and web tests and verify the price assertions fail.
- [ ] Implement public proof serialization that returns only `name`, `packQuantity`, `quantity`, and `deliveredLabel` for items.
- [ ] Remove price and total rendering from the public proof page while keeping admin editing controls functional.
- [ ] Re-run focused tests and verify they pass.

### Task 4: Verify The Complete Change

**Files:**
- Modify only if verification exposes a regression.

- [ ] Run `npm test` from `api`.
- [ ] Run `npm test` and `npm run build` from `web`.
- [ ] Inspect `git diff --check` and `git diff` to ensure only scoped changes are present.
