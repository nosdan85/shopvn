# Game Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-managed game categories, let items belong to one category, and expose category filters to customers while fixing the current hygiene issues.

**Architecture:** Extend the existing SQLite schema and Express routes in place, following the repo's current single-file backend pattern. Keep frontend changes inside `ShopApp.tsx` and shared types/API helpers because the app currently centralizes screens there, with only targeted extraction avoided for scope control.

**Tech Stack:** React, TypeScript, Vite, Node.js, Express, better-sqlite3, node:test.

---

### Task 1: Backend Schema and Tests

**Files:**
- Modify: `server/db.cjs`
- Create: `tests/game-categories.test.cjs`
- Modify: `package.json`

- [ ] Add a node:test script: `"test": "node --test tests/*.test.cjs"`.
- [ ] Write a failing test that loads `server/db.cjs` with a temp `DATABASE_PATH` and asserts `game_categories` exists, `items.game_category_id` exists, and a category can be assigned to an item.
- [ ] Run `npm test` and verify it fails because the schema is missing.
- [ ] Add `game_categories`, indexes, and `items.game_category_id` migration in `server/db.cjs`.
- [ ] Run `npm test` and verify it passes.

### Task 2: Backend Public and Admin APIs

**Files:**
- Modify: `server/index.cjs`
- Modify: `tests/game-categories.test.cjs`

- [ ] Add helper functions for category validation, slug normalization, item select joins, and category serialization.
- [ ] Export `{ app, startServer }` and only call `startServer()` when `require.main === module` so tests can import the app later.
- [ ] Add public `GET /api/game-categories`.
- [ ] Add `game` filtering to `GET /api/items`.
- [ ] Add `categories` to `GET /api/home`.
- [ ] Add admin CRUD routes for `/api/admin/game-categories`.
- [ ] Extend admin item create/update to accept `game_category_id`.
- [ ] Run `npm test`.

### Task 3: Seed Data

**Files:**
- Modify: `server/seed.cjs`

- [ ] Insert default `Sailor Piece` game category if missing.
- [ ] Assign seeded sample items to that category.
- [ ] Keep seed idempotent.
- [ ] Run `npm run seed` against the local DB.

### Task 4: Frontend Types and Public UI

**Files:**
- Modify: `src/types.ts`
- Modify: `src/ShopApp.tsx`
- Modify: `src/shop.css`

- [ ] Add `GameCategory` type and optional category fields on `Item`.
- [ ] Load categories on homepage and item list.
- [ ] Render game tabs with icon and active state.
- [ ] Pass selected category to `/api/items?game=<slug>`.
- [ ] Show item category label/icon on item cards when present.
- [ ] Run `npm run build`.

### Task 5: Admin UI

**Files:**
- Modify: `src/ShopApp.tsx`
- Modify: `src/shop.css`

- [ ] Add `games` admin tab.
- [ ] Add `AdminGameCategories` screen with list/form.
- [ ] Add category select to `AdminItems`.
- [ ] Load categories for admin item form.
- [ ] Include `game_category_id` in item save payload.
- [ ] Run `npm run build`.

### Task 6: Cleanup and Verification

**Files:**
- Modify: `.gitignore`
- Modify: `server/index.cjs`
- Modify: `src/ShopApp.tsx`
- Modify: `.env` only if `NODE_ENV=production` is present and no production-only local command depends on it

- [ ] Add `.env` to `.gitignore`.
- [ ] Restrict upload MIME types to JPG, PNG, WEBP, and GIF.
- [ ] Fix lint errors and hook warnings in `ShopApp.tsx`.
- [ ] Remove or neutralize `NODE_ENV=production` from local `.env` to stop Vite's warning.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
