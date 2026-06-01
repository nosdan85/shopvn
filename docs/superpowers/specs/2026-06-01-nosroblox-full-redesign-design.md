# NosRoblox Full Redesign Design

## Goal

Redesign the entire customer-facing visual system of the current shop into a cleaner, brighter, more premium storefront named `NosRoblox` without removing existing business functionality.

The redesign must:

- preserve the current routes, data flow, and core purchase logic
- preserve wallet checkout, Discord linking, order flow, proof flow, and admin operations
- replace the current mixed and inconsistent visual language with one unified design system
- use Vietnamese only across storefront-facing copy
- fix broken or garbled text rendering in the current UI
- keep existing logo and current image assets where they still work visually
- allow a full storefront information-architecture reorder if it improves clarity and conversion

## Approved Product Direction

### Brand name

- `NosRoblox`

### Tone

- balanced between premium and playful
- trustworthy enough for payments
- energetic enough to still feel like a Roblox shop instead of a generic SaaS dashboard

### Language

- storefront copy is Vietnamese only

### Visual palette

- primary atmosphere: ice blue, mint, and graphite
- overall feel: cool, airy, polished, modern
- no purple-heavy palette
- no dark-mode-first storefront
- no loud neon arcade treatment

### Asset policy

- keep the current logo and existing imagery where they still look acceptable after the redesign
- if an existing asset is weak, improve the way it is framed rather than immediately replacing the asset itself

## Current-State Problems

The current web experience has enough functionality to operate, but its presentation no longer supports trust, clarity, or product desirability.

### Brand inconsistency

- the current storefront reads like multiple themes layered together
- color use, corner radius, shadows, card styles, and button treatments do not feel like one intentional system
- the shop name presentation is inconsistent with the desired `NosRoblox` identity

### Weak information hierarchy

- the hero does not clearly establish the value proposition or push the user toward shopping
- best sellers, proofs, and categories are present but not given the right visual weight
- too many sections compete equally, so the eye has no obvious path

### Generic merchandising

- product cards feel functional but not premium
- pricing, product description, and click intent are not visually prioritized well enough
- the storefront does not create enough confidence for a first-time buyer

### Mixed language and broken text

- English and Vietnamese are mixed together without a clear rule
- several labels and descriptions are visibly broken by encoding issues
- this directly reduces perceived quality and trust

### Shared-surface inconsistency

- cart, profile, orders, proofs, and admin surfaces do not clearly belong to one system
- the current CSS structure suggests repeated overrides rather than one stable visual foundation

## Design References Used

The redesign should not copy another brand directly. Instead it should combine specific strengths from the approved research set.

### Primary reference blend

- `Meta DESIGN.md`
  - clean commerce hierarchy
  - strong rounded CTA language
  - structured white-surface product presentation
- `Apple DESIGN.md`
  - restraint, clarity, premium spacing, and strong product focus
  - reduced visual noise around commerce surfaces
- `Mastercard DESIGN.md`
  - warmer editorial discipline in layout rhythm
  - confidence in large-radius surfaces and elegant section pacing

### Intended synthesis

The final `NosRoblox` look should be:

- brighter and cleaner than the current site
- more conversion-friendly than a pure editorial landing page
- more premium and intentional than a typical game-item marketplace

## Chosen Experience Strategy

### Chosen approach

Build a full `editorial commerce` storefront with a strong sales hierarchy, premium light surfaces, and cleaner buyer guidance.

### Why this approach won

- it supports the user's request for a real redesign rather than a CSS cleanup
- it allows major layout changes without removing functionality
- it fits `NosRoblox` better than a dark or hyper-neon direction
- it gives room to elevate trust elements such as proofs, wallet checkout, and Discord fulfillment

### Rejected alternatives

#### Conversion-first marketplace only

Rejected because it would likely make the site faster to scan but still too generic and visually forgettable.

#### Heavy showcase / cinematic hero-first design

Rejected because it risks slowing the buying path and making the storefront feel more like a promo page than a store.

## Brand System

### Brand expression

`NosRoblox` should feel like a curated Roblox item store that is fast, clear, and reliable. It should not feel like:

- a generic bootstrap admin template
- a neon gamer landing page
- a dark clone of another storefront
- a corporate fintech dashboard

### Voice

The copy tone should be:

- concise
- confident
- direct
- friendly but not childish

Examples of correct tone:

- `Vat pham Roblox chon loc, giao nhanh, mua gon.`
- `Mua bang so du vi, theo doi don ro rang, nhan hang qua ticket Discord.`
- `San pham ban chay`
- `Don da giao gan day`

Examples of incorrect tone:

- heavy English taglines
- meme language
- excessive hype language
- overly formal enterprise wording

## Visual Design System

### Color system

#### Core surfaces

- page background: very light ice-blue tint rather than flat white
- primary card surface: cool white
- secondary surface: slightly darker frost blue for section separation
- elevated utility surface: white with subtle cool border

