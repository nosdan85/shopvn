# Shoptay-Compatible Port Design

## Goal

Port nearly the full user and admin experience from the `shoptay-main.zip` project into the current `shopvn-main` repository while preserving the current Vietnamese project's live backend, SQLite data model, wallet top-up flow, Discord link and ticket flow, color palette, animations, and interaction effects.

The final system should:

- look and navigate like the western shop for both customer and admin areas
- keep the current project's balance purchase flow as the only checkout path
- remove delivery-slot selection from the purchase journey
- remove external payment-method checkout from the purchase journey
- force Discord linking after wallet-funded purchase if the user is not already linked
- create the Discord ticket using the existing backend code already present in this repository
- avoid breaking existing data, routes, and business logic already in use

## Constraints

- The current repository remains the system of record.
- Existing SQLite schema and persisted data must remain compatible.
- Existing wallet top-up, deposit approval, balance logs, order management, and Discord link/ticket backend logic must remain intact.
- The imported experience must stay inside the current Vite-based repository rather than switching the frontend to Next.js.
- The western project's Mongo/Mongoose schema cannot replace the current SQLite schema.
- The current Vietnamese visual identity wins for colors, motion, and effects even where layout and information architecture are ported from the western shop.

## Current-State Summary

### Current repository

- Frontend: Vite + React, currently centered around a large SPA entry in `src/ShopApp.tsx`
- Backend: Express + SQLite in `server/index.cjs` and `server/db.cjs`
- Existing live logic already includes:
  - wallet top-up and deposit review
  - purchase by balance
  - order tracking and order chat
  - Discord account linking
  - Discord ticket creation after purchase

### Source zip project

- Frontend: Next.js app in `web/`
- Backend: Express + Mongo/Mongoose in `api/`
- Additional modules in source:
  - storefront and admin UX
  - lucky wheel
  - coupon/referral
  - proofs/vouch
  - analytics
  - Roblox search
  - external-payment flows and payment-proof ticket creation
  - delivery-slot scheduling

### Key incompatibilities

- Framework mismatch: Next.js source vs Vite target
- Data mismatch: Mongo object models vs SQLite relational schema
- Checkout mismatch: external payment checkout in source vs wallet checkout in target
- Flow mismatch: delivery-slot step exists in source but must be removed in target

## Architecture Decision

Build a compatibility port inside the current repository instead of copying the western project wholesale.

### Chosen approach

Create a new frontend structure inside the current Vite app that reproduces the western shop's page composition, admin structure, and user flow, but consumes the current repository's backend through a thin adapter layer. Add only minimal backend compatibility endpoints where the current API shape is not enough for the new frontend.

### Why this approach

- Preserves current SQLite data and operational logic
- Minimizes risk of breaking deposits, balance purchases, and existing Discord ticket flow
- Avoids mixing Next.js server-route assumptions into the current Vite app
- Keeps migration scope bounded to compatible layers instead of rewriting the whole stack
- Allows staged rollout and verification per module

### Rejected alternatives

#### Copy the western code directly into the current repo

Rejected because it would create large route, state, and schema conflicts and would force the current codebase to emulate Next.js and Mongo assumptions.

#### Replace the current frontend with Next.js

Rejected because the user chose to remain in the current Vite repository and required current DB compatibility.

#### Replace current backend models with Mongo-like structures

Rejected because existing data and business logic must remain intact.

## Frontend Design

### Routing model

The current SPA should be split into route-oriented views inside the Vite app instead of keeping all behavior inside one monolithic page switch. The exact router library choice should follow the least disruptive option in this repo, but the implementation should expose separate customer and admin screens that map closely to the western UI structure.

Target route groups:

- customer storefront
  - home/shop landing
  - product listing
  - product detail/modal experience
  - cart
  - login/register/profile
  - orders and order detail
  - proofs/vouch area
- admin
  - products
  - games
  - orders
  - analytics
  - configuration
  - linked Discord users
  - lucky wheel controls
  - referral and coupon controls
  - proofs/vouch management where the current backend can support it

### Visual direction

The port should copy:

- western page structure
- section ordering
- card layout
- admin information architecture
- modal and panel placement
- storefront merchandising patterns

The port should preserve from the Vietnamese project:

- current color tokens
- current animation style
- current hover and motion treatment
- current branding tone where already established

