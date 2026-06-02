---
name: Complete System Analysis & Full Rebuild Plan
overview: Comprehensive analysis of the entire Nos Market gaming marketplace system — all frontend pages, components, backend APIs, Discord bot features, database models, payment flows, security mechanisms, realtime systems, and admin features — followed by a complete enterprise-grade rebuild plan using Next.js + NestJS + PostgreSQL + Prisma + Redis + discord.js.
todos: []
isProject: false
---

# Complete Gaming Marketplace — System Analysis & Full Rebuild Plan

## PART 0: CURRENT SYSTEM ARCHITECTURE

```
gaming-shop-full/
├── client/                  React 18 + Vite + React Router v6
│   └── src/
│       ├── components/       (4 components)
│       │   ├── Navbar.jsx
│       │   ├── ProductCard.jsx
│       │   ├── ProductDetailModal.jsx
│       │   └── CartModal.jsx
│       ├── context/
│       │   ├── AuthContext.jsx      — Admin JWT login state
│       │   ├── ShopContext.jsx      — Cart, user, Discord auth, toast
│       │   └── ThemeContext.jsx
│       ├── pages/
│       │   ├── Home.jsx            — 558 lines
│       │   ├── AdminDashboard.jsx   — 187 lines
│       │   ├── AdminOrders.jsx     — 1281 lines (MAIN ADMIN PANEL)
│       │   ├── AdminLogin.jsx      — 45 lines
│       │   ├── AuthCallback.jsx     — 379 lines
│       │   ├── PaymentPage.jsx     — 982 lines
│       │   ├── ProofsPage.jsx      — 358 lines
│       │   └── WalletPage.jsx      — 547 lines
│       └── utils/
│           ├── authSync.js, jwt.js
│           ├── productImage.js, priceFormatting.js
│           ├── itemQuantityDisplay.js, timezones.js
├── server/                  Express 4 + MongoDB/Mongoose
│   ├── bot.js               — 1970 lines (DISCORD BOT — monolithic)
│   ├── server.js            — 210 lines (HTTP SERVER)
│   ├── routes/
│   │   ├── shopRoutes.js    — ~3800 lines (ALL SHOP APIs)
│   │   ├── adminRoutes.js   — 61 lines
│   │   └── paypalIpnRoutes.js — 25 lines
│   ├── models/              (11 Mongoose schemas)
│   ├── services/
│   │   ├── paymentService.js   — PayPal REST + NOWPayments (LTC)
│   │   ├── paypalFfService.js   — PayPal F&F IPN logic
│   │   ├── walletService.js    — Wallet balance + transactions
│   │   └── squareService.js     — Cash App Pay via Square
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── rateLimit.js
│   └── utils/
│       ├── discordApi.js, tokenCrypto.js
│       ├── loggingService.js, couponCodes.js
│       ├── imgbbService.js, seeder.js
│       └── itemQuantityDisplay.js, timezones.js
├── php-paypal-ff/           Legacy PHP PayPal F&F (still active)
│   ├── create_order.php
│   ├── payment.php
│   ├── paypal_scanner.php
│   └── admin/orders.php
└── api/discord-exchange.js  Vercel serverless OAuth exchange
```

---

## PART 1: COMPLETE FRONTEND ANALYSIS (Every Pixel, Every Interaction)

### 1.1 HOME PAGE (`Home.jsx` — 558 lines)

**Elements:**

| Element | Type | Details |
|---------|------|---------|
| Recent Purchases Ticker | Scrolling banner | Shows `username` + `productName` in loop, `rgba(17,24,39)` bg, `color-accent` for username, `color-border` separator |
| Banner Carousel | Auto-rotate (4s) + manual arrows + dot indicators | Fetches from `ShopConfig.banners[]`, `object-contain`, auto-height (180-360px) based on image aspect ratio |
| Best Sellers Panel | 2/6 width, auto-scroll right (RAF loop) + manual arrows | `overflow-x-auto`, `scrollbar-hide`, product cards in 200px min-width, pause on hover |
| Game Selector Pills | Horizontal scrollable row | Pills: `All`, `Chest`, `Reroll`, `Shard`, `Seal`, `Relic`, `Sets`, `Combo`. Active = `bg-accent` + `border-accent`. Games loaded from API |
| Search Bar | Centered, max-w-xl | `MagnifyingGlassIcon` left, `color-accent`, `focus:border-accent` |
| Category Filters | Centered row | Same pills as Game Selector but for category. "Default / Price Low-High / Price High-Low" sort select |
| View Mode Toggle | Two buttons | "Browse by Game" (section view) vs "All Items" (grid view) |
| Section View | Per-game product rows | Each game: `<h2>` + "View All →" button + `grid-cols-6` preview |
| Grid View | `grid-cols-4` responsive | Product reveal animation (`product-reveal` CSS class, 45ms stagger, max 12 items) |
| Empty State | Centered text | `"No products found."` in serif font |
| Loading State | Dog loader animation | `.products-loader` CSS class with `🐕` emoji + "Loading products..." |
| Proof Notice Banner | Fixed top banner, dismissible | `ShieldCheckIcon`, "New here? See our receipts", CTA "View Proof Logs >", "Later" dismiss, localStorage `orderProofNoticeSeenV1` |
| Footer | Disclaimer text | `"This website only provides a marketplace..."` |
| Product Detail Modal | Inline component | Opens on ProductCard click |

**API Calls (parallel on mount):**
```
GET /api/shop/products        → normalizeCategory() → setProducts()
GET /api/shop/games          → setGames(), setActiveGameId(games[0]._id)
GET /api/shop/config         → setConfig({ banners, bestSellerIds, featuredProductIds })
GET /api/shop/recent-purchases?limit=30 → setRecentPurchases[]
```
**LocalStorage:** `productsCache` (JSON with `data` + `ts`), `orderProofNoticeSeenV1`

**Animation CSS:** `product-reveal` keyframe (fadeInUp), `products-loader` CSS, `ticker-track` marquee, `scrollbar-hide`, `animate-pop-in`

---

### 1.2 PRODUCT CARD (`ProductCard.jsx` — 62 lines)

**Visual Hierarchy:**
```
[p.category — 10px, uppercase, font-gothic, color-text-secondary]
[p.name — 13px, font-gothic, line-clamp-2, group-hover:color-accent]
[Image container — 90% x 90%, max 150x150, bg-secondary, rounded-8, border]
  [img — object-contain, Sets category: scale(1.10) hover scale(1.17)]
  [Other: hover scale-105]
[itemDescription — 11px serif, color-text-secondary, e.g. "$1.00 for 1x Aura Chest"]
```

**States:**
- Default: `bg-secondary`, `border-border`
- Hover: `border-border-medium` (slightly lighter), `shadow-lg`, image scale up, name turns accent
- Sets category: special scale behavior

**Image Fallback Chain:** Primary URL → `/products/aura-chest.png`

**Props:** `product` object, `onOpenDetail(product)` callback

---

### 1.3 PRODUCT DETAIL MODAL (`ProductDetailModal.jsx` — 182 lines)

**Layout:** 60/40 split (image left, info right on desktop; stacked on mobile)