#### Text

- primary text: graphite
- secondary text: muted slate-graphite
- tertiary text: soft gray-blue

#### Interactive colors

- primary CTA: deep cool blue leaning slightly teal
- primary CTA hover/active: darker blue-teal step
- accent highlight: mint
- success / trust accents: mint and soft green
- warning / destructive states stay conventional and readable, not stylized

#### Rules

- mint is an accent, not the main text color
- blue/teal drives primary action
- large backgrounds stay calm and bright
- avoid hard black unless used for very small emphasis

### Typography

Typography should move away from the current generic stack and become more deliberate while still being practical to ship in the current codebase.

#### Principles

- headings should feel sharper and more premium than body copy
- large headlines should carry the brand energy
- body copy should remain highly readable in Vietnamese
- the storefront must never mix multiple conflicting typographic personalities

#### Usage model

- hero headline: bold, compact, high contrast
- section title: strong but calmer than hero
- product title: compact and readable in 2 lines max
- helper text: smaller, quieter, but still legible

### Shape language

- larger rounded corners than the current storefront
- consistent card radius across modules
- pill treatment reserved for filters, chips, and key CTA variants
- no random mix of square, medium-round, and extra-round treatments

### Elevation

- subtle shadows only
- no heavy glassmorphism fog
- no thick glowing outlines
- hierarchy should come from spacing, contrast, and structure before shadow

### Motion

- short fade and rise transitions
- slightly richer hover states for product cards and CTA buttons
- no gimmicky floating or overscaled interactions
- mobile interactions should feel responsive and calm

## New Information Architecture

The storefront should be reorganized into a clearer shopping narrative rather than a flat sequence of equal-weight sections.

### Home / storefront flow

1. sticky header
2. hero with brand promise and CTA
3. compact trust strip
4. featured game or category selector
5. best sellers section
6. main product catalog with search and filtering
7. delivered-order confidence block
8. footer

This order is deliberate:

- first establish trust and identity
- then help users enter the right product area
- then show strongest-selling items
- then expose the wider catalog
- then reinforce confidence with delivered-order evidence before exit

## Page and Section Design

### Header

### Purpose

Keep orientation, cart access, and profile/order access visible without visually dominating the page.

### Structure

- left: logo + `NosRoblox`
- center/right: main navigation
- far right: cart CTA

### Behavior

- sticky with light blur or soft solid backdrop
- compact height
- clear active state
- mobile-friendly collapsed navigation

### Content priorities

- `Cua hang`
- `Don da giao`
- `Don hang`
- `Tai khoan`
- `Gio hang`

### Hero

### Purpose

Immediately communicate what the shop is, what it sells, and why the flow feels easy and trustworthy.

### Layout

- two-column desktop layout
- text block on the left
- framed image or banner on the right
- stacked cleanly on mobile

### Copy direction

Suggested base message:

- eyebrow: `NosRoblox`
- headline: `Vat pham Roblox chon loc, giao nhanh, mua gon.`
- support text: `Mua bang so du vi, theo doi don ro rang, nhan hang qua ticket Discord.`

### CTAs

- primary: `Mua ngay`
- secondary: `Xem don da giao`

### Metrics

Use a compact visual strip for:

- tong don
- doanh thu
- nguoi dung da lien ket Discord

This keeps the storefront feeling operational and credible.

### Trust strip

### Purpose

Replace long explanatory text with fast reassurance.

### Content model

3 to 4 compact cards:

- `Giao nhanh qua ticket Discord`
- `Thanh toan bang so du vi`
- `Don da giao cong khai, de kiem tra`
- `Theo doi don ro rang`

### Visual treatment

- equal-width compact cards
- icon or badge support allowed
- no giant illustrations

### Categories / game entry

### Purpose

Make category selection feel like a meaningful entry point, not leftover filters.

### Treatment

- larger pill group or card-like selector
- visually separate from standard filter chips
- active state must be unmistakable

### Requirement

The category area should help users jump into the right type of item quickly without feeling like admin filters leaked into the storefront.

### Best sellers

### Purpose

Act as the strongest early merchandise shelf.

### Requirements

- visually stronger than the generic product grid
- slightly larger product cards or more premium card treatment
- small status chips allowed
- strong price emphasis

### Messaging

Section title should feel commerce-driven in Vietnamese:

- `San pham ban chay`
- support note: `Duoc chon nhieu nhat`

### Main product catalog

### Purpose

Serve as the operational shopping surface for browsing and buying.

### Toolbar

The top of the catalog should include:

- search input
- category/game context
- compact service badges if useful

### Product grid

The grid should feel clean and dependable, not cramped.

Each product card should show:

- product image
- product name
- short supporting text
- price
- clear interaction hint

### Product card behavior

- hover reveals stronger intent without becoming noisy
- price remains visually anchored
- cards should be clickable as the primary interaction

### Product modal

### Purpose

Turn the current popup into a real purchase panel.

