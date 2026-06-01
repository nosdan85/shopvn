# Payment Proof Log And Vouch Trigger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require customers to upload payment proof before creating PayPal/LTC tickets, send that proof and order summary to a configured Discord log channel, update that log to done when staff runs `!done`, and only auto-post proof/vouch when staff sends images with the exact `!` trigger.

**Architecture:** Keep ticket creation flow intact. Extend the existing PayPal/LTC ticket endpoints to accept multipart proof uploads, create the existing ticket, then send/update a separate payment-proof log message through the existing Discord bot client using env-configured guild/channel IDs. Tighten auto-vouch by gating image handling on explicit staff trigger text.

**Tech Stack:** Next.js app router frontend, Express API, MongoDB/Mongoose, multer, discord.js v14, Node test runner.

---

## Environment Variables

Add these to Render for the API/bot service:

```env
DISCORD_PAYMENT_LOG_GUILD_ID=server_id_moi
DISCORD_PAYMENT_LOG_CHANNEL_ID=channel_id_moi
PAYMENT_PROOF_MAX_MB=8
```

Bot permissions required in the new server/channel:

```text
View Channel
Send Messages
Attach Files
Embed Links
Read Message History
Manage Messages
```

`Manage Messages` is only needed if future cleanup/editing requires it; status update mainly needs `Read Message History` and message edit on messages sent by the bot.

---

## Files

- Modify: `api/models/Order.js`
- Modify: `api/routes/shopRoutes.js`
- Modify: `api/bot.js`
- Create: `api/utils/paymentProofLog.js`
- Create: `api/tests/paymentProofLog.test.js`
- Modify: `web/app/shop/page.tsx`
- Optional modify: `api/middleware/rateLimit.js`

---

### Task 1: Add Payment Proof State To Orders

**Files:**
- Modify: `api/models/Order.js`

- [ ] Add fields to `orderSchema` near existing ticket/payment fields:

```js
paymentProofStatus: {
    type: String,
    enum: ['not_uploaded', 'uploaded', 'done'],
    default: 'not_uploaded',
    index: true
},
paymentProofMethod: { type: String, default: '', trim: true },
paymentProofOriginalName: { type: String, default: '', trim: true },
paymentProofMimeType: { type: String, default: '', trim: true },
paymentProofUploadedAt: { type: Date, default: null },
paymentProofLogGuildId: { type: String, default: '', trim: true },
paymentProofLogChannelId: { type: String, default: '', trim: true },
paymentProofLogMessageId: { type: String, default: '', trim: true },
paymentProofLogError: { type: String, default: '' },
paymentProofDoneAt: { type: Date, default: null },
paymentProofDoneBy: { type: String, default: '', trim: true },
```

- [ ] Add index:

```js
orderSchema.index({ paymentProofLogChannelId: 1, paymentProofLogMessageId: 1 });
```

- [ ] Run:

```powershell
cd api
npm test
```

Expected: existing tests pass.

---

### Task 2: Create Payment Proof Log Utilities

**Files:**
- Create: `api/utils/paymentProofLog.js`
- Create: `api/tests/paymentProofLog.test.js`

- [ ] Add test coverage for formatting order details and env validation:

```js
const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildPaymentProofLogPayload,
    getTicketUrl,
    isPaymentLogConfigured
} = require('../utils/paymentProofLog');

test('isPaymentLogConfigured requires guild and channel ids', () => {
    assert.equal(isPaymentLogConfigured({ guildId: '123', channelId: '456' }), true);
    assert.equal(isPaymentLogConfigured({ guildId: '', channelId: '456' }), false);
});

test('getTicketUrl builds Discord channel URL', () => {
    assert.equal(getTicketUrl('111', '222'), 'https://discord.com/channels/111/222');
});

test('buildPaymentProofLogPayload includes order summary and not done status', () => {
    const payload = buildPaymentProofLogPayload({
        order: {
            orderId: 'nm_1',
            robloxUsername: 'PlayerOne',
            discordUsername: 'buyer',
            discordId: '999',
            totalAmount: 12.5,
            items: [{ name: 'Cid V2+F', quantity: 2, packQuantity: 1, price: 4 }]
        },
        method: 'paypal_ff',
        ticketGuildId: '111',
        ticketChannelId: '222',
        status: 'not_done'
    });

    assert.equal(payload.embeds[0].data.title, 'Payment proof - NM_1');
    assert.match(payload.embeds[0].data.fields.find((field) => field.name === 'Status').value, /Not done/);
    assert.match(payload.embeds[0].data.fields.find((field) => field.name === 'Ticket').value, /discord.com\/channels\/111\/222/);
});
```

