# Lucky Wheel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the lucky wheel event with admin controls, spin tickets, generated one-use coupons, and shop UI.

**Architecture:** Store event config in the existing `ShopConfig` singleton, ticket counters on `User`, and one-use coupon state in a new `GeneratedCoupon` collection. Keep all prize selection and coupon validation authoritative in backend APIs; the frontend only displays state and sends user actions.

**Tech Stack:** Express, Mongoose, Node test runner, Next.js 16, React 19.

---

### Task 1: Lucky Wheel Backend Utilities

**Files:**
- Create: `api/models/GeneratedCoupon.js`
- Create: `api/utils/luckyWheel.js`
- Create: `api/tests/luckyWheel.test.js`
- Modify: `api/models/ShopConfig.js`
- Modify: `api/models/User.js`

- [ ] Write failing tests for normalizing slices, generating `NOSMARKET-XXXXXXXXXX` codes, and validating empty vs discount prizes.
- [ ] Run `node --test tests/luckyWheel.test.js` and confirm failure because utility/model code is missing.
- [ ] Implement `GeneratedCoupon`, `normalizeWheelConfig`, `pickWheelSlice`, and `buildGeneratedCouponCode`.
- [ ] Add `luckyWheel` defaults to `ShopConfig` and ticket fields to `User`.
- [ ] Re-run `node --test tests/luckyWheel.test.js`.

### Task 2: Coupon Validation Integration

**Files:**
- Modify: `api/routes/shopRoutes.js`
- Modify: `api/tests/luckyWheel.test.js`

- [ ] Write failing tests for generated coupon lookup semantics in `validateGeneratedCoupon`.
- [ ] Add generated coupon support to checkout coupon validation.
- [ ] Mark generated coupon used after successful order creation.
- [ ] Re-run backend tests.

### Task 3: Public and Admin APIs

**Files:**
- Modify: `api/routes/shopRoutes.js`
- Modify: `web/app/api/shop/*`

- [ ] Add public `GET /api/shop/lucky-wheel`.
- [ ] Add authenticated `POST /api/shop/lucky-wheel/spin`.
- [ ] Add owner `GET/PUT /api/shop/owner/lucky-wheel`.
- [ ] Add owner `POST /api/shop/owner/linked-users/:discordId/lucky-wheel-ticket`.
- [ ] Add Next proxy routes for those APIs.

### Task 4: Admin UI

**Files:**
- Modify: `web/app/admin/page.tsx`

- [ ] Add Lucky Wheel admin state and fetch/save functions.
- [ ] Add controls for enabled, title, message, and slice list.
- [ ] Add grant-spin button to linked users.
- [ ] Show ticket counts in linked users.

### Task 5: Shop UI

**Files:**
- Modify: `web/app/shop/page.tsx`

- [ ] Load wheel config with shop data.
- [ ] Show popup once per device when enabled.
- [ ] Add wheel section when enabled with ticket count, spin button, result, and copy code.
- [ ] Refresh wheel state after login and after spin.

### Task 6: Verification

**Files:**
- Check: `api`
- Check: `web`

- [ ] Run `npm test` in `api`.
- [ ] Run `npm run lint` in `web`.
- [ ] Run `npm run build` in `web`.
- [ ] Smoke test `/shop` and `/admin` in browser.