**Left Panel:**
```
Image container:
  - Portrait detection: naturalHeight > naturalWidth * 1.05
  - Portrait: aspect-[3/4], max-w-300/300px
  - Landscape/square: aspect-square, max-w-320/560px
  - Sets category: scale(1.10)
  - Error fallback: getProductImageUrl('') → placeholder
```

**Right Panel:**
```
[category label — color-accent, uppercase, 12px]
[h2 name — 36px/24px, font-gothic, tracking-[-0.72px]]
[p itemDescription — serif, 14px]
[Benefit badges:]
  [CheckCircle green] "Instant Delivery"
  [CheckCircle green] "Secure Transaction"
[Quantity selector:]
  [-] button — bg-secondary, border
  [number input — 16px, w-16, text-center, no arrows]
  [+] button — bg-secondary, border
  [label: "Selected quantity"]
[ADD TO CART button — full width, bg-accent, py-4, rounded-8]
```

**Quantity Logic:**
- `MAX_UI_QUANTITY = 100000`
- Input validation: digits only, max 100000
- Blur normalization: < 1 → 1, NaN → 1, empty → 1
- On add: normalize quantity, call `addToCart(product, normalizedQuantity)`, then `onClose()`

**Animation:** `animate-pop-in` on mount, `backdrop-blur-sm`, close on overlay click or X button

---

### 1.4 CART MODAL (`CartModal.jsx` — 432 lines)

**Layout:** Split — items (3/5) left, checkout panel (2/5) right

**Left Panel (Items):**
```
[h2 "Bag" — 3xl font-gothic]
[Scrollable item list — custom-scrollbar]
  [per item:]
    [img — 64x64, object-cover, rounded-8, lazy]
    [name — font-gothic, line-clamp-1]
    [qty label — "X.XX | qty 1x Name"]
    [bulk applied badge — color-success if pricing.bulkAppliedUnits > 0]
    [line total — "$X.XX"]
    [Remove button — color-error, hover:underline]
[Subtotal line — font-gothic, text-lg]
```

**Bulk Pricing Logic (in `getItemPricing()`):**
```
BULK_DISCOUNT_THRESHOLD = 10 units
Regular price: item.price (floor to $1 minimum)
Bulk price: item.bulkPrice
If quantity <= 10: all at regular price
If quantity > 10: first 10 at regular, rest at bulk
  regularUnits = min(quantity, 10)
  bulkUnits = quantity - regularUnits
  lineTotal = regularUnits * regularPrice + bulkUnits * bulkPrice
```

**Right Panel (Checkout):**

**Section A — Discord Status:**
```
[If logged in:]
  [CheckBadgeIcon green] [username] + "Sign Out" link
[If not logged in:]
  [Info text: "Discord login optional..."]
  [Link via Discord Web button — #5865F2]
  [Link via Discord App button — bg-elevated]  (desktop only)
```

**Section B — Checkout Flow Steps:**
```
[1] Checkout — ClipboardDocumentListIcon blue
[2] Pay — BanknotesIcon accent
[3] Link accounts — CurrencyDollarIcon green
[4] Create ticket — TicketIcon green
```

**Section C — Coupon:**
```
[input — text, uppercase transform]
[Apply button]
[Error: color-error, 11px]
[Success: color-success, "Applied CODE (-X%)"]
```

**Section D — Price Breakdown:**
```
Subtotal: $XX.XX
Discount: -$XX.XX  (red)
Total after discount: $XX.XX  (bold)
```

**Section E — Checkout Button:**
```
[disabled states:] cart empty OR isProcessing OR total <= 0
[text:] "Processing..." or "Checkout"
[onClick:] → POST /api/shop/checkout → redirect to /pay?orderId=X
[on error:]
  - Timeout (ECONNABORTED): alert "Checkout timeout..."
  - 401: alert "Login expired"
  - USER_NOT_IN_GUILD: showJoinModal with invite link
  - Other: alert "Checkout Failed: ..."
```

**Join Discord Modal:** Absolute overlay, invite link button, close button

**Join Discord Flow:**
- `getOAuthUrl()` builds: `https://discord.com/oauth2/authorize?client_id=X&redirect_uri=Y&response_type=code&scope=identify+guilds.join`
- Sets `localStorage.discordLinkMethod = 'web'` or `'app'`
- If mobile OR method=app: `discord://-/oauth2/authorize?...` + fallback `window.open(https)`

**Toast Notification:** Shows on `addToCart` — green dot + message, `fixed bottom-8`, `z-100`, `toast-animate` CSS, auto-dismiss 3000ms

---

### 1.5 PAYMENT PAGE (`PaymentPage.jsx` — 982 lines)

**URL:** `/pay?orderId=X&paid=1` (paid=1 sets paid state)

**States (top-level):**
```
[loading: orderInfoLoading + loading spinner]
[error: orderInfoError or !orderInfo → error card]
[no orderId → "Invalid payment link"]
```

**State variables:**
```
ltcData, ltcLoading, ticketLoading, paid (from URL)
orderInfo, orderInfoLoading, orderInfoError
paypalFFData, paypalFFLoading, paypalTicketLoading
cashAppData, ticketRetryInSeconds, paypalTicketRetryInSeconds, ltcTicketRetryInSeconds
robloxUsername, robloxResult, robloxLoading
customerCountry, deliverySlots, slotsLoading
confirmingDelivery, confirmCoupon, autoOpenedChannelRef
```

**Step 1: Load order info on mount**
```
GET /api/shop/order-payment-info?orderId=X
  timeout: 15000ms
  on 401: "Session expired. Please login Discord again."
  on 403: "You do not have access to this order."
  on 404: "Order not found."
Sets: orderInfo, paid (if isPaid), channelId (auto-open Discord ticket), ticket status polling
```

**Order Info Polling:** If `ticketMode === 'bot'` && `ticketStatus === 'creating'` && no channelId → poll every 2000ms (max 12 attempts)

**Step 2A: UNPAID State — Payment Methods**

**PayPal F&F Button:**
```
onClick → POST /api/shop/create-payment { orderId, method: 'paypal_ff' }
  → sets paypalFFData { email, memoExpected, channelId }
Shows PayPal guide card:
  [Title: "PayPal Payment Guide"]
  [Method: Friends and Family]
  [Send $X.XX to: EMAIL with Copy button]
  [Steps: 1.Choose F&F 2.Write NOTE 3.Send screenshot]
  [Create PayPal Ticket button]
    → POST /api/shop/create-ticket-paypal-ff { orderId }
    → on success: open Discord channel, update orderInfo
    → on 409/429: show retry countdown
```

**Cash App Button:**
```
onClick → sets cashAppData { handle: '$yoko276' }
Shows Cash App guide card:
  [Amount: total * 1.10, 10% conversion fee warning]
  [Send to: $yoko276 with Copy button]
  [Create CashApp Ticket button]
    → POST /api/shop/create-ticket { orderId }
    → similar retry/429 handling
```

**LTC (Litecoin) Button:**
```
onClick → POST /api/shop/create-payment { orderId, method: 'ltc' }
  → sets ltcData { payAddress, qrImageUrl, payAmount }
Shows LTC guide card:
  [Send equivalent of $X.XX in LTC to: ADDRESS]
  [Copy LTC Address button]
  [QR image: ltcData.qrImageUrl || /pictures/payments/ltc.png]
  [Create LTC Ticket button]
```

