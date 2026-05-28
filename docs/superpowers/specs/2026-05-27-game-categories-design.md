# Game Categories and Cleanup Design

## Scope

Add customer-facing game categories so admins can create games with optional icons and assign each item to one game. Customers can filter items by game on the homepage and item list.

This work also includes targeted cleanup discovered during project analysis:

- Stop tracking secrets by ignoring `.env`.
- Fix current lint failures in `src/ShopApp.tsx`.
- Keep upload policy consistent with README by allowing only JPG, PNG, WEBP, and GIF.
- Avoid the local Vite warning caused by `NODE_ENV=production` in `.env` when safe to do so.

## Data Model

Add a `game_categories` table:

- `id`
- `name`
- `slug`
- `icon`
- `description`
- `status`
- `sort_order`
- `created_at`
- `updated_at`

Add nullable `game_category_id` to `items`. Existing items remain valid and can be assigned later. Seed data creates at least one active default game category and assigns existing sample items to it.

## Backend

Public API:

- `GET /api/game-categories` returns active categories.
- `GET /api/items?game=<slug>` filters active items by category.
- `GET /api/home` returns active categories and still returns item sections.

Admin API:

- `GET /api/admin/game-categories`
- `POST /api/admin/game-categories`
- `PATCH /api/admin/game-categories/:id`
- `DELETE /api/admin/game-categories/:id`

Deleting a category hides it when items reference it; it hard-deletes only when no items reference it. Item create/update accepts `game_category_id`.

## Frontend

Types:

- Add `GameCategory`.
- Add optional category fields to `Item`.

Customer UI:

- Homepage shows a compact game filter row above item sections.
- Item list page shows `All` plus game tabs.
- Item cards can show the game label/icon when available.

Admin UI:

- Add a `Game` tab to the admin panel.
- Add a category management screen with name, slug, icon, description, status, and sort order.
- Add a `Game category` select to the item form.

## Error Handling

Backend validates category name and slug. Duplicate slug returns a clear error. Item category assignment accepts empty/null for uncategorized items and rejects nonexistent category IDs.

## Testing and Verification

Add lightweight backend tests if the repo has no existing test framework. Tests should cover category schema/API behavior where practical. Verification commands:

- `npm run build`
- `npm run lint`
- category-related test command, if added

## Out of Scope

- Multi-game item assignment.
- Dedicated `/games/:slug` route.
- Large frontend file refactor beyond what is needed for lint and the category feature.