### Requirements

- stronger visual hierarchy
- cleaner image area
- clearer quantity control
- cleaner action grouping
- Vietnamese-only labels

### Copy updates

Replace broken labels with clean Vietnamese:

- `Dong`
- `So luong`
- `Them vao gio`
- `Mua ngay`

### Layout

- image left / details right on desktop
- stacked on mobile
- action buttons should be easy to hit

### Delivered-orders trust section

### Purpose

Increase trust, especially for first-time buyers.

### Role in page hierarchy

Proofs should no longer feel like a leftover section. They should feel like a strong confidence block near the bottom of the storefront.

### Content model

Each proof card may include:

- username
- gia tri don hoac tong thanh toan
- noi dung feedback
- trang thai co anh hoac chi van ban

### Tone

This section should communicate real transactions and real customer satisfaction, not social fluff.

### Footer

### Purpose

End the page cleanly and give utility navigation without visual clutter.

### Content

- brand block for `NosRoblox`
- quick links
- support/help links
- operational notes if needed

### Visual direction

- lighter than the current dark-heavy style
- dense enough to be useful
- still consistent with the ice-blue system

## Shared Surface Redesign

The redesign must extend beyond the storefront landing page.

### Cart

Cart should feel like a clear checkout staging area:

- stronger summary hierarchy
- clearer line items
- cleaner quantity controls
- strong wallet payment summary

### Orders

Orders should feel more structured and scannable:

- stronger order grouping
- cleaner status treatment
- clearer difference between metadata and action buttons

### Profile

Profile should feel like an account hub:

- profile information
- Discord state
- referral or account utilities if present
- wallet/account summary presented clearly

### Proofs page

The dedicated proofs page should reuse the same trust-card language as the storefront preview section, but allow denser listing and easier browsing.

### Admin

Admin should be visually aligned with the new system but remain operational, efficient, and less decorative than the storefront.

Admin redesign should focus on:

- spacing consistency
- input consistency
- clearer tabs and sections
- better tables/cards

Admin does not need a marketing-style hero.

## Copy and Language Rules

### Storefront language rule

All customer-facing copy must be Vietnamese only.

### Cleanup rule

Any broken or garbled text currently visible in:

- storefront
- product modal
- cart
- orders
- profile
- proofs

must be replaced with clean Vietnamese strings.

### Copy style

- short labels
- plain language
- no random English fallback
- no overhyped sales language

## Functional Preservation Rules

The redesign is visual and structural, not a business-logic rewrite.

The following must keep working:

- current route structure
- storefront data loading
- local cart behavior
- modal product flow
- buy-now flow
- wallet-based checkout
- Discord linking requirement
- order creation and order tracking
- proof display
- admin operations

## Technical Design Constraints

### Frontend structure

The current CSS situation suggests too many overlapping storefront styles. The redesign should move toward a more coherent layer rather than stacking more overrides.

### Implementation preference

- consolidate storefront visual rules into a cleaner shared system
- avoid continuing the current pattern of scattered style overrides where possible
- preserve existing components only when they still fit the new system

### Responsive behavior

The redesign must work intentionally on both desktop and mobile.

#### Desktop

- wider breathing room
- balanced two-column hero
- premium section rhythm

#### Mobile

- cleaner stacked sections
- easy thumb targets
- reduced clutter in navigation and filter zones
- no reliance on desktop-only spacing assumptions

## Error, Empty, and Loading States

These states must also be redesigned to match the new system.

### Loading

- clean Vietnamese loading text
- visually consistent skeleton or loading panel language

### Error

- calm, readable error panels
- maintain trust rather than feeling broken

### Empty

- empty states should feel intentional, not like raw fallback text

## Accessibility and UX Guardrails

- maintain readable contrast on bright surfaces
- preserve clear focus states
- keep interactive controls large enough on mobile
- avoid decorative choices that hide the main purchase actions
- ensure the visual redesign does not make proof, price, or action labels harder to read

## Success Criteria

The redesign is successful when:

- the site clearly reads as `NosRoblox`
- the storefront feels intentionally designed rather than patched together
- buyers can immediately understand what the shop sells and how to buy
- the UI is Vietnamese-only and no longer contains broken text
- product browsing and purchase actions feel cleaner and more trustworthy
- cart, orders, profile, proofs, and admin all feel like part of one system
- no existing key business flow is lost

## Out of Scope

This redesign does not include:

- removing or replacing the current commerce logic
- changing wallet checkout into another payment model
- removing Discord from the fulfillment flow
- replacing every existing asset or logo by default
- inventing a new backend architecture just for the redesign

## Implementation Handoff Notes

When this design moves to implementation, the work should prioritize:

1. shared design tokens and shared surfaces
2. storefront restructuring
3. product card and modal redesign
4. cart / orders / profile / proofs alignment
5. admin surface cleanup

The implementation should prefer a complete and coherent storefront pass over many tiny partial style patches.
