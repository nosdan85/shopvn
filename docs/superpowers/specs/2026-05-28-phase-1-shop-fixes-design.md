# Phase 1 Shop Fixes Design

## Scope

Phase 1 covers quick shop and bot fixes only. The lucky wheel event, admin wheel builder, spin tickets, and auto-generated one-use wheel coupons remain out of scope for a later phase.

## Changes

- Replace the initial shop loading copy with English wait text and a small stick-figure activity above the progress bar.
- Keep loading work alive when the user backgrounds the mobile browser by avoiding visibility-based cancellation and continuing fetches.
- Show the 7 most recent paid purchases and refresh the feed periodically.
- Override the Sailor Piece game icon on mobile with the provided Cloudinary URL.
- Enlarge the product detail modal and image area only on desktop.
- Round the desktop cart panel corners while preserving the existing mobile sheet.
- Use a money formatter that preserves cents and does not collapse 0.99 to 1.
- Make payment proof log payloads support an attached proof image so Discord can render unusual aspect ratios as a file attachment.
- Add checkout coupon input and preview using the existing backend coupon preview endpoint and checkout coupon support.

## Testing

Backend tests cover money formatting and payment proof attachment payloads. Web changes are verified with build/lint where practical.