**Step 2B: PAID State — Delivery Flow**

After payment confirmed (API sets `paid=true`), four steps appear:

**Step 1: Discord Login** (if not linked)
```
If orderInfo.discordId exists → show "Linked: {username}" (green)
Else → Discord Login button (#5865F2)
```

**Step 2: Select Delivery Slot**
```
Country selector → timezone mapping (COUNTRY_TIMEZONES)
"Refresh delivery slots" button
Grouped by date: [dateLabel] → [time slot buttons]
  Each slot shows: customerStartText – customerEndText (local TZ)
  Owner: ownerStartText – ownerEndText (owner TZ, ownerTimezone)
  → POST /api/shop/orders/:orderId/delivery-slot { slotId, customerTimezone }
If slot already selected: show selected slot info
```

**Step 3: Link Roblox Account**
```
Search input + Search button
  → GET /api/shop/roblox/search?username=X
  → shows: robloxUsername, robloxUserId, robloxDisplayName
  → "This is my account" confirm button
    → POST /api/shop/orders/:orderId/link-roblox { robloxUsername, robloxUserId, robloxDisplayName }
If linked: show "Linked: username (userId)"
```

**Step 4: Create/Open Ticket**
```
Button disabled unless Discord linked + slot selected
→ POST /api/shop/create-ticket { orderId }
→ opens Discord channel
→ if orderInfo.channelId exists: "Open Ticket" (green)
```

**Delivery Confirmation Block** (appears if `confirmationRequestedAt` && !`confirmedAt`):
```
Red warning box
"Only press confirm if you are sure you received your items."
→ POST /api/shop/orders/:orderId/confirm-delivery
→ returns couponCode → shows green box "Your 5% next-order coupon: CODE"
```

**Retry Countdown Timers:** `ticketRetryInSeconds`, `paypalTicketRetryInSeconds`, `ltcTicketRetryInSeconds` — each in separate `useEffect` with `setInterval` decrement

**Error Handling:**
- `getHttpErrorMessage()` handles: `TICKET_CREATION_IN_PROGRESS`, `DISCORD_RATE_LIMITED`, timeout, generic
- `getRetryAfterMsFromError()` reads `retryAfterMs`, `retryAfterSeconds` from body + `retry-after` header

**Discord Channel Opening:**
```
openTicketChannel(channelId):
  guildId from VITE_DISCORD_GUILD_ID
  If mobile OR linkMethod=app: discord://-/{GUILD}/{CHANNEL} + fallback window.open(https)
  Else: window.open(https://discord.com/channels/{GUILD}/{CHANNEL})
```

---

### 1.6 WALLET PAGE (`WalletPage.jsx` — 547 lines)

**URL:** `/wallet`

