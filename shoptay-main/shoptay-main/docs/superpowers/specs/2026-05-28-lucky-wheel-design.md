# Lucky Wheel Design

## Scope

Build a temporary lucky wheel event that admin can turn on and off. When enabled, the shop shows an event popup once per device and exposes a wheel section. Customers can spin only when logged in with Discord and holding at least one ticket.

## Data Model

- `ShopConfig.luckyWheel` stores event settings: `enabled`, `title`, `message`, and `slices`.
- `User` stores ticket state: `luckyWheelTickets`, `luckyWheelFirstLinkAwardedAt`, and admin grant counters.
- `GeneratedCoupon` stores unique one-use generated codes. Codes use the `NOSMARKET-XXXXXXXXXX` format, store discount percent, Discord owner, status, and usage order.

## Backend Behavior

- New Discord users created through OAuth receive exactly one spin ticket after deploy.
- Existing linked users do not receive automatic tickets. Admin can grant tickets from the linked-users admin panel.
- Admin APIs can read/update wheel config and grant tickets.
- Public APIs expose wheel config, spin eligibility, and a spin action.
- Spin action checks authenticated user, event enabled, positive ticket balance, and at least one configured slice. It decrements one ticket atomically, chooses a slice, and returns either an empty result or a generated coupon.
- Checkout preview and checkout accept generated coupons while unused and mark them used when an order is created.

## Frontend Behavior

- Admin dashboard includes a Lucky Wheel section for enabling/disabling event, editing copy, and editing wheel slices.
- Linked users show current tickets and a grant-spin action.
- Shop displays the event popup once per device while event is enabled.
- Shop displays a wheel section only while event is enabled. Spinning shows either a better-luck message or a generated coupon with copy button.

## Testing

Backend tests cover slice normalization, generated coupon format/uniqueness, and one-use coupon validation. Web is verified with lint/build and browser smoke testing.