This means the final UI should feel like "western layout on Vietnamese skin" rather than a direct CSS transplant.

### Frontend compatibility layer

Add dedicated mapping utilities between backend DTOs and UI view models so new pages do not depend directly on raw backend responses. This layer will:

- normalize current `items` rows into western-style product cards
- normalize `game_categories` into game filters
- normalize order summaries for recent-purchase ticker and admin tables
- normalize linked Discord state for user profile and admin linked-user screens
- normalize lucky wheel, referral, review/proof, analytics, and Roblox-search view models into stable frontend DTOs

This keeps the UI port isolated from existing backend naming choices.

## Backend Design

### Core principle

Keep the current backend as source of truth and extend it only where the new UI needs additional response shapes or aggregate endpoints.

### Existing logic to keep unchanged

- authentication and session behavior
- top-up creation and approval
- balance deductions during purchase
- order creation and order item persistence
- Discord OAuth link flow
- Discord ticket creation after purchase
- admin moderation and operational actions already implemented

### Checkout behavior

The new checkout flow must be:

1. user tops up wallet using current system
2. user adds products to cart
3. user purchases using balance only
4. if Discord is not linked, checkout is interrupted by the existing Discord-link requirement
5. after successful link, checkout resumes
6. backend creates ticket using the current Discord module

The following source behaviors are explicitly removed from the purchase flow:

- delivery-slot selection
- PayPal/LTC/CashApp checkout
- payment-proof upload as the main order-creation path

### Compatibility endpoints

Add backend endpoints only where required to support the imported UI structure. These endpoints should prefer composition over rewriting existing internals. Typical additions include:

- storefront aggregate endpoints that combine products, banners, best sellers, recent purchases, and module state
- admin aggregate endpoints for dashboards and analytics cards
- linked-user management endpoints shaped for the imported admin table
- module-specific read/write endpoints for lucky wheel, referral, proofs, and Roblox lookup where current coverage is incomplete

Whenever a current endpoint already provides correct behavior, the frontend should adapt to it rather than introducing duplicate server logic.

## Data Mapping Design

### Game mapping

Western `Game` documents map into current `game_categories` rows.

Field mapping:

- `name` -> `game_categories.name`
- `slug` -> `game_categories.slug`
- `image` -> `game_categories.icon`
- `active` -> `game_categories.status` (`active` or `hidden`)

### Product mapping

Western `Product` documents map into current `items` rows.

Field mapping:

- `name` -> `items.name`
- generated slug -> `items.slug`
- `gameId` -> `items.game_category_id` after game import mapping
- `image` -> `items.image`
- `desc` -> `items.description`
- `category` and source pricing notes -> `items.short_description` or appended structured text in `description`
- `price` -> `items.price`
- `is_best_seller`, `is_featured`, and `is_sale` remain `0` unless the source config or import manifest explicitly marks them

### Unsupported source fields

The western source includes fields that do not map cleanly one-to-one into the current schema:

- `bulkPrice`
- `bulkPriceString`
- `packQuantity`
- `originalPriceString`

These should not trigger schema-breaking changes by default. Instead:

- primary sell price is stored in `items.price`
- source pricing metadata is preserved in descriptive fields where useful for display
- only if the imported UX truly depends on structured pack pricing should the current schema be extended, and then only through additive nullable columns with backward compatibility

### Config mapping

Western configuration values should map into current `settings` and existing admin-config storage patterns:

- banners
- best-seller ordering
- feature toggles
- lucky-wheel config
- referral/coupon config where present

No source-side Mongo configuration model should replace current storage.

## Catalog Import Strategy

### What can be imported from the zip

The zip can provide:

- source-defined games
- source-defined products present in code or seed files
- product images bundled in public assets
- banners and static marketing assets
- configuration defaults visible in source

### What cannot be guaranteed from the zip alone

The zip does not include a live Mongo dump of all production-created records. Therefore the import cannot guarantee recovery of every item ever created on the source shop unless those records exist in:

- seed scripts
- committed JSON/data files
- committed source config
- bundled uploaded assets with enough metadata to reconstruct records

### Import implementation

Create a dedicated import script that:

- reads source data from extracted zip content or a prepared import directory
- imports games first
- imports products second using game-slug or name mapping
- copies or references images into the current asset strategy
- performs upsert-like behavior by stable slug/name rules
- supports dry-run mode
- emits a conflict report for manual review