**Unauthenticated State:** Full-page card with UserCircleIcon (#5865F2), "Link Discord to view your balance...", Discord login button

**Authenticated State (2-column grid):**

**Left Column — Balance + Top-up Form:**
```
[Balance card:]
  [BanknotesIcon green] [Available balance label]
  [$XX.XX font-gothic, text-3xl]
[Topup Form:]
  Method selector: 3 buttons (PayPal F&F, Cash App Pay, Litecoin)
  Amount input: number, min=1, step=0.01
  [Continue to Payment button]
  
[Payment instructions (after createTopup):]
  If method=paypal_ff: shows destination + memoExpected + Copy buttons + QR (LTC)
  If method=cashapp: CashAppPayPanel component (Square SDK integration)
  If method=ltc: shows address + memoExpected + Copy + QR
  [Pending auto-refresh: every 10s if has pending deposit]
```

**CashAppPay Panel (Square SDK):**
```
loadSquareScript(environment) — loads https://web.squarecdn.com/v1/square.js
Creates payments = Square.payments(applicationId, locationId)
Creates cashAppPay = payments.cashAppPay(paymentRequest, { redirectURL, referenceId })
Attaches to #cash-app-pay-{topupId}
ontokenization event:
  → POST /api/shop/wallet/topup/square/{topupId}/complete { sourceId }
  → if success: show "Payment confirmed. Wallet balance updated."
  → else: show "Waiting for provider confirmation..."
destroy() on unmount
```

**Right Column — Transaction History:**
```
[h2 "Transaction History"]
[Transaction rows — divider-separated]
  Per item:
    [status badge: pending=gold/clock, completed=green/check, rejected=cancelled=red/x]
    [type — "Purchase - METHOD" or "Deposit - METHOD"]
    [referenceCode/orderId/txnId + formatDate(createdAt)]
    [items summary: "X quantity x Name, Y quantity x Name"]
    [memoExpected if any]
    [Amount: +$X.XX (green) or -$X.XX (red)]
[Empty state: "No wallet activity yet."]
```

**Create Topup Flow:**
```
POST /api/shop/wallet/topup { method, amount }
Returns: { topup: {...}, instructions: {...} }
Instructions shape:
  paypal_ff: { destination, memoExpected }
  cashapp: { square: { applicationId, locationId, environment }, referenceId }
  ltc: { payAddress, payAmount, payCurrency, qrImageUrl }
```

**Auto-refresh:** `setInterval(fetchWallet, 10000)` if `hasPendingDeposit === true` (pending topup exists)

---

### 1.7 PROOFS PAGE (`ProofsPage.jsx` — 358 lines)

**URL:** `/proofs`

**Header Section:**
```
[Badge: "Verified Deliveries"]
[h1: "Proof of Delivery" — 4xl/6xl font-gothic]
[p: "Every completed order is logged..." — serif, max-w-3xl]
[Discord Vouch Channel link] (from VITE_DISCORD_VOUCH_URL)
[Back to Home link]
```

**Grid Layout:** `grid-cols-3` (responsive: 1 → 2 → 3)

**Per Proof Card:**
```
[Image container: h-56, object-cover, lazy]
  [Image with ProofImage fallback]
  [Badge: "X photos" if > 1 image]
[Content:]
  [Items: first 3 shown, "+X more" if > 3]
  [Total: color-accent, $XX.XX]
  [ClockIcon + formatAgo(createdAt)]
[Owner-only: Delete button]
```

**Image Modal (on card click):**
```
Fixed overlay, z-90, bg-black/80, backdrop-blur
[Max 6xl width, grid 60/40 split]
[Left: image viewer]
  [prev/next arrows if > 1 image]
  [Image: max-h-72vh, object-contain]
[Right: info panel]
  [Order Proof h3]
  [$XX.XX total]
  [Item list: per item in rounded bg-secondary card]
  [Image X/Y counter]
```

**Auto-refresh:** Every 15 seconds + on tab visibility change

**API:** `GET /api/shop/proofs?limit=48&t={timestamp}` — no auth required (public)

**Owner check:** `GET /api/shop/check-owner` → enables delete button

---

### 1.8 ADMIN LOGIN PAGE (`AdminLogin.jsx` — 45 lines)

**Layout:** Centered card, full-height flex
```
[h2: "Admin Access"]
[password input — border, focus:outline-none]
[Login button — bg-elevated, hover:text-error]
[on success → navigate('/admin/orders.php')]
[on error → alert(message)]
[if already logged in as admin → redirect to /admin/orders.php]
```

---

### 1.9 ADMIN DASHBOARD (`AdminDashboard.jsx` — 187 lines)

**URL:** `/admin/orders.php`

**Protected:** Checks `isAdminToken(token)` from localStorage. Redirect to `/admin/login` if not.

**Stats Row (3 cards):**
```
Total Revenue: stats.revenue (formatted $)
Total Orders: stats.orders (number)
Users Linked: stats.users (number)
```

**Recent Orders Table:**
```
Columns: ID, User, Email, Total, Payment, Memo, Txn, Actions
Per row:
  [orderId — color-accent, mono font]
  [discordUsername or discordId]
  [customerEmail or '-']
  [totalAmount $XX.XX]
  [paymentStatus badge + paymentMethod]
  [memoExpected or '-']
  [txnId or '-']
  [Actions:]

Actions per row:
  [Kiểm tra IPN thủ công] — POST /admin/order/:id/recheck-ipn
  [Xác nhận thủ công] (if not paid) — POST /admin/order/:id/mark-paid
    → prompts for PayPal transaction ID + optional note
  [Hủy đơn] (if not cancelled) — PUT /admin/order/:id { status: 'Cancelled' }
```

---

### 1.10 ADMIN ORDERS PAGE (`AdminOrders.jsx` — 1281 lines) [MAIN ADMIN PANEL]

**URL:** `/admin` (after owner check via `GET /api/shop/check-owner`)

**Protected:** Checks Discord OAuth session + owner role in guild. Redirect to `/` if not owner.

**Tabs:** `orders | slots | products | games | homepage`

---

**TAB: Orders & Wallet**

**Search bar:** Searches across `orderId, customerEmail, discordId, discordUsername, txnId, paymentMethod`

**Section 1 — Confirmed Orders Table:**
```
Columns: Order | Discord | Roblox | Total | Paid/Delivered/Confirmed | Evidence | Coupon
Per row:
  orderId (mono, accent), discordUsername, robloxUsername
  $totalAmount, dates: paidAt, deliveredAt, confirmedAt
  confirmIp, confirmUa (10px)
  couponCode (green, mono)
```

**Section 2 — Pending Provider Confirmations:**
```
Per topup:
  [status badge — pending=gold/clock, completed=green, rejected=cancelled=red]
  [referenceCode + +$XX.XX]
  [discordUsername, methodLabel]
  [paymentAddress, memoExpected, createdAt]
  [No action buttons — "Waiting for PayPal, Square, or NOWPayments confirmation"]
```

**Section 3 — Wallet Transactions Table:**
```
Columns: Time | User | Type | Amount | Status | Reference
Per row:
  formatDate(createdAt), discordUsername
  type / methodLabel
  [+$XX.XX green] or [-$XX.XX red]
  status badge
  referenceCode/orderId/txnId
```

**Section 4 — Orders Table:**
```
Columns: Order | Customer | Total | Payment | Ticket | Time
Per row:
  orderId (mono, accent)
  discordUsername
  $totalAmount
  paymentStatus badge + paymentMethod
  ticketStatus or '-'
  createdAt
```

---

**TAB: Delivery Slots**

**Create Slots Form:**
```
Owner Timezone: select dropdown (COUNTRY_TIMEZONES) + manual text input
Date: date picker
Time ranges (repeatable):
  Start time (time input)
  End time (time input)
  Note (optional text)
  [✕ Remove button if > 1 range]
[+ Add Range button]
[Create All Slots button]
  → POST /api/shop/delivery-slots/bulk { ownerTimezone, date, ranges[] }
```

**Manage Slots:**
```
Tab filter: Active (count) | Inactive (count) | Refresh
Table: Date/Time | Owner TZ | Note | Actions
Per slot:
  [Deactivate/Activate button — toggles active state]
  [Delete button]
  → PATCH /api/shop/delivery-slots/:id { active: boolean }
  → DELETE /api/shop/delivery-slots/:id
```

---

**TAB: Products**

**Product Form Panel (collapsible):**
```
[Left column:]
  Name input (required)
  Price input (number, required, > 0)
  Bulk Price input (optional)
  Category select: Chest, Reroll, Sets, Other
  Game select: dropdown of games + "No Game" option
  Description textarea (optional)
[Right column:]
  Image preview (if selected)
  [Choose from Library button] — shows grid of all uploaded images (4 columns)
    → fetches from GET /api/shop/owner/product-images
  [Upload New button] — file input, POST /api/shop/owner/product-images/upload
  [Save Changes / Add Product button]
    → POST or PUT /api/shop/owner/products
    → Invalidates localStorage 'productsCache'
```

**Products Table:**
```
Columns: Image | Name | Category | Price | Bulk | Actions
[Edit button] → populates form
[Delete button] → confirm dialog → DELETE /api/shop/owner/products/:id
```

---

**TAB: Games**

**Add/Edit Game Form:**
```
Name input (required)
Slug input (auto-slugified, lowercase, dashes only)
Active checkbox
[Add Game / Update Game button]
  → POST/PUT /api/shop/owner/games
```

**Games Table:**
```
Columns: Name | Slug | Status | Actions
Per game:
  name (font-gothic)
  slug (mono, 12px)
  Active badge (green) / Inactive badge (red)
  Edit / Delete buttons
```

---

**TAB: Homepage**

**Banner Management:**
```
[Preview grid: 2x3 responsive, 96px h, object-cover]
  [Delete button on hover: red x, top-right corner]
  → DELETE /api/shop/owner/config/banners { bannerUrl }
[Upload Banner button — file input]
  → POST /api/shop/owner/config/banners/upload (multipart)
  → returns updated banners[]
```

**Best Sellers Management:**
```
Checkbox list of all products
Click to toggle selection
→ PUT /api/shop/owner/config/best-sellers { bestSellerIds[] }
Selected items: bg-accent/10, checkmark icon
Per item: image (32x32) + name + category + price
```

---

### 1.11 AUTH CALLBACK PAGE (`AuthCallback.jsx` — 379 lines)

**URL:** `/auth/discord/callback?code=X&state=Y` (or `?error=...&error_description=...`)

**OAuth Error Handling:**
```
If error param exists:
  status = "Discord authorization was not completed"
  debugInfo = error_description
  canRetry = true, needsFreshOauth = true
```

**Auth Flow:**
```
1. Extract code from URL params
2. POST /api/shop/auth/discord { code, redirect_uri }
   (falls back to POST /api/discord-exchange if 404/405)
   timeout: 15000ms, max 2 retries
3. On success: call loginDiscord(userData, token) → redirect to /
4. On retry-able error (timeout): exponential backoff (2000ms → max 15000ms)
5. On permanent error: show debugInfo + Retry/Login Again button
```

**Error Classifications:**
```
invalid_client → Discord app credentials invalid
DISCORD_RATE_LIMIT / 429 → show retry countdown
503 → backend unavailable
invalid grant / code → OAuth code expired, need fresh login
ECONNABORTED → timeout
```

**Retry Logic:**
```
BASE_RETRY_DELAY_MS = 2000
MAX_RETRY_DELAY_MS = 15000
Backoff: min(MAX, base * 2^attempt)
Respects Retry-After header from Discord API
```

**State Variables:**
```
nonce — forces re-run of auth effect
status — current status message
debugInfo — error details shown in red box
canRetry — enables retry button
retryInSeconds — countdown timer for rate limits
needsFreshOauth — if true, retry goes to Discord OAuth (new code needed)
```

---

### 1.12 NAVBAR (`Navbar.jsx` — 165 lines)

**Layout:** Fixed top, full-width, backdrop-blur-md, border-b

**Logo:** `site-logo.png` from `VITE_SITE_LOGO` or `/site-logo.png` fallback

**Desktop nav links (useMemo):**
```
[Proofs] — internal or external (VITE_PROOFS_URL)
[Discord] — external, from VITE_DISCORD_INVITE_URL
[Wallet] — only if user.discordId exists
[Admin] — only if isOwner === true
```

**isOwner check:** `GET /api/shop/check-owner` on `user.discordId` change

**Discord URL Resolution:**
```
VITE_DISCORD_INVITE_URL → Discord server invite
OR VITE_DISCORD_VOUCH_URL → Discord server invite
OR default: https://discord.gg/nosmarket
```

**Right side:**
```
[Shopping bag icon] + cart count badge (accent color, 10px)
[Theme toggle] — SunIcon/MoonIcon, bg-elevated, rounded-pill
[Mobile menu] — Bars3Icon/XMarkIcon, toggles mobile dropdown
```

**Mobile dropdown:** Absolute, lists all navLinks

---

## PART 2: COMPLETE BACKEND API ANALYSIS

### 2.1 ALL API ENDPOINTS (shopRoutes.js — 3800+ lines)

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/shop/products` | Public | Global | List all products |
| GET | `/api/shop/games` | Public | Global | List all games |
| GET | `/api/shop/config` | Public | Global | ShopConfig singleton |
| GET | `/api/shop/recent-purchases?limit=N` | Public | Global | Completed orders ticker |
| GET | `/api/shop/proofs?limit=N&t=TIMESTAMP` | Public | Global | Public proof gallery |
| DELETE | `/api/shop/proofs/:id` | Owner | Global | Delete proof |
| GET | `/api/shop/order-payment-info?orderId=X` | User | Global | Get order info for payment page |
| POST | `/api/shop/checkout` | Discord JWT | checkoutLimiter | Create order from cart |
| POST | `/api/shop/coupon/preview` | Any | Global | Preview coupon discount |
| POST | `/api/shop/create-payment` | User | checkoutLimiter | Generate payment info (LTC) |
| POST | `/api/shop/create-ticket` | User | Global | Create CashApp Discord ticket |
| POST | `/api/shop/create-ticket-paypal-ff` | User | Global | Create PayPal Discord ticket |
| POST | `/api/shop/create-ticket-ltc` | User | Global | Create LTC Discord ticket |
| GET | `/api/shop/delivery-slots?timezone=X` | Any | Global | List available slots |
| POST | `/api/shop/delivery-slots/bulk` | Owner | Global | Bulk create slots |
| PATCH | `/api/shop/delivery-slots/:id` | Owner | Global | Toggle slot active |
| DELETE | `/api/shop/delivery-slots/:id` | Owner | Global | Delete slot |
| GET | `/api/shop/delivery-slots/manage` | Owner | Global | List all slots for management |
| POST | `/api/shop/orders/:id/link-roblox` | User | Global | Link Roblox account |
| POST | `/api/shop/orders/:id/delivery-slot` | User | Global | Select delivery slot |
| POST | `/api/shop/orders/:id/confirm-delivery` | User | Global | Customer confirms delivery |
| GET | `/api/shop/roblox/search?username=X` | Any | Global | Roblox username lookup |
| GET | `/api/shop/wallet` | Discord JWT | Global | Get wallet + transactions |
| POST | `/api/shop/wallet/topup` | Discord JWT | Global | Create topup request |
| POST | `/api/shop/wallet/topup/square/:id/complete` | Any | Global | Complete Square/CashApp payment |
| GET | `/api/shop/wallet/admin` | Owner | Global | All pending topups + transactions |
| POST | `/api/shop/auth/discord` | Public | discordAuthLimiter | Exchange OAuth code |
| GET | `/api/shop/check-owner` | Any | Global | Check if Discord user is owner |
| GET | `/api/shop/orders` | Owner | Global | All orders list |
| GET | `/api/shop/owner/confirmed-orders` | Owner | Global | Completed+confirmed orders |
| GET | `/api/shop/owner/products` | Owner | Global | All products for admin |
| POST | `/api/shop/owner/products` | Owner | Global | Create product |
| PUT | `/api/shop/owner/products/:id` | Owner | Global | Update product |
| DELETE | `/api/shop/owner/products/:id` | Owner | Global | Delete product |
| GET | `/api/shop/owner/product-images` | Owner | Global | List uploaded images |
| POST | `/api/shop/owner/product-images/upload` | Owner | Global | Upload product image |
| GET | `/api/shop/owner/games` | Owner | Global | List all games |
| POST | `/api/shop/owner/games` | Owner | Global | Create game |
| PUT | `/api/shop/owner/games/:id` | Owner | Global | Update game |
| DELETE | `/api/shop/owner/games/:id` | Owner | Global | Delete game |
| PUT | `/api/shop/owner/config/best-sellers` | Owner | Global | Update best seller IDs |
| DELETE | `/api/shop/owner/config/banners` | Owner | Global | Delete banner |
| POST | `/api/shop/owner/config/banners/upload` | Owner | Global | Upload banner |
| POST | `/api/shop/webhook/nowpayments` | Signature | None | NOWPayments LTC IPN |
| POST | `/api/shop/webhook/square` | Signature | None | Square webhook |
| GET | `/api/shop/product-images/:filename` | Public | Global | Serve product image |
| GET | `/api/banners/:filename` | Public | Global | Serve banner image |

### 2.2 MIDDLEWARE

**Rate Limits:**
```
apiLimiter: 100 req/15min per IP (global)
checkoutLimiter: 10 req/15min per IP
discordAuthLimiter: 5 req/15min per IP
adminLoginLimiter: 5 req/15min per IP
```

**Auth Middleware:**
```
authRequired: requires Discord JWT Bearer token
  → verifyAnyJwtToken() → sets req.discordUserId + req.userId
  → used by: checkout, wallet, ticket creation
Optional auth: extract token if present, don't require
  → used by: order-payment-info, delivery-slots
```

### 2.3 SERVICES

**paymentService.js:**
```
createPayPalOrder(orderId, totalAmount, returnUrl, cancelUrl)
  → PayPal REST API v2 /checkout/orders
  → intent: CAPTURE
  → returns: { orderId, approvalLink }

capturePayPalOrder(paypalOrderId)
  → PayPal REST API capture
  → returns: { success, data }

createLTCInvoice(orderId, totalAmountUSD, options)
  → NOWPayments API v1/payment
  → pay_currency: 'ltc'
  → ipn_callback_url: options.ipnCallbackUrl
  → returns: { payAddress, payAmount, payCurrency, paymentId, paymentStatus }
```

**walletService.js:** `creditPendingWalletTopup()` — credits wallet when provider confirms payment

**squareService.js:** Cash App Pay via Square Web SDK v2

**paypalFfService.js:** `processPayPalIpnRequest(req)` — handles PayPal F&F IPN for PHP legacy

---

## PART 3: COMPLETE DISCORD BOT ANALYSIS (bot.js — 1970 lines)

### 3.1 BOT GATEWAY

**Intents:**
```
GatewayIntentBits.Guilds
GatewayIntentBits.GuildMessages
GatewayIntentBits.MessageContent
```

**Startup:** Bot.login() called from server.js if `DISCORD_BOT_TOKEN` set and not serverless runtime

**Events:**
```
clientReady → log.info('[DISCORD BOT] Bot is online')
error → log.error('[DISCORD BOT] Client error', { error })
disconnect → log.warn('[DISCORD BOT] Disconnected from gateway')
reconnecting → log.info('[DISCORD BOT] Reconnecting to gateway...')
interactionCreate → button handlers
messageCreate → command + auto-vouch handlers
```

### 3.2 BUTTON INTERACTIONS (interactionCreate)

**Button IDs handled:**
```
copy_paypal_email_{orderId}
copy_paypal_item_{orderId}
copy_cashapp_tag_{orderId}
copy_cashapp_item_{orderId}
copy_ltc_wallet_{orderId}
```

**Flow:** Fetch order from DB → map customId to value → ephemeral reply with copied value

**Error states:**
- Order not found → "Order not found." ephemeral
- General error → "Failed to process payment selection." ephemeral
- Logging to console.error

### 3.3 MESSAGE COMMANDS (messageCreate)

**Commands (case-insensitive):**

| Command | Permission | Action |
|---------|-----------|--------|
| `!close`, `/close`, `!dong`, `/dong` | ticket owner/staff | Close ticket channel after 3s delay |
| `!done`, `/done` | staff | Mark order completed, send DM, close channel |
| `!confirm`, `/confirm` | staff | Request customer confirmation via website |
| `!addall`, `/addall`, `!readdall`, `/readdall` | staff | Re-add all linked users to guild |

**Auto-Vouch Trigger:** Staff uploads image in ticket channel → downloads images → posts to vouch channel → saves Proof record

**Permission Check:** `isStaffUser(discordId)` = owner ID OR has owner role

### 3.4 TICKET CREATION FLOW

**Permission Bits:**
```
PERM_VIEW_CHANNEL_ONLY = 1n << 10n
PERM_TICKET_CHAT = VIEW + SEND + EMBED_LINKS + ATTACH_FILES + READ_MESSAGE_HISTORY + ADD_REACTIONS
```

**Permission Overwrites:**
```
1. Guild: DENY view_channel
2. Customer (discordId): ALLOW PERM_TICKET_CHAT
3. Owner Role (if configured): ALLOW PERM_TICKET_CHAT
4. Bot Self: ALLOW PERM_TICKET_CHAT
```

**Guild Join Check:** Before channel creation, verifies user is in guild via `GET /guilds/{guildId}/members/{userId}`

**Channel Name Sanitization:**
```
1. toLowerCase()
2. Replace [^a-z0-9-_] with '-'
3. Collapse multiple dashes
4. Trim leading/trailing dashes
5. Max 90 chars
6. Fallback: 'ticket-{timestamp}'
```

**Queue System:** `runTicketCreateQueued()` chains all ticket creates with:
- Minimum gap: 3500ms (configurable via `DISCORD_TICKET_CREATE_MIN_GAP_MS`)
- Cooldown: from Discord rate limit headers
- Retry: 2 retries, 900ms base delay, 5000ms max delay

**Payloads:** Tries primary (with category) first, falls back to secondary (without category)

### 3.5 EMBEDS

**PayPal Ticket Embed:**
```
Color: 0x8ED3FF (light blue)
Title: "PayPal Payment"
Fields:
  Buyer: <@discordId> (inline)
  Owner Role: <@&ownerRoleId> (inline)
  Order Total: $XX.XX (inline)
  Payment: "$XX.XX to EMAIL (Friends & Family)"
  Items (Qty + Price): formatted item list
  Proof: "Send your payment screenshot..."
  Note: PayPal note: MEMO
Content: owner/staff mention
```

**LTC Ticket Embed:**
```
Color: 0xF5F7FA (near white)
Title: "LTC Payment"
Fields:
  Buyer, Owner Role, Order Total, Payment, Items, Proof
  Payment: "$XX.XX equivalent LTC to ADDRESS"
Content: owner/staff mention
```

**Order Delivery Ticket Embed:**
```
Color: 0xA7EFC0 (light green)
Title: "Order Delivery"
Fields:
  Roblox Account: username (userId) (inline)
  Discord Account: <@discordId> (inline)
  Order Total: $XX.XX (inline)
  Items (Qty + Price): formatted
  Owner Delivery Time: formatted datetime range
  Customer Selected Time: formatted datetime range
Content: owner/staff mention
```

**Wallet Delivery Ticket Embed:**
```
Same as Order Delivery but:
  Title: "Order Delivery" (wallet variant)
  Additional field: "Order ID: ORDERID"
  Payment field: "Paid with NosMarket wallet"
```

**Wallet Top-up Notification Embed:**
```
Color: 0xF7C948 (gold)
Title: "Wallet Top-up Pending"
Fields:
  Customer: <@discordId> or username (inline)
  Amount: $XX.XX (inline)
  Method: formatted method label (inline)
  Reference: referenceCode (inline)
  Memo: memoExpected
```

**Vouch Content (auto-vouch):**
```
Content: <@discordId>
  FORMATTED_ITEM_LINES (bold, uppercase)
  "Enjoy your ITEMNAMES"
  "Please leave us a vouch ❤️"
(Max 1900 chars)
```

**Thank You DM:**
```
✨ Thank You for Your Purchase ✨
"We sincerely appreciate your order..."
📦 Purchased Item: [ITEMS]
"If you require any additional items..."
💎 Thank you once again for your support and trust.
— Nos Team
```

### 3.6 COPY BUTTONS

**PayPal:** Copy PayPal Email, Copy PayPal Note

**Cash App:** Copy CashApp Tag, Copy Item Name

**LTC:** Copy LTC Address

Each creates ButtonBuilder with ButtonStyle.Secondary, max 5 per ActionRow

### 3.7 ADD-ALL COMMAND

**Flow:**
1. Fetch all linked users from DB (discordId exists, sorted by username)
2. Generate `linked-users-{guildId}.txt` attachment with user list
3. Reply with count + attachment
4. Update progress message every 100 users
5. Concurrency: 4 parallel (configurable via `DISCORD_ADDALL_CONCURRENCY`)
6. Max 3 retries per user
7. Final summary: Added, Already in server, Skipped (no token), Failed

### 3.8 AUTO-VOUCH PIPELINE

```
1. Staff uploads image(s) in ticket channel
2. Bot detects image attachments
3. For each batch of up to 10 images:
   a. Download image from Discord CDN (timeout 15s, max 25MB)
   b. Create AttachmentBuilder
   c. Send to vouch channel with vouch content header (first message only)
   d. Collect uploaded attachment URLs
4. Save Proof record with uploaded URLs + image buffers (SHA256 hashes)
5. Save ProofImage records (upsert by proofId + position)
6. Reply in ticket: "Vouch posted successfully (X images)."
```

### 3.9 OAUTH TOKEN REFRESH

```
On guild join request:
1. Check token expiry (expiresAt - 60s buffer)
2. If valid → use accessToken
3. If expired → POST /oauth2/token with refresh_token
4. Save new tokens to DB (encrypted)
5. If refresh fails → skip this user
```

### 3.10 ERROR HANDLING

**DiscordBotError class:**
```javascript
{ message, status (HTTP), code, data, retryAfterSeconds }
```

**Retry Strategy:**
```
maxRetries: 2
baseDelayMs: 800
maxDelayMs: 10000
noRetry for: token lookup, channel create
```

**Rate Limit Handling:**
```
429 → setTicketCreateCooldownSeconds(retryAfterSeconds) + throw
Cloudflare 403 → retry after 30s (assume temporary block)
500/503 → retry up to maxRetries
```

---

## PART 4: COMPLETE DATABASE ANALYSIS

### 4.1 MONGOOSE MODELS

**User:**
```javascript
{
  discordId: String (unique, required),
  discordUsername: String (required),
  accessToken: String (encrypted),
  refreshToken: String (encrypted),
  tokenExpiresAt: Date,
  scopes: [String],
  walletBalanceCents: Number (default 0),
  linkToken: String,
  linkTokenExpiresAt: Date,
  joinedAt: Date (default now)
}
```

**Order:**
```javascript
{
  orderId: String (unique),
  // Customer info
  customerEmail: String (lowercase),
  discordId: String, discordUsername: String,
  robloxUserId: String, robloxUsername: String, robloxDisplayName: String, robloxVerifiedAt: Date,
  // Delivery
  deliverySlotId: ObjectId, deliveryOwnerTimezone: String,
  deliveryOwnerStartAt: Date, deliveryOwnerEndAt: Date,
  deliveryCustomerTimezone: String,
  deliveryCustomerStartAt: Date, deliveryCustomerEndAt: Date,
  deliveredAt: Date, confirmationRequestedAt: Date, confirmationRequestedBy: String,
  confirmedAt: Date, confirmIp: String, confirmUa: String, confirmationDiscountCode: String,
  // Items
  items: [{ product: ObjectId, name: String, quantity: Number, price: Number }],
  products: [Mixed] (denormalized copy),
  subtotalAmount: Number, discountAmount: Number, discountPercent: Number,
  couponCode: String, total: Number, totalAmount: Number (required),
  // Payment
  status: enum['Pending','Waiting Payment','Completed','Cancelled'],
  paymentMethod: String, paymentStatus: enum['pending','paid','cancelled'],
  memoExpected: String, txnId: String, paidAt: Date,
  manualPaymentNote: String, manualPaymentConfirmedBy: String,
  ipnLogId: ObjectId, paypalOrderId: String,
  // Ticket
  channelId: String, ticketStatus: enum['pending','creating','created','ready','failed','panel'],
  ticketLockUntil: Date, ticketError: String,
  paypalTicketChannel/Id: String, paypalTicketStatus: enum, paypalTicketLockUntil: Date, paypalTicketError: String,
  ltcTicketChannel/Id: String, ltcTicketStatus: enum, ltcTicketLockUntil: Date, ltcTicketError: String
}
Indexes: discordId, robloxUserId, createdAt DESC, paymentMethod+paymentStatus+createdAt, memoExpected, confirmationDiscountCode
```

**Product:**
```javascript
{ name, price (required), originalPriceString, bulkPrice, bulkPriceString,
  image (required), desc, category (required), gameId: ObjectId }
```

**Game:**
```javascript
{ name, slug (unique), icon, banner, description, isActive }
```

**DeliverySlot:**
```javascript
{ startAt: Date (required), endAt: Date (required),
  ownerTimezone: String, customerTimezone: String,
  note: String, active: Boolean (default true) }
```

**WalletTransaction:**
```javascript
{ userId: ObjectId, type: enum['topup','purchase','adjustment'],
  amountCents: Number (required), balanceBeforeCents: Number,
  balanceAfterCents: Number, method: String,
  status: enum['pending','completed','rejected','cancelled'],
  referenceCode: String, orderId: String,
  paymentAddress: String, memoExpected: String,
  discordId: String, discordUsername: String,
  direction: enum['credit','debit'], createdAt }
```

**PaymentLog:**
```javascript
{ txnId: String, orderId: String, status: String,
  rawBody: String, createdAt }
```

**Proof:**
```javascript
{ orderId: String, discordId: String, discordUsername: String,
  totalAmount: Number, items: [{ name, packQuantity, deliveredLabel, lineTotal }],
  imageUrls: [String], imageHashes: [String],
  vouchMessageIds: [String], source: enum['auto_vouch'] }
```

**ProofImage:**
```javascript
{ proofId: ObjectId, orderId: String, position: Number,
  contentType: String, data: Buffer, sourceUrl: String }
```

**ShopConfig:**
```javascript
{ key: String (unique), value: Mixed, updatedAt }
```
Stored as: `{key: 'homepage', value: {banners: [], bestSellerIds: []}}`

**Counter:**
```javascript
{ _id: String ('orderId'), seq: Number }
```

---

## PART 5: REBUILD ARCHITECTURE PLAN

### 5.1 NEW MONOREPO STRUCTURE

```
gaming-shop-full/
├── apps/
│   ├── web/                    # Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
│   └── api/                    # NestJS + TypeScript + Prisma + PostgreSQL
├── packages/
│   ├── shared/                 # Prisma schema + Zod schemas + TypeScript types
│   └── config/                 # Shared tsconfig, eslint, prettier
├── services/
│   └── bot/                    # discord.js v14 bot (standalone Node process)
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   └── monitoring/
└── .github/workflows/
```

### 5.2 DATABASE REBUILD (Prisma + PostgreSQL)

Complete schema including all current models plus new enterprise-grade additions:

**Core entities:** User, Session, Game, Category, Product, Order, OrderItem, OrderTimeline, WalletTransaction, PaymentAttempt, DeliveryProof, DeliveryProofImage, DeliverySlot, Ticket, TicketMessage, AdminLog, FraudCase, AuditLog, ShopConfig, Notification, Blacklist, ApiKey, WebhookLog

**Key improvements:**
- PostgreSQL with proper indexing
- Transactions for order creation
- Soft deletes on critical records
- Audit logs for every state change
- Fraud scoring with evidence chain
- Session management with device tracking
- API keys for webhook authentication
- Full-text search on products/orders

### 5.3 FRONTEND REBUILD

**Next.js 14 App Router:**
- `app/(public)/` — Home, Products, Proofs, Payment, Wallet
- `app/(auth)/` — Login, AuthCallback
- `app/(dashboard)/` — Admin Dashboard, Orders, Products, Games, Homepage Config, Tickets, Analytics
- `app/api/` — Route handlers for static pages
- `app/providers.tsx` — All context providers (Auth, Shop, Theme, Socket)

**Components (shadcn/ui + custom gaming components):**
- `components/ui/` — Button, Input, Select, Dialog, Sheet, DropdownMenu, etc. (shadcn)
- `components/layout/` — Navbar, Footer, MobileNav, Sidebar
- `components/shop/` — ProductCard, ProductDetail, CartSheet, QuantitySelector, CategoryFilter, GameSelector, SearchBar
- `components/payment/` — PaymentMethods, PayPalGuide, CashAppGuide, LTCGuide, DeliverySlotPicker, RobloxLinker
- `components/wallet/` — BalanceCard, TopupForm, TransactionList, CashAppPayPanel
- `components/proofs/` — ProofGrid, ProofCard, ProofModal, ImageGallery
- `components/admin/` — StatsCards, OrderTable, ProductForm, GameForm, SlotManager, BannerUploader, BestSellerSelector
- `components/discord/` — DiscordLogin, ServerInvite, TicketChannel
- `components/realtime/` — TickerBanner, LiveIndicator, SyncStatus

**Hooks:**
- `useAuth()` — Full auth state + login/logout/refreshtoken
- `useCart()` — Cart state + localStorage sync
- `useSocket()` — Socket.io connection management
- `useShop()` — Products, games, config with SWR caching
- `useWallet()` — Balance + transactions
- `useOrders()` — Order creation + status
- `useRealtimeStock()` — Live stock updates
- `useToast()` — Toast notifications

**State:** Zustand stores (auth, cart, shop, ui) + SWR for server data

### 5.4 BACKEND REBUILD

**NestJS Modules:**

| Module | Controllers | Services | Description |
|--------|-------------|----------|-------------|
| `auth` | DiscordOAuthController, AdminAuthController | DiscordOAuthService, AdminAuthService, SessionService | OAuth, JWT, sessions |
| `users` | UsersController | UsersService | User CRUD, profile, permissions |
| `products` | ProductsController | ProductsService, CategoryService, GameService | Catalog management |
| `orders` | OrdersController | OrdersService, CheckoutService | Full order lifecycle |
| `payments` | PaymentsController | PaymentsService, WalletService, WebhookService | Payments + wallet |
| `tickets` | TicketsController | TicketsService | Support tickets |
| `admin` | AdminController, StatsController | AdminService, AnalyticsService | Admin operations |
| `notifications` | NotificationsController | NotificationsService | Real-time notifications |
| `realtime` | GatewayModule | StockGateway, OrderGateway | Socket.io |
| `fraud` | FraudController | FraudDetectionService | Fraud analysis |
| `media` | MediaController | MediaService, ImgbbService | File uploads |

**Global Middleware:** Rate limiting (Bull), validation (class-validator), logging (Pino), security (Helmet, CORS), caching (Redis)

**Queues (Bull):**
- `order-created` — notify staff, create ticket
- `payment-confirmed` — credit wallet, create delivery ticket
- `payment-failed` — cancel reservation, notify user
- `fraud-check` — async fraud scoring
- `proof-generation` — process delivery images
- `session-cleanup` — revoke expired sessions
- `retry-webhook` — retry failed webhooks with backoff

### 5.5 DISCORD BOT REBUILD

**Architecture:** Standalone Node.js process with discord.js v14

**Command System:**
```
src/
├── commands/
│   ├── ticket.ts         — /ticket create/close/list
│   ├── verify.ts         — /verify
│   ├── order.ts          — /order status/info
│   ├── stock.ts          — /stock check
│   ├── wallet.ts         — /wallet balance
│   ├── stats.ts          — /stats
│   └── admin/
│       ├── addall.ts
│       ├── reload.ts
│       ├── config.ts
│       └── maintenance.ts
├── components/
│   ├── buttons/
│   │   ├── copyValue.ts     — Copy PayPal/CashApp/LTC
│   │   ├── ticketActions.ts — Confirm/Done/Close
│   │   └── paymentSelect.ts
│   ├── selectMenus/
│   │   └── ticketCategory.ts
│   └── modals/
│       └── deliveryConfirm.ts
├── services/
│   ├── TicketService.ts
│   ├── VerificationService.ts
│   ├── OrderNotificationService.ts
│   ├── VouchService.ts
│   ├── GuildSyncService.ts
│   └── EmbedService.ts
├── embeds/
│   ├── ticket.embed.ts
│   ├── payment.embed.ts
│   ├── delivery.embed.ts
│   ├── wallet.embed.ts
│   ├── vouch.embed.ts
│   └── error.embed.ts
└── events/
    ├── interactionCreate.ts
    ├── messageCreate.ts
    ├── guildMemberAdd.ts
    ├── guildMemberRemove.ts
    └── ready.ts
```

**Every single embed template:**
```typescript
// Payment Ticket Embed (PayPal)
{
  color: 0x8ED3FF,
  title: 'PayPal Payment',
  description: 'Hello <@{discordId}>. Please complete payment...',
  fields: [
    { name: 'Buyer', value: '<@{discordId}>', inline: true },
    { name: 'Order Total', value: '$XX.XX', inline: true },
    { name: 'Payment', value: '$XX.XX to EMAIL (F&F)', inline: false },
    { name: 'Items', value: formattedItems, inline: false },
    { name: 'Proof', value: 'Send screenshot...', inline: false }
  ],
  footer: { text: 'NosMarket | Order {orderId}' },
  timestamp: ISO8601
}

// Same pattern for LTC (0xF5F7FA), Delivery (0xA7EFC0), Wallet (0xF7C948)
// Each with precise field mapping, inline/separate layout
// Error embeds: 0xED4245
// Success embeds: 0x57F287
// Info embeds: 0x5865F2
```

### 5.6 DEPLOYMENT ARCHITECTURE

```
Vercel (web) ─────────────────┐
                               ├── Cloudflare (CDN + DDoS protection)
Render (api) ──────────────────┤     api.nosdan.store
                               ├── Cloudflare (CDN + SSL)
Discord Bot (PM2/Docker) ──────┤     discord bot process
                               │
PostgreSQL (Neon/Supabase) ────┤
Redis (Upstash) ────────────────┘
MongoDB (Atlas) ─── legacy data
```

### 5.7 IMPLEMENTATION PRIORITY

**Phase 1:** Foundation
1. Shared package: Prisma schema, Zod schemas, types
2. Next.js frontend shell: routing, auth, layout, providers
3. NestJS backend shell: modules, Prisma, guards, interceptors
4. Discord bot shell: commands, events, services structure
5. Infrastructure: Docker Compose, nginx, monitoring

**Phase 2:** Core Features
1. Auth system (Discord OAuth, JWT, sessions)
2. Product catalog (CRUD, categories, games)
3. Cart + Checkout flow
4. Payment integration (PayPal, CashApp, LTC)
5. Order lifecycle
6. Wallet system
7. Discord ticket creation
8. Admin dashboard

**Phase 3:** Enterprise Features
1. Real-time (Socket.io)
2. Ticket support system
3. Fraud detection
4. Analytics pipeline
5. Proof/delivery system
6. Notification system
7. Security hardening
8. Monitoring + alerting
9. CI/CD pipeline
10. Documentation