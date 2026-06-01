# Phase 1 Shop Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved quick shop, coupon, price, and payment proof fixes without building the lucky wheel subsystem.

**Architecture:** Reuse existing shop APIs, coupon validation, and payment proof log utilities. Keep frontend changes local to `web/app/shop/page.tsx` with small helper functions instead of adding a new UI subsystem.

**Tech Stack:** Next.js 16, React 19, Express, Mongoose, Discord.js, Node test runner.

---

### Task 1: Backend Utility Tests

**Files:**
- Modify: `api/tests/paymentProofLog.test.js`
- Modify: `api/utils/paymentProofLog.js`

- [ ] Add tests for formatting non-rounded prices such as `0.99`.
- [ ] Add tests for payment proof payloads that include a Discord file attachment reference.
- [ ] Run `npm test -- paymentProofLog.test.js` in `api` and confirm the new tests fail.
- [ ] Implement minimal payment proof payload support and formatter export.
- [ ] Re-run the tests and confirm they pass.

### Task 2: Existing Coupon Checkout UI

**Files:**
- Modify: `web/app/shop/page.tsx`
- Modify: `web/app/api/shop/checkout/route.ts`
- Create: `web/app/api/shop/coupon/preview/route.ts`

- [ ] Add coupon input state and preview request to the shop page.
- [ ] Include the entered coupon code in checkout requests.
- [ ] Display subtotal, discount, and total when a coupon applies.
- [ ] Proxy coupon preview from Next.js to the backend.

### Task 3: Shop UI Fixes

**Files:**
- Modify: `web/app/shop/page.tsx`

- [ ] Update loading screen copy and animation.
- [ ] Refresh recent purchases with `limit=7`.
- [ ] Add mobile Sailor Piece icon override.
- [ ] Adjust desktop-only product modal and cart dimensions/radius.
- [ ] Replace visible price rendering with the shared money formatter.

### Task 4: Verification

**Files:**
- Check: `api`
- Check: `web`

- [ ] Run `npm test` in `api`.
- [ ] Run `npm run lint` in `web`.
- [ ] Run `npm run build` in `web` if lint/type checks do not already cover compilation.
- [ ] Review `git diff` for accidental lucky wheel work or unrelated changes.