### Idempotency rules

The import must be safe to re-run:

- if a target slug already exists, update instead of duplicating
- if a referenced game is missing, log and skip product or place it uncategorized based on explicit rule
- if an image already exists, reuse it

## Module-by-Module Port Rules

### Storefront

Port almost fully:

- hero/banner area
- recent-purchase feed
- game filters
- product grid and best sellers
- product detail UX
- cart UX

### Admin

Port almost fully:

- product management
- game management
- order management
- analytics layout
- configuration screens
- linked-user screens

### Lucky wheel

Port into current repo with current backend compatibility additions where needed. It should remain a wallet/shop-side engagement module, not a separate payment module.

### Coupon and referral

Port the UI and compatible backend logic using current storage patterns. Maintain compatibility with current order and balance flow.

### Proofs/vouch

Port the customer/admin UX where possible using current order/review/proof concepts. If the source assumes Discord-payment-ticket proofing, adapt it to the current order/review flow rather than recreating the removed payment checkout.

### Analytics

Port the admin dashboard layout and cards, but calculate metrics from current SQLite data. Exact parity with Mongo-derived analytics is not required; behavioral equivalence is enough.

### Roblox search

Port if the source implementation can be consumed without introducing external architectural drift. This module is low risk because it is read-oriented.

### Delivery slots

Remove from the purchase journey entirely. Do not expose delivery-slot step UI in the new storefront flow.

### External payment-method checkout

Remove as an order-creation path. Any reused payment UI fragments must not create orders outside the current wallet flow.

## Conflict-Avoidance Strategy

### Frontend isolation

- avoid large new edits directly inside the existing monolithic `src/ShopApp.tsx` where possible
- extract new route views and shared components into separate files
- keep backward-compatible adapters between old API calls and new UI view models

### Backend isolation

- preserve current routes where already stable
- add aggregate/adapter endpoints under clear namespaces
- avoid renaming or changing semantics of existing working endpoints unless all call sites are migrated in the same step

### Data safety

- additive schema changes only
- no destructive migrations
- import scripts must be dry-run capable
- no direct DB replacement from source Mongo structures

## Error Handling

- Import failures should produce actionable reports listing skipped games, skipped products, slug collisions, and missing assets.
- Compatibility endpoints should return explicit module-level errors so the new UI can degrade gracefully.
- Optional modules such as lucky wheel or referral should fail closed without blocking the core wallet purchase path.
- Discord-link enforcement errors must continue using the existing `DISCORD_LINK_REQUIRED` contract so resume behavior stays stable.

## Testing Strategy

### Automated checks

- extend backend tests for any new compatibility endpoints and import helpers
- add focused tests for data mapping and slug/upsert behavior
- add frontend build checks after route/component extraction
- add regression tests around Discord-link checkout resume behavior if touched

### Manual verification

Verify:

- current users can still log in
- existing balance and deposit data remains visible
- product browsing works in the new UI
- cart and wallet checkout work without delivery/payment steps
- Discord-link interruption and resume still work
- successful purchase still creates Discord ticket
- imported catalog appears correctly in both user and admin interfaces
- admin can manage products, games, config, and linked users without corrupting existing rows

## Rollout Order

1. Create compatibility spec and implementation plan
2. Extract source assets and build import tooling
3. Introduce frontend route structure and shared adapters
4. Port storefront layout and product browsing
5. Port cart and wallet-only checkout flow
6. Port orders/profile/Discord-linked customer views
7. Port admin layout and core admin modules
8. Port secondary modules: analytics, lucky wheel, referral, proofs, Roblox search
9. Run import on source catalog assets/data
10. Execute full regression verification

## Out of Scope

- replacing the current backend with the western Mongo backend
- converting the repository to Next.js
- preserving exact internal data structures from the source project
- supporting delivery-slot checkout
- supporting external payment-method checkout as an alternate order path

## Success Criteria

The work is successful when:

- the current project still runs on its existing backend and SQLite database
- the user and admin experience largely matches the western project's structure
- colors, animation, and interactive tone still match the Vietnamese project
- users can top up wallet, buy items, get forced into Discord linking when needed, and receive Discord tickets after purchase
- imported source products and games from the zip are visible and manageable in the current project without corrupting existing data
