# Referral Wallet-Compatible Design

## Goal

Add a real referral system that fits the current wallet-only checkout and Discord ticket flow without changing how purchase payment works.

The referral system must:

- give every user a fixed referral code generated at registration
- allow only brand-new accounts with no orders to apply a referral code
- never discount the buyer's checkout total
- reward the referrer only after the referred user's first order becomes `completed`
- reward the referrer with `50%` of that first completed order's `total_amount`
- keep all accounting in the current SQLite, balance log, and admin flow
- avoid conflicts with the existing Discord-link-required checkout resume flow

## Current-State Summary

- The current repository already supports wallet top-up, wallet-only checkout, order creation, order status updates, balance logs, and Discord ticket creation.
- The current compatibility storefront/admin UI already exposes referral as a module/config shell, but there is no real referral backend logic yet.
- Checkout currently works as:
  1. user tops up wallet
  2. user submits cart purchase
  3. if Discord is not linked, backend blocks checkout and redirects through Discord link
  4. checkout resumes
  5. order is created
  6. order ticket is created on Discord

This existing flow remains unchanged.

## Chosen Referral Model

### Core behavior

- Each user gets one fixed `referral_code` at registration.
- A user may apply another user's referral code only once.
- A user may apply a referral code only if:
  - the account has no orders at all
  - the account has not already been linked to a referrer
- The buyer receives no discount at checkout.
- The referrer receives a wallet reward only after the referred buyer's first order becomes `completed`.
- Reward amount is `50%` of `orders.total_amount` from that first completed order.

### Why this model fits the current system

- It does not change checkout math, so the existing wallet deduction logic remains intact.
- It avoids conflicts with deposit flow and Discord resume checkout behavior.
- It uses the current balance log system instead of inventing a separate settlement mechanism.
- It matches the user requirement that referral is a commission for the inviter, not a coupon for the buyer.

## Rejected Alternatives

### Referral as direct discount

Rejected because it would alter the wallet checkout amount and require deeper changes to pricing, cart totals, and order validation.

### Referral on every completed order

Rejected because the approved requirement is to reward only on the referred user's first completed order.

### Referral for users who already created orders

Rejected because the approved rule is stricter: only accounts with zero orders may apply a code.

## Data Model

### Users table additions

Add nullable, backward-compatible fields:

- `referral_code TEXT UNIQUE`
- `referred_by_user_id INTEGER NULL`
- `referral_linked_at TEXT NULL`

Purpose:

- `referral_code` identifies the user as a referrer
- `referred_by_user_id` stores the inviter relationship
- `referral_linked_at` stores when the relationship was locked in

### Referral rewards table