- [ ] Implement `api/utils/paymentProofLog.js` with pure helpers:

```js
const { EmbedBuilder } = require('discord.js');

const isSnowflake = (value) => /^\d{10,25}$/.test(String(value || '').trim());

const isPaymentLogConfigured = ({ guildId, channelId } = {}) => (
    isSnowflake(guildId) && isSnowflake(channelId)
);

const getPaymentLogConfig = (env = process.env) => ({
    guildId: String(env.DISCORD_PAYMENT_LOG_GUILD_ID || '').trim(),
    channelId: String(env.DISCORD_PAYMENT_LOG_CHANNEL_ID || '').trim()
});

const getTicketUrl = (guildId, channelId) => {
    const safeGuildId = String(guildId || '').trim();
    const safeChannelId = String(channelId || '').trim();
    if (!safeGuildId || !safeChannelId) return '';
    return `https://discord.com/channels/${safeGuildId}/${safeChannelId}`;
};

const formatUsd = (value) => `$${Number(value || 0).toFixed(2)}`;

const formatItems = (items) => {
    if (!Array.isArray(items) || items.length === 0) return 'Unknown item';
    return items.map((item) => {
        const packQty = Math.max(1, Number(item.packQuantity) || 1);
        const qty = Math.max(1, Number(item.quantity) || 1);
        return `${item.name || 'Item'} (x${packQty * qty})`;
    }).join('\n').slice(0, 1024);
};

const getMethodLabel = (method) => {
    if (method === 'ltc') return 'Litecoin (LTC)';
    return 'PayPal Friends & Family';
};

const buildPaymentProofLogPayload = ({ order, method, ticketGuildId, ticketChannelId, status = 'not_done', doneBy = '', doneAt = null }) => {
    const ticketUrl = getTicketUrl(ticketGuildId, ticketChannelId);
    const statusText = status === 'done'
        ? `Done${doneBy ? ` by <@${doneBy}>` : ''}${doneAt ? ` at ${new Date(doneAt).toISOString()}` : ''}`
        : 'Not done';

    const embed = new EmbedBuilder()
        .setColor(status === 'done' ? 0x3DDC84 : 0xF5A623)
        .setTitle(`Payment proof - ${String(order?.orderId || '').toUpperCase()}`)
        .addFields([
            { name: 'Status', value: statusText, inline: true },
            { name: 'Payment', value: getMethodLabel(method), inline: true },
            { name: 'Total', value: formatUsd(order?.totalAmount), inline: true },
            { name: 'Roblox', value: String(order?.robloxUsername || order?.robloxDisplayName || 'Unknown'), inline: true },
            { name: 'Discord', value: `${order?.discordUsername || 'Unknown'}\n<@${order?.discordId || ''}>`, inline: true },
            { name: 'Ticket', value: ticketUrl || 'Ticket URL unavailable', inline: false },
            { name: 'Items', value: formatItems(order?.items), inline: false }
        ])
        .setTimestamp(new Date());

    return { embeds: [embed] };
};

module.exports = {
    buildPaymentProofLogPayload,
    getPaymentLogConfig,
    getTicketUrl,
    isPaymentLogConfigured
};
```

- [ ] Run:

```powershell
cd api
npm test
```

Expected: new tests pass.

---

### Task 3: Add Multipart Proof Upload To Ticket Endpoints

**Files:**
- Modify: `api/routes/shopRoutes.js`

- [ ] Add multer setup near imports/top-level helpers:

```js
const multer = require('multer');

const paymentProofUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 1,
        fileSize: Math.max(1, Number(process.env.PAYMENT_PROOF_MAX_MB || 8)) * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (!/^image\/(png|jpe?g|webp|gif)$/i.test(String(file?.mimetype || ''))) {
            cb(new Error('Payment proof must be an image file.'));
            return;
        }
        cb(null, true);
    }
});
```

- [ ] Add a small async wrapper for multer errors:

```js
const requirePaymentProofUpload = (req, res, next) => {
    paymentProofUpload.single('paymentProof')(req, res, (error) => {
        if (error) {
            return res.status(400).json({ error: error.message || 'Invalid payment proof upload.' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Upload your payment screenshot before creating a ticket.' });
        }
        return next();
    });
};
```

- [ ] Change both route definitions:

```js
router.post('/create-ticket-paypal-ff', authRequired, ticketCreateLimiter, requirePaymentProofUpload, async (req, res) => {
```

```js
router.post('/create-ticket-ltc', authRequired, ticketCreateLimiter, requirePaymentProofUpload, async (req, res) => {
```

- [ ] In both handlers, continue reading `orderId` from `req.body`. Multipart form fields will still populate `req.body.orderId`.

- [ ] Ensure `alreadyExists` behavior does not require a new proof upload only if a ticket already exists. Recommended: still allow the request to pass with proof required, but do not create duplicate log messages if `paymentProofLogMessageId` already exists.

---

### Task 4: Send Payment Proof Log After Ticket Creation

**Files:**
- Modify: `api/routes/shopRoutes.js`
- Use: `api/utils/paymentProofLog.js`

- [ ] Import helpers:

```js
const {
    buildPaymentProofLogPayload,
    getPaymentLogConfig,
    isPaymentLogConfigured
} = require('../utils/paymentProofLog');
```

- [ ] Add helper in `shopRoutes.js`:

```js
const sendPaymentProofLog = async ({ order, method, ticketChannelId, proofFile }) => {
    const config = getPaymentLogConfig();
    if (!isPaymentLogConfigured(config)) {
        return { ok: false, error: 'Payment log channel is not configured.' };
    }

    const channel = await discordClient.channels.fetch(config.channelId, { force: true });
    if (!channel || typeof channel.send !== 'function') {
        return { ok: false, error: 'Payment log channel is unavailable.' };
    }

    const payload = buildPaymentProofLogPayload({
        order,
        method,
        ticketGuildId: config.guildId,
        ticketChannelId,
        status: 'not_done'
    });

    const sent = await channel.send({
        ...payload,
        files: [{
            attachment: proofFile.buffer,
            name: proofFile.originalname || `payment-proof-${order.orderId}.png`
        }]
    });

    return {
        ok: true,
        guildId: config.guildId,
        channelId: config.channelId,
        messageId: sent.id
    };
};
```

Use the actual Discord client reference already available in `shopRoutes.js`; if it is not directly available, expose a small function from the bot module instead of creating a second client.

- [ ] After ticket channel is created and order ticket fields are persisted, call:

```js
const proofLog = await sendPaymentProofLog({
    order: { ...lockedOrder.toObject?.() || lockedOrder, paymentMethod: 'paypal_ff' },
    method: 'paypal_ff',
    ticketChannelId: channelId,
    proofFile: req.file
}).catch((error) => ({ ok: false, error: error?.message || String(error) }));
```

- [ ] Persist proof log fields without failing ticket creation if the log channel send fails:

```js
await Order.updateOne(
    { _id: lockedOrder._id },
    {
        $set: {
            paymentProofStatus: proofLog.ok ? 'uploaded' : 'not_uploaded',
            paymentProofMethod: 'paypal_ff',
            paymentProofOriginalName: req.file.originalname || '',
            paymentProofMimeType: req.file.mimetype || '',
            paymentProofUploadedAt: new Date(),
            paymentProofLogGuildId: proofLog.guildId || '',
            paymentProofLogChannelId: proofLog.channelId || '',
            paymentProofLogMessageId: proofLog.messageId || '',
            paymentProofLogError: proofLog.ok ? '' : proofLog.error || 'Could not send payment proof log.'
        }
    }
);
```

- [ ] Repeat equivalent logic for `ltc`.

- [ ] Response should include warning if log failed:

```js
paymentProofLogged: Boolean(proofLog.ok),
paymentProofLogError: proofLog.ok ? '' : proofLog.error || 'Could not send payment proof log.'
```

---

### Task 5: Frontend Requires Proof Upload Before Create Ticket

**Files:**
- Modify: `web/app/shop/page.tsx`

- [ ] Add state:

```tsx
const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
const [paymentProofPreviewUrl, setPaymentProofPreviewUrl] = useState<string>('');
```

- [ ] Clear proof when switching method:

```tsx
const selectPaymentGuide = (method: PaymentGuide) => {
  setSelectedPaymentGuide(method);
  setPaymentProofFile(null);
  setPaymentProofPreviewUrl('');
};
```

- [ ] Replace PayPal/LTC button handlers with `selectPaymentGuide("paypal_ff")` and `selectPaymentGuide("ltc")`.

- [ ] Add upload UI under each guide:

```tsx
<div className="rounded-[14px] border border-[#1E1E1E] bg-[#111111] p-3">
  <label className="block text-sm font-medium text-white">Payment screenshot</label>
  <input
    type="file"
    accept="image/png,image/jpeg,image/webp,image/gif"
    onChange={(event) => {
      const file = event.target.files?.[0] || null;
      setPaymentProofFile(file);
      setPaymentProofPreviewUrl(file ? URL.createObjectURL(file) : '');
    }}
    className="mt-2 w-full text-sm text-[#B5B5B5]"
  />
  {paymentProofFile && <p className="mt-2 text-xs text-[#3DDC84]">{paymentProofFile.name}</p>}
  {paymentProofPreviewUrl && <img src={paymentProofPreviewUrl} alt="Payment proof preview" className="mt-3 max-h-48 rounded-[12px] border border-[#1E1E1E]" />}
</div>
```

- [ ] Change `createTicket` to send `FormData`:

```tsx
if (!paymentProofFile) {
  setError('Upload your payment screenshot before creating a ticket.');
  return;
}

const formData = new FormData();
formData.append('orderId', orderId);
formData.append('method', method);
formData.append('paymentProof', paymentProofFile);

const res = await fetch(`/api/shop/orders/${orderId}?action=${action}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

Do not set `Content-Type`; browser must set multipart boundary.

- [ ] Disable create button when no proof file:

```tsx
disabled={submitting || !paymentProofFile}
```

---

### Task 6: Proxy Multipart Form Through Next Route

**Files:**
- Modify: `web/app/api/shop/orders/[orderId]/route.ts`

- [ ] Detect multipart requests:

```ts
const contentType = request.headers.get('content-type') || '';
const isMultipart = contentType.includes('multipart/form-data');
const body = isMultipart ? await request.formData() : await request.json();
```

- [ ] Forward body to backend without forcing JSON content type:

```ts
const headers: HeadersInit = {};
const authorization = request.headers.get('authorization');
if (authorization) headers.Authorization = authorization;
if (!isMultipart) headers['Content-Type'] = 'application/json';

const res = await fetch(targetUrl, {
  method: 'POST',
  headers,
  body: isMultipart ? body : JSON.stringify(body),
  cache: 'no-store',
});
```

If Node/FormData forwarding fails in Next runtime, switch the route to read `arrayBuffer()` and pass through raw body with original content-type.

---

### Task 7: Update `!done` To Edit Payment Log Message

**Files:**
- Modify: `api/bot.js`
- Use: `api/utils/paymentProofLog.js`

- [ ] Import:

```js
const { buildPaymentProofLogPayload } = require('./utils/paymentProofLog');
```

- [ ] Add helper:

```js
const updatePaymentProofLogDone = async ({ order, doneBy }) => {
    if (!order?.paymentProofLogChannelId || !order?.paymentProofLogMessageId) return false;
    const channel = await client.channels.fetch(order.paymentProofLogChannelId, { force: true });
    if (!channel || typeof channel.messages?.fetch !== 'function') return false;
    const message = await channel.messages.fetch(order.paymentProofLogMessageId);
    if (!message || typeof message.edit !== 'function') return false;

    const ticketChannelId = order.paypalTicketChannelId || order.ltcTicketChannelId || order.channelId || '';
    const payload = buildPaymentProofLogPayload({
        order,
        method: order.paymentMethod || order.paymentProofMethod,
        ticketGuildId: order.paymentProofLogGuildId || order.guildId || message.guildId,
        ticketChannelId,
        status: 'done',
        doneBy,
        doneAt: new Date()
    });
    await message.edit(payload);
    return true;
};
```

- [ ] In the existing `isDoneCommand` block, after `Order.updateOne`, fetch updated order or mutate local object, then call:

```js
await updatePaymentProofLogDone({ order, doneBy: message.author.id }).catch((error) => {
    console.error('Payment proof log update failed:', error?.message || error);
});

await Order.updateOne(
    { _id: order._id },
    {
        $set: {
            paymentProofStatus: 'done',
            paymentProofDoneAt: new Date(),
            paymentProofDoneBy: String(message.author.id || '')
        }
    }
);
```

- [ ] Keep `!done` successful even if log edit fails.

---

### Task 8: Require `!` For Auto Vouch/Proof Images

**Files:**
- Modify: `api/bot.js`

- [ ] Locate current image auto-vouch branch after command handling.

- [ ] Add gate before sending vouch:

```js
const isVouchTrigger = normalizedContent === '!';
if (!isVouchTrigger) {
    return;
}
```

- [ ] Keep existing staff allowlist/permission check after the trigger gate.

- [ ] Expected behavior:
  - staff sends image only: no vouch/proof
  - staff sends `!` with image: vouch/proof posts
  - non-staff sends `!` with image: denied/ignored as current permission logic does

---

### Task 9: Security And Rate Limits

**Files:**
- Optional modify: `api/middleware/rateLimit.js`
- Modify: `api/routes/shopRoutes.js`

- [ ] Ensure upload endpoints are covered by `ticketCreateLimiter`.

- [ ] Add file controls:
  - one file only
  - image MIME only
  - max size from `PAYMENT_PROOF_MAX_MB`
  - no writing uploaded proof to public web directory

- [ ] Do not log proof image buffers.

- [ ] Add response text that does not leak Discord env/channel errors to customers beyond a generic warning.

---

### Task 10: Verification

- [ ] API unit tests:

```powershell
cd api
npm test
```

Expected: all tests pass.

- [ ] Web lint/build:

```powershell
cd web
npm run lint
npm run build
```

Expected: lint has 0 errors; build succeeds.

- [ ] Manual test PayPal:
  - checkout
  - verify Roblox
  - select delivery date/slot
  - select PayPal
  - upload image
  - create ticket
  - confirm ticket opens
  - confirm payment log channel receives image + order summary + ticket link + Not done
  - run `!done` in ticket
  - confirm payment log message changes to Done

- [ ] Manual test LTC with same steps.

- [ ] Manual vouch test:
  - staff sends image only in ticket: no proof/vouch
  - staff sends `!` with image: proof/vouch posts
  - non-staff sends `!` with image: no proof/vouch

---

## Deployment Notes

Deploy order:

1. Add Render env vars:

```env
DISCORD_PAYMENT_LOG_GUILD_ID=...
DISCORD_PAYMENT_LOG_CHANNEL_ID=...
PAYMENT_PROOF_MAX_MB=8
```

2. Ensure bot is in the new server and can access the log channel.
3. Deploy backend/Render first.
4. Deploy frontend/Vercel after backend is live.
5. Run one PayPal and one LTC test order.