Add a new table `referral_rewards`:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `referrer_user_id INTEGER NOT NULL`
- `referred_user_id INTEGER NOT NULL`
- `source_order_id INTEGER NOT NULL UNIQUE`
- `reward_percent INTEGER NOT NULL`
- `reward_amount INTEGER NOT NULL`
- `status TEXT NOT NULL DEFAULT 'paid'`
- `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `paid_at TEXT`
- `reversed_at TEXT`
- `reversal_note TEXT`

Constraints and meaning:

- `source_order_id UNIQUE` ensures the same first completed order can never pay twice
- `reward_percent` stores the actual applied value (`50`)
- `reward_amount` stores the actual rewarded wallet amount
- `status` supports `paid`, `reversed`, and `reversal_pending`

No existing order, deposit, or balance-log table structure needs to be replaced.

## Code Generation Rule

### Referral code creation

At user registration:

- generate a code automatically
- use a stable uppercase alphanumeric format derived from username plus randomness if needed
- retry on collision until unique

The code must remain fixed unless a future explicit requirement adds admin editing. That is out of scope here.

## API Design

### `GET /api/referrals/me`

Authenticated route returning:

- current user's referral code
- whether the user was referred
- who referred them, if any
- summary of rewards earned as a referrer
- recent referral reward rows

This is used by profile and compat pages.

### `POST /api/referrals/apply`

Authenticated route accepting:

- `code`

Validation:

- user must exist and be active
- user must not already have `referred_by_user_id`
- user must not have any order rows
- code must exist
- code must not belong to the same user

Behavior:

- link the current user to the referrer
- set `referral_linked_at`
- return the linked referrer summary

### Admin read endpoints

Either extend admin compatibility aggregates or add a dedicated endpoint returning:

- referral settings summary
- top referrers
- referral rewards list
- referred users and reward states

This supports admin monitoring without changing the purchase flow.

## Reward Execution Logic

### Trigger point

The reward logic runs when admin updates an order status to `completed`.

This is the correct place because:

- the current system already centralizes post-completion side effects there
- orders are considered finalized there
- Discord ticket and user notification flows already live near that lifecycle

### Reward rules

When an order becomes `completed`, backend checks:

1. Is this buyer linked to a referrer?
2. Is this buyer's first completed order the current order?
3. Has a `referral_rewards` row already been created for this `source_order_id`?

If all checks pass:

- compute reward = `round(order.total_amount * 50 / 100)`
- add reward to referrer's wallet
- insert a `balance_logs` row with type `referral_reward`
- insert `referral_rewards` row
- notify the referrer

### First-order determination

The system should treat "first eligible referral order" as the referred user's first order that reaches `completed`.

Because referral application is blocked once any order exists, this will normally also be the user's first order overall. The completion-time check still remains necessary for correctness and idempotency.

## Reversal Logic

### Why reversal is required

If a rewarded source order is later marked `refunded`, leaving the referral payout untouched would make wallet accounting inaccurate.

### Reversal behavior

If an order with a paid referral reward later becomes `refunded`:

- locate the `referral_rewards` row for that order
- if status is `paid`, reverse the reward
- if the referrer has enough balance:
  - subtract the reward from the referrer's balance
  - create a negative `balance_logs` row with type `referral_reversal`
  - mark `referral_rewards.status = 'reversed'`
  - store `reversed_at` and `reversal_note`
- if the referrer does not have enough balance:
  - do not force the wallet negative in this iteration
  - mark `referral_rewards.status = 'reversal_pending'`
  - store `reversal_note`
  - surface this case in admin for manual handling

This keeps the ledger explicit without introducing forced negative wallet balances as part of the first referral rollout.

## Anti-Abuse Rules

- Self-referral is forbidden.
- Referral can only be linked once.
- Referral can only be linked before the user has any order.
- Reward can only be paid once per referred user because only the first completed order is eligible.
- Reward can only be paid once per order because `source_order_id` is unique in `referral_rewards`.
- Repeated status toggles on the same order must not duplicate payouts.

This design does not attempt advanced anti-fraud techniques such as IP/device clustering. Those are intentionally out of scope for this iteration.

## UI Design

### Buyer-facing UI

Add referral UI to profile and compat storefront/cart surfaces:

- show the current user's own referral code with copy action
- show referral summary in profile
- show an input to apply a referral code only when eligible
- once applied, lock the relationship and show the linked inviter

The referral input is informational and account-level. It is not part of payment math.

### Admin UI

Add referral management visibility to the compat admin module/config area:

- fixed reward rate display (`50%`)
- referral totals and counts
- reward history table
- top referrers
- referred user list and source order links

No admin editing of individual referral codes is included in this scope.

## Compatibility With Existing Features

This referral system must coexist with:

- wallet top-up by bank transfer and card
- wallet-only checkout
- Discord-link-required checkout interruption and resume
- Discord ticket creation
- order chat
- review/proof flow
- admin refund flow
- balance logs and notifications

The implementation must not rewrite those flows; it should only attach referral state and referral reward side effects at safe lifecycle points.

## Testing Strategy

Add automated tests for:

- referral code generation on registration
- successful code apply for a brand-new user
- rejection when user already has any order
- rejection on self-referral
- reward payout on first completed order
- no duplicate payout if status is set to `completed` twice
- reversal when rewarded order becomes `refunded`
- profile/referral summary endpoint shape

## Out of Scope

- buyer-facing coupon discounts
- referral rewards on multiple orders
- admin editing of referral codes
- advanced fraud detection
- full coupon inventory system from the western source project

## Result

The final referral implementation will behave like a commission layer on top of the current wallet commerce system:

- buyer flow stays simple
- accounting stays in SQLite
- inviter reward is delayed until operational completion
- admin can audit every payout and reversal
- no conflict is introduced with existing Discord checkout enforcement
