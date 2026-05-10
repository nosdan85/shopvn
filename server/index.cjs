const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { db, setting, setSetting, initPersistentStore } = require('./db.cjs');

const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || '';
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://nosroblox.com',
  'https://www.nosroblox.com',
  ...clientOrigin.split(',').map((origin) => origin.trim()).filter(Boolean),
];
const jwtSecret = process.env.JWT_SECRET || 'change-this-secret-before-production';
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const idAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-secret-before-production')) {
  throw new Error('Missing secure JWT_SECRET for production.');
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    if (origin) res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-webhook-secret');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadDir, { maxAge: '7d', immutable: true }));

function publicCache(_req, res, next) {
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
  next();
}

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false });
const adminLimiter = rateLimit({ windowMs: 60 * 1000, max: 90, standardHeaders: true, legacyHeaders: false });
const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
const depositLimiter = rateLimit({ windowMs: 60 * 1000, max: 12, standardHeaders: true, legacyHeaders: false });
const purchaseLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      cb(new Error('Chỉ cho phép upload ảnh JPG, PNG, WEBP hoặc GIF.'));
      return;
    }
    cb(null, true);
  },
});

const orderStatusLabels = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  completed: 'Đã giao hàng',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
};

function ensureEnvAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return;
  const email = process.env.ADMIN_EMAIL || `${username}@admin.local`;
  const existing = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);
  const passwordHash = bcrypt.hashSync(password, 12);
  if (existing) {
    db.prepare(`
      UPDATE users SET username = ?, email = ?, password_hash = ?, role = 'super_admin', status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(username, email, passwordHash, existing.id);
    return;
  }
  db.prepare(`
    INSERT INTO users (username, email, password_hash, role, status)
    VALUES (?, ?, ?, 'super_admin', 'active')
  `).run(username, email, passwordHash);
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    balance: user.balance,
    role: user.role,
    status: user.status,
    full_name: user.full_name,
    phone: user.phone,
    total_deposited: user.total_deposited,
    total_spent: user.total_spent,
    created_at: user.created_at,
  };
}

function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function isSupportedImage(buffer) {
  if (!buffer || buffer.length < 12) return false;
  const png = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const jpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const gif = buffer.toString('ascii', 0, 6) === 'GIF87a' || buffer.toString('ascii', 0, 6) === 'GIF89a';
  const webp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return png || jpg || gif || webp;
}

function validateUploadedImage(file) {
  if (!file?.path) throw new Error('Kh\u00f4ng t\u00ecm th\u1ea5y file upload.');
  const buffer = fs.readFileSync(file.path);
  if (!isSupportedImage(buffer)) {
    fs.unlinkSync(file.path);
    throw new Error('File upload kh\u00f4ng ph\u1ea3i \u1ea3nh h\u1ee3p l\u1ec7.');
  }
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });
}

function primaryClientOrigin() {
  return clientOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)[0] || 'https://nosroblox.com';
}

async function sendEmail({ to, subject, text, html }) {
  const host = process.env.SMTP_HOST;
  const portValue = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass || !from) {
    console.log(`Email chưa cấu hình SMTP. Nội dung gửi đến ${to}: ${text}`);
    return false;
  }
  const transporter = nodemailer.createTransport({
    host,
    port: portValue,
    secure: portValue === 465,
    auth: { user, pass },
  });
  await transporter.sendMail({ from, to, subject, text, html });
  return true;
}

function getCurrentUser(req) {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
  } catch (_error) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getCurrentUser(req);
  if (!user || user.status !== 'active') {
    logSecurity({ eventType: 'auth_required_denied', severity: 'low', message: 'Unauthenticated request blocked.', req });
    res.status(401).json({ message: 'Vui lòng đăng nhập.' });
    return;
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getCurrentUser(req);
  if (!user || user.status !== 'active' || !['admin', 'super_admin'].includes(user.role)) {
    logSecurity({ eventType: 'admin_access_denied', userId: user?.id, severity: 'medium', message: 'Admin request blocked.', req });
    res.status(403).json({ message: 'Bạn không có quyền truy cập admin.' });
    return;
  }
  req.user = user;
  next();
}

function logAdmin(adminId, action, targetType, targetId, req) {
  db.prepare(`
    INSERT INTO admin_logs (admin_id, action, target_type, target_id, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(adminId, action, targetType, targetId || null, req.ip, req.get('user-agent') || '');
}

function logSecurity({ eventType, userId = null, severity = 'info', message = '', req = null, metadata = null }) {
  try {
    db.prepare(`
      INSERT INTO security_events (event_type, user_id, severity, message, ip_address, user_agent, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventType,
      userId,
      severity,
      message,
      req?.ip || '',
      req?.get?.('user-agent') || '',
      metadata ? JSON.stringify(metadata).slice(0, 2000) : null,
    );
  } catch (error) {
    console.error('security event log failed:', error.message);
  }
}

function notifyUser(userId, title, content, type) {
  db.prepare('INSERT INTO notifications (user_id, title, content, type) VALUES (?, ?, ?, ?)').run(userId, title, content, type);
}

function parseItem(row) {
  return {
    ...row,
    gallery: row.gallery ? JSON.parse(row.gallery) : [],
    current_price: row.sale_price || row.price,
    discount_percent: row.sale_price && row.original_price
      ? Math.max(0, Math.round((1 - row.sale_price / row.original_price) * 100))
      : 0,
  };
}

function settingsData({ includeSecrets = false } = {}) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const data = {};
  for (const row of rows) data[row.key] = row.value;
  const envKeys = [
    'bank_name',
    'bank_account_name',
    'bank_account_number',
    'bank_qr_url',
    'card_gateway_name',
    'deposit_enabled',
    'purchase_enabled',
    'registration_enabled',
  ];
  if (includeSecrets) {
    envKeys.push('sepay_webhook_secret', 'card_webhook_secret', 'sepay_bot_enabled', 'sepay_bot_api_url', 'sepay_bot_api_key', 'sepay_bot_interval_ms');
  }
  for (const key of envKeys) {
    const envKey = key.toUpperCase();
    if (process.env[envKey] !== undefined) data[key] = process.env[envKey];
  }
  return data;
}

function publicSettings() {
  return settingsData();
}

function adminSettings() {
  return settingsData({ includeSecrets: true });
}

function normalizeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${nanoid()}`;
}

function nanoid(size = 8) {
  let value = '';
  const bytes = crypto.randomBytes(size);
  for (const byte of bytes) value += idAlphabet[byte % idAlphabet.length];
  return value;
}

function parseAmount(value) {
  if (typeof value === 'number') return value;
  return Number(String(value || '').replace(/[^\d.-]/g, ''));
}

function clampText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizePaymentText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractWebhookSecret(req) {
  const authorization = String(req.headers.authorization || '');
  const apiKeyMatch = authorization.match(/^apikey\s+(.+)$/i);
  return [
    req.query.secret,
    req.headers['x-webhook-secret'],
    apiKeyMatch ? apiKeyMatch[1] : '',
  ].map((value) => String(value || '').trim()).filter(Boolean);
}

function timingSafeEqualText(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyOptionalWebhookSignature(req) {
  const secret = String(setting('sepay_webhook_hmac_secret') || process.env.SEPAY_WEBHOOK_HMAC_SECRET || '').trim();
  if (!secret) return true;
  const signature = String(req.headers['x-webhook-signature'] || req.headers['x-signature'] || '').replace(/^sha256=/i, '');
  const timestamp = String(req.headers['x-webhook-timestamp'] || req.headers['x-timestamp'] || '');
  if (!signature || !timestamp) return false;
  const ageMs = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) return false;
  const payload = `${timestamp}.${JSON.stringify(req.body || {})}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return timingSafeEqualText(signature, expected);
}

function extractDepositCode(value) {
  const rawMatch = String(value || '').match(/nap[\s._-]*[a-z0-9]{8}/i);
  if (rawMatch) return normalizePaymentText(rawMatch[0]).toUpperCase();
  const normalized = normalizePaymentText(value);
  const pendingCodes = db.prepare(`
    SELECT transaction_code, transfer_content
    FROM deposits
    WHERE status = 'pending' AND method = 'bank_transfer'
    ORDER BY created_at DESC
    LIMIT 300
  `).all();
  const matchedPending = pendingCodes.find((deposit) => {
    const code = normalizePaymentText(deposit.transaction_code);
    const content = normalizePaymentText(deposit.transfer_content);
    return (code && normalized.includes(code)) || (content && normalized.includes(content));
  });
  if (matchedPending) return matchedPending.transaction_code;
  const match = normalized.match(/nap[a-z0-9]{8}/i);
  return match ? match[0].toUpperCase() : '';
}

function transactionListFromResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.transactions)) return data.transactions;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function normalizeIncomingTransfer(raw = {}) {
  const amount = parseAmount(raw.amount || raw.paid_amount || raw.transferAmount || raw.transfer_amount || raw.amount_in || raw.amountIn || raw.creditAmount || raw.credit_amount || raw.money || raw.value || raw.transaction_amount || raw.transactionAmount || raw.transfer_amount_vnd || 0);
  const transferType = String(raw.transferType || raw.transfer_type || raw.type || raw.transaction_type || raw.direction || (amount > 0 ? 'in' : '')).trim().toLowerCase();
  return {
    transferType,
    content: String(raw.content || raw.description || raw.transferContent || raw.transfer_content || raw.transaction_content || raw.transactionContent || raw.note || raw.memo || ''),
    transactionId: clampText(raw.transaction_id || raw.transactionId || raw.reference || raw.referenceCode || raw.reference_code || raw.id || raw.code || '', 160),
    amount,
  };
}

function createBalanceLog({ userId, type, amount, before, after, referenceId, referenceType, note, createdBy }) {
  db.prepare(`
    INSERT INTO balance_logs (user_id, type, amount, balance_before, balance_after, reference_id, reference_type, note, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, type, amount, before, after, referenceId || null, referenceType || null, note || '', createdBy || null);
}

function completeDeposit(current, meta = {}) {
  if (!current) throw new Error('Không tìm thấy giao dịch.');
  if (current.status === 'success') return current;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(current.user_id);
  const before = user.balance;
  const after = before + current.amount;
  db.prepare('UPDATE users SET balance = ?, total_deposited = total_deposited + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(after, current.amount, user.id);
  createBalanceLog({
    userId: user.id,
    type: 'deposit',
    amount: current.amount,
    before,
    after,
    referenceId: current.id,
    referenceType: 'deposit',
    note: meta.note || `Nạp tiền ${current.transaction_code}`,
    createdBy: meta.createdBy || null,
  });
  notifyUser(user.id, 'Nạp tiền thành công', `Giao dịch ${current.transaction_code} đã được cộng tiền.`, 'deposit');
  db.prepare(`
    UPDATE deposits SET status = 'success', admin_note = ?, bank_transaction_id = ?, completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(meta.adminNote || current.admin_note || '', meta.transactionId || current.bank_transaction_id || null, current.id);
  return db.prepare('SELECT * FROM deposits WHERE id = ?').get(current.id);
}

function processIncomingDepositTransfer(raw, source = 'Webhook') {
  const transfer = normalizeIncomingTransfer(raw);
  if (transfer.transferType && !['in', 'credit', 'deposit'].includes(transfer.transferType)) {
    return { ignored: true, message: 'Bỏ qua giao dịch không phải tiền vào.', transferType: transfer.transferType };
  }
  const depositCode = extractDepositCode(transfer.content);
  return db.transaction(() => {
    if (transfer.transactionId) {
      const processed = db.prepare("SELECT * FROM deposits WHERE bank_transaction_id = ? AND status = 'success'").get(transfer.transactionId);
      if (processed) return { ignored: true, message: 'Giao dịch đã được xử lý trước đó.', deposit: processed };
    }
    if (!depositCode) return { ignored: true, message: 'Không tìm thấy mã nạp NAP trong nội dung chuyển khoản.' };
    const current = db.prepare("SELECT * FROM deposits WHERE transaction_code = ? AND status = 'pending' AND method = 'bank_transfer'").get(depositCode);
    if (!current) return { ignored: true, message: `Không tìm thấy lệnh nạp pending cho mã ${depositCode}.` };
    if (!Number.isFinite(transfer.amount) || transfer.amount <= 0) return { ignored: true, message: 'Không đọc được số tiền chuyển khoản.' };
    if (transfer.amount < current.amount) return { ignored: true, message: `Số tiền chuyển khoản ${transfer.amount} nhỏ hơn số tiền cần nạp ${current.amount}.`, deposit: current };
    return completeDeposit(current, { transactionId: transfer.transactionId, adminNote: `${source} tự động xác nhận`, note: `${source} xác nhận ${current.transaction_code}` });
  })();
}

function cardWebhookPayload(req) {
  return { ...(req.query || {}), ...(req.body || {}) };
}

function cardWebhookValue(payload, keys) {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null && String(payload[key]).trim() !== '') return payload[key];
  }
  return '';
}

function normalizeCardWebhookStatus(value) {
  const text = String(value || '').trim().toLowerCase();
  if (['1', 'success', 'successful', 'done', 'completed', 'approved', 'thanhcong', 'thanh_cong', 'đúng', 'dung', 'the_dung', 'card_correct'].includes(text)) return 'success';
  if (['2', '99', 'pending', 'processing', 'wait', 'waiting', 'cho_xu_ly', 'chờ xử lý'].includes(text)) return 'pending';
  if (['3', '4', '30', '100', 'fail', 'failed', 'error', 'cancel', 'cancelled', 'rejected', 'sai', 'thatbai', 'that_bai', 'the_sai', 'card_wrong'].includes(text)) return 'failed';
  return text;
}

function cardProviderCode(method) {
  return {
    viettel_card: 'VIETTEL',
    mobifone_card: 'MOBIFONE',
    vinaphone_card: 'VINAPHONE',
  }[method] || String(method || '').replace(/_card$/i, '').toUpperCase();
}

function gachTheFastConfig() {
  return {
    apiUrl: String(setting('gachthefast_api_url') || process.env.GACHTHEFAST_API_URL || '').trim(),
    partnerId: String(setting('gachthefast_partner_id') || process.env.GACHTHEFAST_PARTNER_ID || '').trim(),
    partnerKey: String(setting('gachthefast_partner_key') || process.env.GACHTHEFAST_PARTNER_KEY || '').trim(),
    submitMethod: String(setting('gachthefast_submit_method') || process.env.GACHTHEFAST_SUBMIT_METHOD || 'GET').trim().toUpperCase(),
  };
}

function gachTheFastSign({ partnerKey, cardCode, serial }) {
  return crypto.createHash('md5').update(`${partnerKey}${cardCode}${serial}`).digest('hex');
}

function normalizeGachTheFastResponse(data) {
  const status = normalizeCardWebhookStatus(cardWebhookValue(data, ['status', 'card_status', 'result', 'state', 'code']));
  const message = clampText(cardWebhookValue(data, ['message', 'msg', 'note', 'reason', 'description']) || JSON.stringify(data).slice(0, 250), 300);
  return { status, message };
}

async function submitGachTheFastCard({ deposit, method, serial, cardCode, amount }) {
  const config = gachTheFastConfig();
  if (!config.apiUrl || !config.partnerId || !config.partnerKey) {
    throw new Error('Chưa cấu hình GachTheFast API URL, Partner ID hoặc Partner Key.');
  }
  const params = new URLSearchParams({
    partner_id: config.partnerId,
    telco: cardProviderCode(method),
    code: cardCode,
    serial,
    amount: String(amount),
    request_id: deposit.transaction_code,
    command: 'charging',
    sign: gachTheFastSign({ partnerKey: config.partnerKey, cardCode, serial }),
  });
  const response = config.submitMethod === 'POST'
    ? await fetch(config.apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: params.toString(),
    })
    : await fetch(`${config.apiUrl}${config.apiUrl.includes('?') ? '&' : '?'}${params.toString()}`, { headers: { accept: 'application/json' } });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : { message: await response.text() };
  if (!response.ok) throw new Error(data?.message || `GachTheFast API lỗi ${response.status}`);
  return { raw: data, ...normalizeGachTheFastResponse(data) };
}

function cardCallbackSecretOk(req, payload) {
  const allowedSecrets = [
    setting('card_webhook_secret'),
    process.env.CARD_WEBHOOK_SECRET,
    setting('gachthefast_webhook_secret'),
    process.env.GACHTHEFAST_WEBHOOK_SECRET,
  ].map((value) => String(value || '').trim()).filter(Boolean);
  if (!allowedSecrets.length) return true;
  const providedSecrets = [
    ...extractWebhookSecret(req),
    payload.secret,
    payload.token,
    payload.api_key,
    payload.apiKey,
    payload.partner_key,
    payload.partnerKey,
  ].map((value) => String(value || '').trim()).filter(Boolean);
  return providedSecrets.some((secret) => allowedSecrets.some((allowed) => timingSafeEqualText(secret, allowed)));
}

function processGachTheFastCallback(payload) {
  const requestId = clampText(cardWebhookValue(payload, ['request_id', 'requestId', 'ref_id', 'refId']), 160);
  const providerTransactionId = clampText(cardWebhookValue(payload, ['trans_id', 'transId', 'transaction_id', 'transactionId', 'id']), 160);
  const cardSerial = clampText(cardWebhookValue(payload, ['serial', 'card_serial', 'seri']), 80);
  const status = normalizeCardWebhookStatus(cardWebhookValue(payload, ['status', 'card_status', 'result', 'state', 'code']));
  const callbackAmount = parseAmount(cardWebhookValue(payload, ['real_amount', 'receive_amount', 'value_receive', 'amount_receive', 'amount', 'value', 'declared_value', 'menhgia']));
  const note = clampText(cardWebhookValue(payload, ['message', 'msg', 'note', 'reason', 'description']), 300);
  const lookupValues = [requestId, providerTransactionId, cardSerial].filter(Boolean);
  const current = lookupValues.length
    ? db.prepare(`
      SELECT deposits.*, card_deposit_jobs.id AS job_id
      FROM deposits
      LEFT JOIN card_deposit_jobs ON card_deposit_jobs.deposit_id = deposits.id
      WHERE deposits.method IN ('viettel_card','mobifone_card','vinaphone_card')
        AND deposits.status = 'pending'
        AND (${lookupValues.map(() => '(deposits.transaction_code = ? OR deposits.bank_transaction_id = ? OR deposits.transfer_content LIKE ? OR card_deposit_jobs.provider_transaction_id = ? OR card_deposit_jobs.serial = ?)').join(' OR ')})
      ORDER BY deposits.created_at DESC
      LIMIT 1
    `).get(...lookupValues.flatMap((value) => [value, value, `%${value}%`, value, value]))
    : null;
  if (!current) return { ignored: true, message: 'Không tìm thấy giao dịch thẻ pending tương ứng.' };
  if (status === 'success') {
    return db.transaction(() => {
      const fresh = db.prepare('SELECT * FROM deposits WHERE id = ?').get(current.id);
      if (!fresh || fresh.status !== 'pending') return { ignored: true, message: 'Giao dịch thẻ đã được xử lý trước đó.', deposit: fresh || current };
      if (Number.isFinite(callbackAmount) && callbackAmount > 0 && callbackAmount < fresh.amount) {
        return { ignored: true, message: `Mệnh giá callback ${callbackAmount} nhỏ hơn mệnh giá khai báo ${fresh.amount}.`, deposit: fresh };
      }
      if (current.job_id) {
        db.prepare(`
          UPDATE card_deposit_jobs
          SET status = 'success', worker_note = ?, provider_transaction_id = COALESCE(?, provider_transaction_id), completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(note || 'GachTheFast callback xác nhận thẻ thành công.', providerTransactionId || requestId || null, current.job_id);
      }
      return completeDeposit(fresh, { transactionId: providerTransactionId || requestId || `GTF-${fresh.transaction_code}`, adminNote: `GachTheFast xác nhận${note ? `: ${note}` : ''}`, note: `GachTheFast xác nhận ${fresh.transaction_code}` });
    })();
  }
  if (status === 'failed') {
    db.transaction(() => {
      if (current.job_id) {
        db.prepare(`
          UPDATE card_deposit_jobs
          SET status = 'failed', worker_note = ?, provider_transaction_id = COALESCE(?, provider_transaction_id), completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(note || 'GachTheFast báo thẻ thất bại.', providerTransactionId || requestId || null, current.job_id);
      }
      db.prepare(`
        UPDATE deposits SET status = 'failed', admin_note = ?, bank_transaction_id = ?, completed_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'pending'
      `).run(note || 'GachTheFast báo thẻ thất bại.', providerTransactionId || requestId || null, current.id);
    })();
    return { ignored: true, message: 'GachTheFast báo thẻ thất bại.', deposit: db.prepare('SELECT * FROM deposits WHERE id = ?').get(current.id) };
  }
  if (current.job_id) {
    db.prepare(`
      UPDATE card_deposit_jobs
      SET status = 'processing', worker_note = ?, provider_transaction_id = COALESCE(?, provider_transaction_id), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(note || 'GachTheFast callback báo thẻ đang chờ xử lý.', providerTransactionId || requestId || null, current.job_id);
  }
  return { ignored: true, message: 'GachTheFast callback chưa hoàn tất.', deposit: current };
}

function cardWorkerSecretOk(req) {
  const allowedSecrets = [
    setting('card_worker_secret'),
    process.env.CARD_WORKER_SECRET,
    setting('card_webhook_secret'),
    process.env.CARD_WEBHOOK_SECRET,
    setting('gachthefast_webhook_secret'),
    process.env.GACHTHEFAST_WEBHOOK_SECRET,
  ].map((value) => String(value || '').trim()).filter(Boolean);
  if (!allowedSecrets.length) return false;
  return extractWebhookSecret(req).some((secret) => allowedSecrets.some((allowed) => timingSafeEqualText(secret, allowed)));
}

function processCardWorkerResult(raw) {
  const depositCode = clampText(cardWebhookValue(raw, ['transaction_code', 'transactionCode', 'request_id', 'requestId']), 160);
  const providerTransactionId = clampText(cardWebhookValue(raw, ['provider_transaction_id', 'providerTransactionId', 'trans_id', 'transaction_id']), 160);
  const status = normalizeCardWebhookStatus(cardWebhookValue(raw, ['status', 'card_status', 'result', 'state']));
  const note = clampText(cardWebhookValue(raw, ['message', 'msg', 'note', 'reason', 'description']), 300);
  const callbackAmount = parseAmount(cardWebhookValue(raw, ['real_amount', 'receive_amount', 'value_receive', 'amount_receive', 'amount', 'value', 'declared_amount']));
  if (!depositCode) return { ignored: true, message: 'Thiếu mã giao dịch thẻ.' };
  return db.transaction(() => {
    const current = db.prepare(`
      SELECT deposits.*, card_deposit_jobs.id AS job_id
      FROM deposits
      JOIN card_deposit_jobs ON card_deposit_jobs.deposit_id = deposits.id
      WHERE deposits.transaction_code = ? AND deposits.method IN ('viettel_card','mobifone_card','vinaphone_card')
      LIMIT 1
    `).get(depositCode);
    if (!current) return { ignored: true, message: 'Không tìm thấy giao dịch thẻ tương ứng.' };
    if (current.status !== 'pending') return { ignored: true, message: 'Giao dịch thẻ đã được xử lý trước đó.', deposit: current };
    if (status === 'retry') {
      db.prepare(`
        UPDATE card_deposit_jobs SET status = 'retry', worker_note = ?, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(note || 'Worker lỗi tạm thời, sẽ thử lại.', current.job_id);
      return { ignored: true, message: note || 'Worker lỗi tạm thời, sẽ thử lại.', deposit: current };
    }
    if (status === 'success') {
      if (Number.isFinite(callbackAmount) && callbackAmount > 0 && callbackAmount < current.amount) {
        db.prepare(`
          UPDATE card_deposit_jobs SET status = 'failed', worker_note = ?, provider_transaction_id = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(`Mệnh giá nhận ${callbackAmount} nhỏ hơn mệnh giá khai báo ${current.amount}.`, providerTransactionId || null, current.job_id);
        db.prepare(`
          UPDATE deposits SET status = 'failed', admin_note = ?, bank_transaction_id = ?, completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(`Mệnh giá nhận ${callbackAmount} nhỏ hơn mệnh giá khai báo ${current.amount}.`, providerTransactionId || null, current.id);
        return { ignored: true, message: 'Mệnh giá thẻ không khớp.', deposit: db.prepare('SELECT * FROM deposits WHERE id = ?').get(current.id) };
      }
      db.prepare(`
        UPDATE card_deposit_jobs SET status = 'success', worker_note = ?, provider_transaction_id = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(note || 'Worker báo thẻ thành công.', providerTransactionId || null, current.job_id);
      return completeDeposit(current, { transactionId: providerTransactionId || `CARD-${current.transaction_code}`, adminNote: note || 'Worker xác nhận thẻ thành công.', note: `Worker xác nhận thẻ ${current.transaction_code}` });
    }
    if (status === 'failed') {
      db.prepare(`
        UPDATE card_deposit_jobs SET status = 'failed', worker_note = ?, provider_transaction_id = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(note || 'Worker báo thẻ thất bại.', providerTransactionId || null, current.job_id);
      db.prepare(`
        UPDATE deposits SET status = 'failed', admin_note = ?, bank_transaction_id = ?, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(note || 'Thẻ không hợp lệ hoặc đã được sử dụng.', providerTransactionId || null, current.id);
      return { ignored: true, message: note || 'Thẻ không hợp lệ hoặc đã được sử dụng.', deposit: db.prepare('SELECT * FROM deposits WHERE id = ?').get(current.id) };
    }
    db.prepare(`
      UPDATE card_deposit_jobs SET status = 'processing', worker_note = ?, provider_transaction_id = COALESCE(?, provider_transaction_id), submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(note || 'Worker đã gửi thẻ, đang chờ xử lý.', providerTransactionId || null, current.job_id);
    return { ignored: true, message: 'Thẻ đang chờ xử lý.', deposit: current };
  })();
}

function createOrderChatSummary({ order, items }) {
  const lines = [
    `Mã đơn: ${order.order_code}`,
    `Tài khoản web: ${order.username || ''}`,
    `Tên Roblox: ${order.roblox_username}`,
    `Tổng tiền: ${order.total_amount} VND`,
    `Đồ mua: ${items.map((item) => `${item.item_name} x${item.quantity}`).join(', ')}`,
  ];
  return lines.join('\n');
}

function chatMessageWithImage(message, imageUrl) {
  const text = clampText(message, 2000);
  const image = clampText(imageUrl, 500);
  if (!image) return text;
  if (!/^\/uploads\/[A-Za-z0-9._-]+$/.test(image) && !/^https?:\/\/\S{1,480}$/i.test(image)) {
    throw new Error('Link ảnh không hợp lệ.');
  }
  return [text, `Ảnh: ${image}`].filter(Boolean).join('\n');
}

function createInitialOrderChat({ orderId, userId, message }) {
  db.prepare('INSERT INTO order_chat_messages (order_id, user_id, sender_id, message) VALUES (?, ?, ?, ?)')
    .run(orderId, userId, userId, message.slice(0, 2000));
}

let sepayBotRunning = false;
let sepayBotLastResult = null;
let sepayBotLastRunAt = null;
let sepayBotLastError = '';

async function runSepayBotOnce() {
  if (sepayBotRunning) return { skipped: true, message: 'Bot đang chạy vòng trước.' };
  const apiUrl = setting('sepay_bot_api_url');
  const apiKey = setting('sepay_bot_api_key');
  if (!apiUrl || !apiKey) return { skipped: true, message: 'Thiếu SEPAY_BOT_API_URL hoặc SEPAY_BOT_API_KEY.' };
  sepayBotRunning = true;
  sepayBotLastRunAt = new Date().toISOString();
  try {
    const response = await fetch(apiUrl, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || `SePay API lỗi ${response.status}`);
    const transactions = transactionListFromResponse(data);
    const results = transactions.map((transaction) => processIncomingDepositTransfer(transaction, 'SePay bot'));
    sepayBotLastResult = {
      ok: true,
      total: transactions.length,
      credited: results.filter((result) => !result?.ignored).length,
      ignored: results.filter((result) => result?.ignored).length,
    };
    sepayBotLastError = '';
    return sepayBotLastResult;
  } catch (error) {
    sepayBotLastError = error.message;
    throw error;
  } finally {
    sepayBotRunning = false;
  }
}

function sepayBotStatus() {
  const apiUrl = setting('sepay_bot_api_url');
  const apiKey = setting('sepay_bot_api_key');
  let workerLastResult = null;
  try {
    workerLastResult = JSON.parse(setting('sepay_bot_last_result', 'null'));
  } catch (_error) {
    workerLastResult = null;
  }
  return {
    enabled: setting('sepay_bot_enabled', 'false') === 'true',
    configured: Boolean(apiUrl && apiKey),
    running: sepayBotRunning,
    api_url: apiUrl,
    interval_ms: Number(setting('sepay_bot_interval_ms', '15000')) || 15000,
    mode: 'external_worker',
    worker_last_run_at: setting('sepay_bot_last_run_at', ''),
    worker_last_error: setting('sepay_bot_last_error', ''),
    worker_last_result: workerLastResult,
    manual_running: sepayBotRunning,
    manual_last_run_at: sepayBotLastRunAt,
    manual_last_error: sepayBotLastError,
    manual_last_result: sepayBotLastResult,
  };
}

function startSepayBot() {
  if (setting('sepay_bot_enabled', 'false') !== 'true') return;
  const intervalMs = Math.max(5000, Number(setting('sepay_bot_interval_ms', '15000')) || 15000);
  runSepayBotOnce().catch((error) => console.error('SePay bot error:', error.message));
  setInterval(() => {
    runSepayBotOnce().catch((error) => console.error('SePay bot error:', error.message));
  }, intervalMs);
}

app.get('/api/settings/public', publicCache, (_req, res) => {
  res.json(publicSettings());
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', (req, res) => {
  if (setting('registration_enabled', 'true') !== 'true') {
    res.status(403).json({ message: 'Website đang tắt đăng ký.' });
    return;
  }
  const { username, email, password, confirmPassword } = req.body;
  if (!username || !email || !password || !confirmPassword) {
    res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
    return;
  }
  if (password !== confirmPassword || String(password).length < 8) {
    res.status(400).json({ message: 'Mật khẩu phải từ 8 ký tự và nhập lại khớp.' });
    return;
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (exists) {
    res.status(409).json({ message: 'Username hoặc email đã tồn tại.' });
    return;
  }
  const passwordHash = bcrypt.hashSync(password, 12);
  const result = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, status)
    VALUES (?, ?, ?, 'user', 'active')
  `).run(username, email, passwordHash);
  notifyUser(result.lastInsertRowid, 'Đăng ký thành công', 'Chào mừng bạn đến Sailor Piece Item Shop.', 'auth');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.cookie('token', signToken(user), authCookieOptions()).json({ user: sanitizeUser(user) });
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { account, password } = req.body;
  if (!account || !password) {
    res.status(400).json({ message: 'Vui lòng nhập tài khoản và mật khẩu.' });
    return;
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(account, account);
  if (!user) {
    res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
    return;
  }
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    res.status(429).json({ message: 'Tài khoản tạm khóa do đăng nhập sai nhiều lần.' });
    return;
  }
  if (user.status !== 'active') {
    res.status(403).json({ message: 'Tài khoản đang bị khóa.' });
    return;
  }
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    const failed = user.failed_login_count + 1;
    const lockedUntil = failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    db.prepare('UPDATE users SET failed_login_count = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(failed, lockedUntil, user.id);
    logSecurity({ eventType: 'login_failed', userId: user.id, severity: failed >= 5 ? 'high' : 'medium', message: 'Invalid password.', req, metadata: { failed } });
    res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
    return;
  }
  db.prepare('UPDATE users SET failed_login_count = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  if (['admin', 'super_admin'].includes(user.role)) logAdmin(user.id, 'admin_login', 'user', user.id, req);
  res.cookie('token', signToken(user), authCookieOptions()).json({ user: sanitizeUser(user) });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('token', authCookieOptions()).json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (user) {
    const token = String(crypto.randomInt(100000, 1000000));
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET reset_token_hash = ?, reset_token_expires_at = ? WHERE id = ?').run(hash, expires, user.id);
    const resetUrl = `${primaryClientOrigin()}/reset-password?email=${encodeURIComponent(email)}`;
    try {
      await sendEmail({
        to: email,
        subject: 'Mã đặt lại mật khẩu NosRoblox',
        text: `Mã đặt lại mật khẩu của bạn là ${token}. Mã có hiệu lực trong 15 phút. Nhập mã tại ${resetUrl}`,
        html: `<p>Mã đặt lại mật khẩu của bạn là:</p><h2>${token}</h2><p>Mã có hiệu lực trong 15 phút.</p><p>Nhập mã tại <a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    } catch (error) {
      console.error('Không thể gửi email reset mật khẩu:', error.message);
    }
  }
  res.json({ message: 'Nếu email tồn tại, hệ thống đã gửi mã đặt lại mật khẩu.' });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, token, password, confirmPassword } = req.body;
  if (!email || !token || !password || password !== confirmPassword || String(password).length < 8) {
    res.status(400).json({ message: 'Thông tin đặt lại mật khẩu không hợp lệ.' });
    return;
  }
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND reset_token_hash = ?').get(email, hash);
  if (!user || !user.reset_token_expires_at || new Date(user.reset_token_expires_at).getTime() < Date.now()) {
    res.status(400).json({ message: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
    return;
  }
  db.prepare(`
    UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(bcrypt.hashSync(password, 12), user.id);
  notifyUser(user.id, 'Đổi mật khẩu thành công', 'Mật khẩu tài khoản của bạn đã được cập nhật.', 'auth');
  res.json({ message: 'Đổi mật khẩu thành công.' });
});

app.get('/api/items', publicCache, (req, res) => {
  const filter = String(req.query.filter || 'all');
  const search = String(req.query.search || '').trim();
  const sort = String(req.query.sort || '');
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(24, Math.max(1, Number(req.query.limit || 12)));
  const where = ['status = ?'];
  const params = ['active'];
  if (filter === 'featured') where.push('is_featured = 1');
  if (filter === 'best-seller') where.push('is_best_seller = 1');
  if (filter === 'sale') where.push('is_sale = 1');
  if (filter === 'in-stock') where.push('stock > 0');
  if (search) {
    where.push('(name LIKE ? OR short_description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const order = sort === 'price-asc'
    ? 'COALESCE(sale_price, price) ASC'
    : sort === 'price-desc'
      ? 'COALESCE(sale_price, price) DESC'
      : 'sort_order ASC, sold_count DESC';
  const total = db.prepare(`SELECT COUNT(*) as count FROM items WHERE ${where.join(' AND ')}`).get(...params).count;
  const rows = db.prepare(`
    SELECT * FROM items WHERE ${where.join(' AND ')}
    ORDER BY ${order}
    LIMIT ? OFFSET ?
  `).all(...params, limit, (page - 1) * limit);
  res.json({ items: rows.map(parseItem), total, page, limit });
});

app.get('/api/items/:slug', publicCache, (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE slug = ? AND status = ?').get(req.params.slug, 'active');
  if (!item) {
    res.status(404).json({ message: 'Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n h\u00e0ng.' });
    return;
  }
  const reviews = db.prepare(`
    SELECT reviews.*, users.username FROM reviews
    JOIN users ON users.id = reviews.user_id
    WHERE reviews.item_id = ? AND reviews.status = 'approved'
    ORDER BY reviews.created_at DESC
  `).all(item.id);
  res.json({ item: parseItem(item), reviews });
});

app.get('/api/home', publicCache, (_req, res) => {
  const featured = db.prepare("SELECT * FROM items WHERE status = 'active' AND is_featured = 1 ORDER BY sort_order ASC LIMIT 6").all().map(parseItem);
  const bestSellers = db.prepare("SELECT * FROM items WHERE status = 'active' ORDER BY sold_count DESC LIMIT 6").all().map(parseItem);
  const sales = db.prepare("SELECT * FROM items WHERE status = 'active' AND is_sale = 1 ORDER BY sort_order ASC LIMIT 6").all().map(parseItem);
  const reviews = db.prepare(`
    SELECT reviews.*, users.username, items.name as item_name FROM reviews
    JOIN users ON users.id = reviews.user_id
    JOIN items ON items.id = reviews.item_id
    WHERE reviews.status = 'approved'
    ORDER BY reviews.created_at DESC LIMIT 6
  `).all();
  res.json({ settings: publicSettings(), featured, bestSellers, sales, reviews });
});

app.get('/api/deposits', requireAuth, (req, res) => {
  const deposits = db.prepare('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ deposits });
});

app.post('/api/deposits', requireAuth, depositLimiter, (req, res) => {
  if (setting('deposit_enabled', 'true') !== 'true') {
    res.status(403).json({ message: 'Website đang tắt nạp tiền.' });
    return;
  }
  const method = String(req.body.method || 'bank_transfer');
  const amount = Number(req.body.amount);
  const cardMethods = ['viettel_card', 'mobifone_card', 'vinaphone_card'];
  if (![...cardMethods, 'bank_transfer'].includes(method)) {
    res.status(400).json({ message: 'Phương thức nạp không hợp lệ.' });
    return;
  }
  if (!Number.isInteger(amount) || amount < 10000) {
    res.status(400).json({ message: 'Số tiền nạp tối thiểu là 10.000đ.' });
    return;
  }
  if (amount > 100000000 || amount % 1000 !== 0) {
    res.status(400).json({ message: 'Số tiền nạp không hợp lệ.' });
    return;
  }
  const code = `NAP${nanoid()}`;
  let transferContent = code;
  let cardSerial = '';
  let cardCode = '';
  if (cardMethods.includes(method)) {
    cardSerial = clampText(req.body.serial, 80);
    cardCode = clampText(req.body.code, 80);
    if (!cardSerial || !cardCode) {
      res.status(400).json({ message: 'Vui lòng nhập serial và mã thẻ.' });
      return;
    }
    transferContent = `CARD-${method.toUpperCase()}-${cardSerial.slice(-6)}-${code}`;
  }
  const result = db.transaction(() => {
    const depositResult = db.prepare(`
      INSERT INTO deposits (transaction_code, user_id, method, amount, transfer_content, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(code, req.user.id, method, amount, transferContent);
    if (cardMethods.includes(method)) {
      db.prepare(`
        INSERT INTO card_deposit_jobs (deposit_id, provider, serial, card_code, declared_amount, status)
        VALUES (?, ?, ?, ?, ?, 'queued')
      `).run(depositResult.lastInsertRowid, method, cardSerial, cardCode, amount);
    }
    return depositResult;
  })();
  const deposit = db.prepare('SELECT * FROM deposits WHERE id = ?').get(result.lastInsertRowid);
  res.json({ deposit, bank: publicSettings() });
});

app.get('/api/webhooks/card-worker/jobs', webhookLimiter, (req, res) => {
  if (!cardWorkerSecretOk(req)) {
    logSecurity({ eventType: 'card_worker_secret_denied', severity: 'high', message: 'Invalid card worker secret.', req });
    res.status(401).json({ success: false, message: 'Worker secret không hợp lệ.' });
    return;
  }
  const limit = Math.min(20, Math.max(1, Number(req.query.limit || 5)));
  const jobs = db.transaction(() => {
    const rows = db.prepare(`
      SELECT card_deposit_jobs.*, deposits.transaction_code, deposits.method, deposits.amount, deposits.status AS deposit_status
      FROM card_deposit_jobs
      JOIN deposits ON deposits.id = card_deposit_jobs.deposit_id
      WHERE deposits.status = 'pending'
        AND card_deposit_jobs.status IN ('queued','retry','processing')
        AND (card_deposit_jobs.locked_until IS NULL OR datetime(card_deposit_jobs.locked_until) <= datetime('now'))
      ORDER BY card_deposit_jobs.created_at ASC
      LIMIT ?
    `).all(limit);
    const lockUntil = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    for (const job of rows) {
      db.prepare(`
        UPDATE card_deposit_jobs
        SET status = 'processing', attempts = attempts + 1, locked_until = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status IN ('queued','retry','processing')
      `).run(lockUntil, job.id);
    }
    return rows;
  })();
  res.json({ success: true, jobs });
});

app.post('/api/webhooks/card-worker/result', webhookLimiter, (req, res) => {
  if (!cardWorkerSecretOk(req)) {
    logSecurity({ eventType: 'card_worker_secret_denied', severity: 'high', message: 'Invalid card worker secret.', req });
    res.status(401).json({ success: false, ignored: true, message: 'Worker secret không hợp lệ.' });
    return;
  }
  try {
    const result = processCardWorkerResult(req.body || {});
    if (result?.ignored) {
      res.json({ success: false, ignored: true, message: result.message, deposit: result.deposit || null });
      return;
    }
    res.json({ success: true, ignored: false, message: 'Đã xử lý kết quả thẻ.', deposit: result });
  } catch (error) {
    res.status(400).json({ success: false, ignored: true, message: error.message });
  }
});

app.post('/api/webhooks/deposits', webhookLimiter, (req, res) => {
  const allowedSecrets = [setting('sepay_webhook_secret'), setting('card_webhook_secret')].map((value) => String(value || '').trim()).filter(Boolean);
  const providedSecrets = extractWebhookSecret(req);
  if (!allowedSecrets.length || !providedSecrets.some((secret) => allowedSecrets.includes(secret))) {
    logSecurity({ eventType: 'webhook_secret_denied', severity: 'high', message: 'Invalid deposit webhook secret.', req });
    res.status(401).json({ success: false, ignored: true, message: 'Webhook secret không hợp lệ.' });
    return;
  }
  if (!verifyOptionalWebhookSignature(req)) {
    logSecurity({ eventType: 'webhook_signature_denied', severity: 'high', message: 'Invalid deposit webhook signature.', req });
    res.status(401).json({ success: false, ignored: true, message: 'Webhook signature không hợp lệ.' });
    return;
  }
  try {
    const deposit = processIncomingDepositTransfer(req.body, 'Webhook');
    if (deposit?.ignored) {
      res.json({ success: false, ignored: true, message: deposit.message, deposit: deposit.deposit || null });
      return;
    }
    res.json({ success: true, ignored: false, message: 'Đã xác nhận giao dịch và cộng tiền.', deposit });
  } catch (error) {
    res.json({ success: false, ignored: true, message: error.message });
  }
});

function handleGachTheFastWebhook(req, res) {
  const payload = cardWebhookPayload(req);
  if (!cardCallbackSecretOk(req, payload)) {
    logSecurity({ eventType: 'card_webhook_secret_denied', severity: 'high', message: 'Invalid GachTheFast webhook secret.', req });
    res.status(401).json({ success: false, ignored: true, message: 'Card webhook secret không hợp lệ.' });
    return;
  }
  try {
    const result = processGachTheFastCallback(payload);
    if (result?.ignored) {
      res.json({ success: false, ignored: true, message: result.message, deposit: result.deposit || null });
      return;
    }
    res.json({ success: true, ignored: false, message: 'Đã xác nhận thẻ và cộng tiền.', deposit: result });
  } catch (error) {
    res.json({ success: false, ignored: true, message: error.message });
  }
}

app.get('/api/webhooks/cards/gachthefast', webhookLimiter, handleGachTheFastWebhook);
app.post('/api/webhooks/cards/gachthefast', webhookLimiter, handleGachTheFastWebhook);

app.get('/api/webhooks/deposits/pending-codes', webhookLimiter, (req, res) => {
  const allowedSecrets = [setting('sepay_webhook_secret')].map((value) => String(value || '').trim()).filter(Boolean);
  const providedSecrets = extractWebhookSecret(req);
  if (!allowedSecrets.length || !providedSecrets.some((secret) => allowedSecrets.includes(secret))) {
    logSecurity({ eventType: 'pending_codes_secret_denied', severity: 'high', message: 'Invalid pending-codes secret.', req });
    res.status(401).json({ success: false, message: 'Webhook secret không hợp lệ.' });
    return;
  }
  const deposits = db.prepare(`
    SELECT id, transaction_code, transfer_content, amount
    FROM deposits
    WHERE status = 'pending' AND method = 'bank_transfer'
    ORDER BY created_at DESC
    LIMIT 300
  `).all();
  res.json({ deposits });
});

app.post('/api/webhooks/sepay-bot/report', webhookLimiter, (req, res) => {
  const allowedSecrets = [setting('sepay_webhook_secret')].map((value) => String(value || '').trim()).filter(Boolean);
  const providedSecrets = extractWebhookSecret(req);
  if (!allowedSecrets.length || !providedSecrets.some((secret) => allowedSecrets.includes(secret))) {
    logSecurity({ eventType: 'bot_report_secret_denied', severity: 'high', message: 'Invalid bot report secret.', req });
    res.status(401).json({ success: false, message: 'Webhook secret không hợp lệ.' });
    return;
  }
  const report = req.body || {};
  setSetting('sepay_bot_last_run_at', String(report.ran_at || new Date().toISOString()));
  setSetting('sepay_bot_last_error', report.ok === false ? String(report.error || 'Bot lỗi không rõ nguyên nhân.') : '');
  setSetting('sepay_bot_last_result', JSON.stringify(report).slice(0, 5000));
  res.json({ success: true });
});

app.use('/api/admin', adminLimiter);

app.post('/api/admin/sepay-bot/run', requireAdmin, async (_req, res) => {
  try {
    const result = await runSepayBotOnce();
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/admin/sepay-bot/status', requireAdmin, (_req, res) => {
  res.json({ status: sepayBotStatus() });
});

app.get('/api/orders', requireAuth, (req, res) => {
  const orders = db.prepare(`
    SELECT orders.*, GROUP_CONCAT(order_items.item_name, ', ') as item_names
    FROM orders
    LEFT JOIN order_items ON order_items.order_id = orders.id
    WHERE orders.user_id = ?
    GROUP BY orders.id
    ORDER BY orders.created_at DESC
  `).all(req.user.id);
  res.json({ orders });
});

app.get('/api/orders/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) {
    res.status(404).json({ message: 'Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n h\u00e0ng.' });
    return;
  }
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const logs = db.prepare('SELECT * FROM order_status_logs WHERE order_id = ? ORDER BY created_at ASC').all(order.id);
  const messages = db.prepare(`
    SELECT order_chat_messages.*, users.username as sender_username, users.role as sender_role
    FROM order_chat_messages
    JOIN users ON users.id = order_chat_messages.sender_id
    WHERE order_chat_messages.order_id = ?
    ORDER BY order_chat_messages.created_at ASC
    LIMIT 300
  `).all(order.id);
  db.prepare('UPDATE order_chat_messages SET is_read = 1 WHERE order_id = ? AND sender_id != ?').run(order.id, req.user.id);
  res.json({ order, items, logs, messages });
});

app.post('/api/orders/:id/chat', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) {
    res.status(404).json({ message: 'Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n h\u00e0ng.' });
    return;
  }
  try {
    const message = chatMessageWithImage(req.body.message, req.body.image_url);
    if (!message) {
      res.status(400).json({ message: 'Vui l\u00f2ng nh\u1eadp n\u1ed9i dung ho\u1eb7c g\u1eedi \u1ea3nh.' });
      return;
    }
    db.prepare('INSERT INTO order_chat_messages (order_id, user_id, sender_id, message) VALUES (?, ?, ?, ?)')
      .run(order.id, req.user.id, req.user.id, message);
    notifyUser(req.user.id, '\u0110\u00e3 g\u1eedi tin nh\u1eafn \u0111\u01a1n h\u00e0ng', `Shop s\u1ebd ph\u1ea3n h\u1ed3i \u0111\u01a1n ${order.order_code}.`, 'order');
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/orders/buy', requireAuth, purchaseLimiter, (req, res) => {
  if (setting('purchase_enabled', 'true') !== 'true') {
    res.status(403).json({ message: 'Website đang tắt mua hàng.' });
    return;
  }
  const { itemId, quantity } = req.body;
  const robloxUsername = clampText(req.body.robloxUsername, 32);
  const customerNote = clampText(req.body.customerNote, 500);
  const requestedItems = Array.isArray(req.body.items) && req.body.items.length
    ? req.body.items
    : [{ itemId, quantity }];
  if (!robloxUsername || !requestedItems.length) {
    res.status(400).json({ message: 'Vui lòng nhập Roblox Username và item cần mua.' });
    return;
  }
  if (!/^[A-Za-z0-9_]{3,32}$/.test(robloxUsername)) {
    res.status(400).json({ message: 'Roblox Username không hợp lệ.' });
    return;
  }
  if (requestedItems.length > 20) {
    res.status(400).json({ message: 'Giỏ hàng có quá nhiều loại item.' });
    return;
  }

  try {
    const result = db.transaction(() => {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      const normalizedItems = requestedItems.map((entry) => ({
        itemId: Number(entry.itemId),
        quantity: Number(entry.quantity),
      })).filter((entry) => Number.isInteger(entry.itemId) && Number.isInteger(entry.quantity) && entry.quantity > 0 && entry.quantity <= 999);
      if (!normalizedItems.length) throw new Error('Giỏ hàng không hợp lệ.');
      const merged = new Map();
      for (const entry of normalizedItems) merged.set(entry.itemId, (merged.get(entry.itemId) || 0) + entry.quantity);
      const orderItems = [];
      for (const [targetItemId, qty] of merged.entries()) {
        const item = db.prepare("SELECT * FROM items WHERE id = ? AND status = 'active'").get(targetItemId);
        if (!item) throw new Error('Item không tồn tại.');
        if (item.stock < qty) throw new Error(`${item.name} đã hết hàng hoặc không đủ số lượng.`);
        const price = item.sale_price || item.price;
        orderItems.push({ item, qty, price, total: price * qty });
      }
      const total = orderItems.reduce((sum, entry) => sum + entry.total, 0);
      if (!Number.isSafeInteger(total) || total <= 0) throw new Error('Tổng đơn hàng không hợp lệ.');
      if (user.balance < total) throw new Error('Số dư không đủ. Vui lòng nạp thêm tiền.');
      const before = user.balance;
      const after = before - total;
      db.prepare('UPDATE users SET balance = ?, total_spent = total_spent + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(after, total, user.id);
      const orderCode = `SP${nanoid()}`;
      const orderResult = db.prepare(`
        INSERT INTO orders (order_code, user_id, total_amount, status, roblox_username, roblox_profile, roblox_display_name, customer_note)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
      `).run(orderCode, user.id, total, robloxUsername, '', '', customerNote || '');
      for (const entry of orderItems) {
        const stockUpdate = db.prepare('UPDATE items SET stock = stock - ?, sold_count = sold_count + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND stock >= ?')
          .run(entry.qty, entry.qty, entry.item.id, entry.qty);
        if (stockUpdate.changes !== 1) throw new Error(`${entry.item.name} vừa hết hàng, vui lòng thử lại.`);
        db.prepare(`
          INSERT INTO order_items (order_id, item_id, item_name, quantity, price, total_price)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(orderResult.lastInsertRowid, entry.item.id, entry.item.name, entry.qty, entry.price, entry.total);
      }
      db.prepare('INSERT INTO order_status_logs (order_id, old_status, new_status, note, created_by) VALUES (?, NULL, ?, ?, ?)')
        .run(orderResult.lastInsertRowid, 'pending', 'Đơn hàng mới được tạo.', user.id);
      createBalanceLog({
        userId: user.id,
        type: 'purchase',
        amount: -total,
        before,
        after,
        referenceId: orderResult.lastInsertRowid,
        referenceType: 'order',
        note: `Mua ${orderItems.length} loại item`,
      });
      notifyUser(user.id, 'Mua item thành công', `Đơn ${orderCode} đang chờ xử lý.`, 'order');
      const order = db.prepare('SELECT orders.*, users.username FROM orders JOIN users ON users.id = orders.user_id WHERE orders.id = ?').get(orderResult.lastInsertRowid);
      const savedItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderResult.lastInsertRowid);
      createInitialOrderChat({ orderId: order.id, userId: user.id, message: createOrderChatSummary({ order, items: savedItems }) });
      return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderResult.lastInsertRowid);
    })();
    res.json({ order: result });
  } catch (error) {
    logSecurity({ eventType: 'purchase_failed', userId: req.user.id, severity: 'low', message: error.message, req });
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/balance-logs', requireAuth, (req, res) => {
  const logs = db.prepare('SELECT * FROM balance_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(req.user.id);
  res.json({ logs });
});

app.get('/api/notifications', requireAuth, (req, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json({ notifications });
});

app.get('/api/chat', requireAuth, (req, res) => {
  const messages = db.prepare(`
    SELECT chat_messages.*, users.username as sender_username, users.role as sender_role
    FROM chat_messages
    JOIN users ON users.id = chat_messages.sender_id
    WHERE chat_messages.user_id = ?
    ORDER BY chat_messages.created_at ASC
    LIMIT 200
  `).all(req.user.id);
  db.prepare('UPDATE chat_messages SET is_read = 1 WHERE user_id = ? AND sender_id != ?').run(req.user.id, req.user.id);
  res.json({ messages });
});

app.post('/api/chat', requireAuth, (req, res) => {
  try {
    const message = chatMessageWithImage(req.body.message, req.body.image_url);
    if (!message) {
      res.status(400).json({ message: 'Vui l\u00f2ng nh\u1eadp n\u1ed9i dung ho\u1eb7c g\u1eedi \u1ea3nh.' });
      return;
    }
    db.prepare('INSERT INTO chat_messages (user_id, sender_id, message) VALUES (?, ?, ?)').run(req.user.id, req.user.id, message.slice(0, 2500));
    notifyUser(req.user.id, '\u0110\u00e3 g\u1eedi tin nh\u1eafn', 'Admin s\u1ebd ph\u1ea3n h\u1ed3i trong th\u1eddi gian s\u1edbm nh\u1ea5t.', 'chat');
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/reviews', requireAuth, (req, res) => {
  const { orderId, rating, content, image } = req.body;
  const score = Number(rating);
  if (!Number.isInteger(score) || score < 1 || score > 5 || !content) {
    res.status(400).json({ message: 'Đánh giá cần số sao 1-5 và nội dung.' });
    return;
  }
  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'completed'").get(orderId, req.user.id);
  if (!order) {
    res.status(400).json({ message: 'Chỉ đánh giá được đơn đã hoàn thành.' });
    return;
  }
  const orderItem = db.prepare('SELECT * FROM order_items WHERE order_id = ? LIMIT 1').get(order.id);
  try {
    db.prepare(`
      INSERT INTO reviews (user_id, item_id, order_id, rating, content, image, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(req.user.id, orderItem.item_id, order.id, score, content, image || '');
    res.json({ message: 'Đã gửi đánh giá, vui lòng chờ admin duyệt.' });
  } catch (_error) {
    res.status(409).json({ message: 'Đơn này đã được đánh giá.' });
  }
});

app.get('/api/profile/summary', requireAuth, (req, res) => {
  const deposits = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = ? AND status = 'success'").get(req.user.id).total;
  const orders = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE user_id = ? AND status IN ('pending','processing','completed')").get(req.user.id).total;
  res.json({ user: sanitizeUser(req.user), total_deposited: deposits, total_spent: orders });
});

app.patch('/api/profile', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET full_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(req.body.full_name || '', req.body.phone || '', req.user.id);
  res.json({ user: sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

app.post('/api/profile/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!bcrypt.compareSync(currentPassword || '', req.user.password_hash)) {
    res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
    return;
  }
  if (!newPassword || newPassword !== confirmPassword || String(newPassword).length < 8) {
    res.status(400).json({ message: 'Mật khẩu mới phải từ 8 ký tự và nhập lại khớp.' });
    return;
  }
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(bcrypt.hashSync(newPassword, 12), req.user.id);
  notifyUser(req.user.id, 'Đổi mật khẩu thành công', 'Mật khẩu tài khoản của bạn đã được cập nhật.', 'auth');
  res.json({ message: 'Đổi mật khẩu thành công.' });
});

app.post('/api/uploads/chat-image', requireAuth, upload.single('image'), (req, res) => {
  try {
    validateUploadedImage(req.file);
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/uploads/image', requireAdmin, upload.single('image'), (req, res) => {
  try {
    validateUploadedImage(req.file);
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
  const stats = {
    totalUsers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get().count,
    totalUserBalance: db.prepare("SELECT COALESCE(SUM(balance), 0) as total FROM users WHERE role = 'user'").get().total,
    totalRevenue: db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status IN ('pending','processing','completed')").get().total,
    revenueToday: db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE date(created_at) = date('now') AND status IN ('pending','processing','completed')").get().total,
    revenueMonth: db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') AND status IN ('pending','processing','completed')").get().total,
    totalOrders: db.prepare('SELECT COUNT(*) as count FROM orders').get().count,
    pendingOrders: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get().count,
    processingOrders: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'processing'").get().count,
    completedOrders: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'").get().count,
    cancelledOrders: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled'").get().count,
  };
  const topItems = db.prepare('SELECT * FROM items ORDER BY sold_count DESC LIMIT 5').all().map(parseItem);
  const deposits = db.prepare('SELECT deposits.*, users.username FROM deposits JOIN users ON users.id = deposits.user_id ORDER BY deposits.created_at DESC LIMIT 8').all();
  const orders = db.prepare('SELECT orders.*, users.username FROM orders JOIN users ON users.id = orders.user_id ORDER BY orders.created_at DESC LIMIT 8').all();
  res.json({ stats, topItems, deposits, orders });
});

app.get('/api/admin/items', requireAdmin, (req, res) => {
  const search = String(req.query.search || '');
  const rows = search
    ? db.prepare('SELECT * FROM items WHERE name LIKE ? OR slug LIKE ? ORDER BY sort_order ASC, id DESC').all(`%${search}%`, `%${search}%`)
    : db.prepare('SELECT * FROM items ORDER BY sort_order ASC, id DESC').all();
  res.json({ items: rows.map(parseItem) });
});

app.post('/api/admin/items', requireAdmin, (req, res) => {
  const body = req.body;
  const slug = body.slug ? normalizeSlug(body.slug) : normalizeSlug(body.name);
  const result = db.prepare(`
    INSERT INTO items (
      name, slug, item_code, image, gallery, short_description, description, price, original_price, sale_price,
      stock, is_featured, is_best_seller, is_sale, status, sort_order, seo_title, seo_description
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.name,
    slug,
    body.item_code || '',
    body.image || '',
    JSON.stringify(body.gallery || []),
    body.short_description || '',
    body.description || '',
    Number(body.price || 0),
    Number(body.original_price || 0),
    body.sale_price ? Number(body.sale_price) : null,
    Number(body.stock || 0),
    body.is_featured ? 1 : 0,
    body.is_best_seller ? 1 : 0,
    body.is_sale ? 1 : 0,
    body.status || 'active',
    Number(body.sort_order || 0),
    body.seo_title || body.name,
    body.seo_description || body.short_description || '',
  );
  logAdmin(req.user.id, 'create_item', 'item', result.lastInsertRowid, req);
  res.json({ item: parseItem(db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid)) });
});

app.patch('/api/admin/items/:id', requireAdmin, (req, res) => {
  const body = req.body;
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ message: 'Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n h\u00e0ng.' });
    return;
  }
  db.prepare(`
    UPDATE items SET name = ?, slug = ?, item_code = ?, image = ?, gallery = ?, short_description = ?, description = ?,
      price = ?, original_price = ?, sale_price = ?, stock = ?, is_featured = ?, is_best_seller = ?, is_sale = ?,
      status = ?, sort_order = ?, seo_title = ?, seo_description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    body.name ?? existing.name,
    body.slug ? normalizeSlug(body.slug) : existing.slug,
    body.item_code ?? existing.item_code,
    body.image ?? existing.image,
    JSON.stringify(body.gallery ?? JSON.parse(existing.gallery || '[]')),
    body.short_description ?? existing.short_description,
    body.description ?? existing.description,
    Number(body.price ?? existing.price),
    Number(body.original_price ?? existing.original_price ?? 0),
    body.sale_price === '' ? null : Number(body.sale_price ?? existing.sale_price),
    Number(body.stock ?? existing.stock),
    body.is_featured ? 1 : 0,
    body.is_best_seller ? 1 : 0,
    body.is_sale ? 1 : 0,
    body.status ?? existing.status,
    Number(body.sort_order ?? existing.sort_order),
    body.seo_title ?? existing.seo_title,
    body.seo_description ?? existing.seo_description,
    existing.id,
  );
  logAdmin(req.user.id, 'update_item', 'item', existing.id, req);
  res.json({ item: parseItem(db.prepare('SELECT * FROM items WHERE id = ?').get(existing.id)) });
});

app.delete('/api/admin/items/:id', requireAdmin, (req, res) => {
  const used = db.prepare('SELECT COUNT(*) as count FROM order_items WHERE item_id = ?').get(req.params.id).count;
  if (used > 0) {
    db.prepare("UPDATE items SET status = 'hidden', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  } else {
    db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  }
  logAdmin(req.user.id, 'delete_item', 'item', Number(req.params.id), req);
  res.json({ ok: true, softDeleted: used > 0 });
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const status = String(req.query.status || '');
  const search = String(req.query.search || '');
  const where = [];
  const params = [];
  if (status) {
    where.push('orders.status = ?');
    params.push(status);
  }
  if (search) {
    where.push('(orders.order_code LIKE ? OR users.username LIKE ? OR orders.roblox_username LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orders = db.prepare(`
    SELECT orders.*, users.username, users.email FROM orders
    JOIN users ON users.id = orders.user_id
    ${sqlWhere}
    ORDER BY orders.created_at DESC
  `).all(...params);
  res.json({ orders });
});

app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    res.status(404).json({ message: 'Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n h\u00e0ng.' });
    return;
  }
  db.transaction(() => {
    db.prepare('DELETE FROM order_chat_messages WHERE order_id = ?').run(order.id);
    db.prepare('DELETE FROM reviews WHERE order_id = ?').run(order.id);
    db.prepare('DELETE FROM order_status_logs WHERE order_id = ?').run(order.id);
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(order.id);
    db.prepare('DELETE FROM orders WHERE id = ?').run(order.id);
    logAdmin(req.user.id, 'delete_order', 'order', order.id, req);
  })();
  res.json({ ok: true });
});

app.get('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const order = db.prepare('SELECT orders.*, users.username, users.email FROM orders JOIN users ON users.id = orders.user_id WHERE orders.id = ?').get(req.params.id);
  if (!order) {
    res.status(404).json({ message: 'Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n h\u00e0ng.' });
    return;
  }
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const logs = db.prepare('SELECT * FROM order_status_logs WHERE order_id = ? ORDER BY created_at ASC').all(order.id);
  res.json({ order, items, logs });
});

app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  const { status, admin_note, internal_note, refund_reason, assigned_to } = req.body;
  if (!Object.keys(orderStatusLabels).includes(status)) {
    res.status(400).json({ message: 'Trạng thái đơn không hợp lệ.' });
    return;
  }
  try {
    const updated = db.transaction(() => {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
      if (!order) throw new Error('Không tìm thấy đơn hàng.');
      if (status === 'refunded') {
        if (order.status === 'refunded') throw new Error('Đơn đã hoàn tiền trước đó.');
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(order.user_id);
        const before = user.balance;
        const after = before + order.total_amount;
        db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(after, user.id);
        createBalanceLog({
          userId: user.id,
          type: 'refund',
          amount: order.total_amount,
          before,
          after,
          referenceId: order.id,
          referenceType: 'order',
          note: refund_reason || 'Hoàn tiền đơn hàng',
          createdBy: req.user.id,
        });
        notifyUser(user.id, 'Đơn được hoàn tiền', `Đơn ${order.order_code} đã được hoàn tiền.`, 'order');
      }
      const completedAt = status === 'completed' ? 'CURRENT_TIMESTAMP' : 'completed_at';
      db.prepare(`
        UPDATE orders SET status = ?, admin_note = ?, internal_note = ?, refund_reason = ?,
          assigned_to = ?, completed_at = ${completedAt}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, admin_note || order.admin_note || '', internal_note || order.internal_note || '', refund_reason || order.refund_reason || '', assigned_to || order.assigned_to || null, order.id);
      db.prepare('INSERT INTO order_status_logs (order_id, old_status, new_status, note, created_by) VALUES (?, ?, ?, ?, ?)')
        .run(order.id, order.status, status, admin_note || orderStatusLabels[status], req.user.id);
      if (status === 'processing') notifyUser(order.user_id, 'Đơn đang xử lý', `Đơn ${order.order_code} đang được shop xử lý.`, 'order');
      if (status === 'completed') notifyUser(order.user_id, '\u0110\u01a1n \u0111\u00e3 giao h\u00e0ng', `\u0110\u01a1n ${order.order_code} \u0111\u00e3 giao h\u00e0ng.`, 'order');
      if (status === 'cancelled') notifyUser(order.user_id, 'Đơn đã hủy', `Đơn ${order.order_code} đã bị hủy.`, 'order');
      logAdmin(req.user.id, 'update_order_status', 'order', order.id, req);
      return db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    })();
    res.json({ order: updated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const search = String(req.query.search || '');
  const users = search
    ? db.prepare('SELECT id, username, email, balance, role, status, total_deposited, total_spent, created_at FROM users WHERE username LIKE ? OR email LIKE ? ORDER BY created_at DESC').all(`%${search}%`, `%${search}%`)
    : db.prepare('SELECT id, username, email, balance, role, status, total_deposited, total_spent, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    res.status(404).json({ message: 'Kh\u00f4ng t\u00ecm th\u1ea5y user.' });
    return;
  }
  const nextStatus = req.body.status || user.status;
  const nextRole = req.body.role || user.role;
  if (!['active', 'locked', 'banned'].includes(nextStatus) || !['user', 'admin', 'super_admin'].includes(nextRole)) {
    res.status(400).json({ message: 'Trạng thái hoặc quyền không hợp lệ.' });
    return;
  }
  if (req.body.role && req.user.role !== 'super_admin') {
    logSecurity({ eventType: 'role_update_denied', userId: req.user.id, severity: 'high', message: 'Non-super-admin attempted role change.', req, metadata: { targetUserId: user.id, nextRole } });
    res.status(403).json({ message: 'Chỉ super admin được đổi quyền tài khoản.' });
    return;
  }
  if (user.id === req.user.id && nextStatus !== 'active') {
    res.status(400).json({ message: 'Không thể tự khóa tài khoản đang đăng nhập.' });
    return;
  }
  db.prepare('UPDATE users SET status = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(nextStatus, nextRole, user.id);
  logAdmin(req.user.id, 'update_user', 'user', user.id, req);
  res.json({ user: sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
});

app.post('/api/admin/users/:id/adjust-balance', requireAdmin, (req, res) => {
  const amount = Number(req.body.amount);
  const note = clampText(req.body.note, 300);
  if (!Number.isInteger(amount) || amount === 0 || !note) {
    res.status(400).json({ message: 'Cần nhập số tiền cộng/trừ và lý do.' });
    return;
  }
  if (Math.abs(amount) > 100000000) {
    res.status(400).json({ message: 'Số tiền điều chỉnh quá lớn.' });
    return;
  }
  try {
    const user = db.transaction(() => {
      const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
      if (!target) throw new Error('Không tìm thấy user.');
      const before = target.balance;
      const after = before + amount;
      if (after < 0) throw new Error('Không thể trừ quá số dư hiện tại.');
      db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(after, target.id);
      createBalanceLog({
        userId: target.id,
        type: amount > 0 ? 'admin_add' : 'admin_subtract',
        amount,
        before,
        after,
        referenceType: 'admin',
        note,
        createdBy: req.user.id,
      });
      notifyUser(target.id, amount > 0 ? 'Admin cộng tiền' : 'Admin trừ tiền', note, 'balance');
      logAdmin(req.user.id, 'adjust_balance', 'user', target.id, req);
      return db.prepare('SELECT * FROM users WHERE id = ?').get(target.id);
    })();
    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/admin/chats', requireAdmin, (_req, res) => {
  const chats = db.prepare(`
    SELECT users.id as user_id, users.username, users.email,
      MAX(chat_messages.created_at) as last_message_at,
      SUM(CASE WHEN chat_messages.sender_id = users.id AND chat_messages.is_read = 0 THEN 1 ELSE 0 END) as unread_count,
      (
        SELECT message FROM chat_messages latest
        WHERE latest.user_id = users.id
        ORDER BY latest.created_at DESC
        LIMIT 1
      ) as last_message
    FROM chat_messages
    JOIN users ON users.id = chat_messages.user_id
    GROUP BY users.id
    ORDER BY last_message_at DESC
  `).all();
  res.json({ chats });
});

app.get('/api/admin/chats/:userId', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(req.params.userId);
  if (!user) {
    res.status(404).json({ message: 'Kh\u00f4ng t\u00ecm th\u1ea5y user.' });
    return;
  }
  const messages = db.prepare(`
    SELECT chat_messages.*, users.username as sender_username, users.role as sender_role
    FROM chat_messages
    JOIN users ON users.id = chat_messages.sender_id
    WHERE chat_messages.user_id = ?
    ORDER BY chat_messages.created_at ASC
    LIMIT 200
  `).all(req.params.userId);
  db.prepare('UPDATE chat_messages SET is_read = 1 WHERE user_id = ? AND sender_id = ?').run(req.params.userId, req.params.userId);
  res.json({ user, messages });
});

app.post('/api/admin/chats/:userId', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
  if (!user) {
    res.status(404).json({ message: 'Kh\u00f4ng t\u00ecm th\u1ea5y user.' });
    return;
  }
  try {
    const message = chatMessageWithImage(req.body.message, req.body.image_url);
    if (!message) {
      res.status(400).json({ message: 'Vui l\u00f2ng nh\u1eadp n\u1ed9i dung ho\u1eb7c g\u1eedi \u1ea3nh.' });
      return;
    }
    db.prepare('INSERT INTO chat_messages (user_id, sender_id, message) VALUES (?, ?, ?)').run(user.id, req.user.id, message.slice(0, 2500));
    notifyUser(user.id, 'Admin \u0111\u00e3 ph\u1ea3n h\u1ed3i chat', message.slice(0, 180), 'chat');
    logAdmin(req.user.id, 'reply_chat', 'user', user.id, req);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/admin/order-chats', requireAdmin, (_req, res) => {
  const chats = db.prepare(`
    SELECT orders.id as order_id, orders.order_code, orders.total_amount, orders.roblox_username,
      users.id as user_id, users.username, users.email,
      MAX(order_chat_messages.created_at) as last_message_at,
      SUM(CASE WHEN order_chat_messages.sender_id = users.id AND order_chat_messages.is_read = 0 THEN 1 ELSE 0 END) as unread_count,
      (
        SELECT message FROM order_chat_messages latest
        WHERE latest.order_id = orders.id
        ORDER BY latest.created_at DESC
        LIMIT 1
      ) as last_message
    FROM order_chat_messages
    JOIN orders ON orders.id = order_chat_messages.order_id
    JOIN users ON users.id = orders.user_id
    GROUP BY orders.id
    ORDER BY last_message_at DESC
  `).all();
  res.json({ chats });
});

app.get('/api/admin/order-chats/:orderId', requireAdmin, (req, res) => {
  const order = db.prepare(`
    SELECT orders.*, users.username, users.email
    FROM orders
    JOIN users ON users.id = orders.user_id
    WHERE orders.id = ?
  `).get(req.params.orderId);
  if (!order) {
    res.status(404).json({ message: 'Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n h\u00e0ng.' });
    return;
  }
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const messages = db.prepare(`
    SELECT order_chat_messages.*, users.username as sender_username, users.role as sender_role
    FROM order_chat_messages
    JOIN users ON users.id = order_chat_messages.sender_id
    WHERE order_chat_messages.order_id = ?
    ORDER BY order_chat_messages.created_at ASC
    LIMIT 300
  `).all(order.id);
  db.prepare('UPDATE order_chat_messages SET is_read = 1 WHERE order_id = ? AND sender_id = ?').run(order.id, order.user_id);
  res.json({ order, items, messages });
});

app.post('/api/admin/order-chats/:orderId', requireAdmin, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) {
    res.status(404).json({ message: 'Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n h\u00e0ng.' });
    return;
  }
  try {
    const message = chatMessageWithImage(req.body.message, req.body.image_url);
    if (!message) {
      res.status(400).json({ message: 'Vui l\u00f2ng nh\u1eadp n\u1ed9i dung ho\u1eb7c g\u1eedi \u1ea3nh.' });
      return;
    }
    db.prepare('INSERT INTO order_chat_messages (order_id, user_id, sender_id, message) VALUES (?, ?, ?, ?)')
      .run(order.id, order.user_id, req.user.id, message.slice(0, 2500));
    notifyUser(order.user_id, 'Admin ph\u1ea3n h\u1ed3i \u0111\u01a1n h\u00e0ng', message.slice(0, 180), 'order');
    logAdmin(req.user.id, 'reply_order_chat', 'order', order.id, req);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/admin/deposits', requireAdmin, (req, res) => {
  const status = String(req.query.status || '');
  const userId = Number(req.query.user_id || 0);
  const where = [];
  const params = [];
  if (status) {
    where.push('deposits.status = ?');
    params.push(status);
  }
  if (Number.isInteger(userId) && userId > 0) {
    where.push('deposits.user_id = ?');
    params.push(userId);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const deposits = db.prepare(`
    SELECT deposits.*, users.username, users.email
    FROM deposits
    JOIN users ON users.id = deposits.user_id
    ${clause}
    ORDER BY deposits.created_at DESC
  `).all(...params);
  res.json({ deposits });
});

app.patch('/api/admin/deposits/:id', requireAdmin, (req, res) => {
  const { status, admin_note, bank_transaction_id } = req.body;
  try {
    const deposit = db.transaction(() => {
      const current = db.prepare('SELECT * FROM deposits WHERE id = ?').get(req.params.id);
      if (!current) throw new Error('Không tìm thấy giao dịch.');
      if (current.status === 'success') throw new Error('Giao dịch đã được cộng tiền.');
      if (status === 'success') {
        completeDeposit(current, { createdBy: req.user.id, transactionId: bank_transaction_id, adminNote: admin_note || current.admin_note || '' });
      } else {
        db.prepare(`
          UPDATE deposits SET status = ?, admin_note = ?, bank_transaction_id = ?, completed_at = CASE WHEN ? IN ('failed','cancelled') THEN CURRENT_TIMESTAMP ELSE completed_at END
          WHERE id = ?
        `).run(status || current.status, admin_note || current.admin_note || '', bank_transaction_id || current.bank_transaction_id || null, status || current.status, current.id);
      }
      logAdmin(req.user.id, 'update_deposit', 'deposit', current.id, req);
      return db.prepare('SELECT * FROM deposits WHERE id = ?').get(current.id);
    })();
    res.json({ deposit });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/admin/deposits/:id', requireAdmin, (req, res) => {
  const deposit = db.prepare('SELECT * FROM deposits WHERE id = ?').get(req.params.id);
  if (!deposit) {
    res.status(404).json({ message: 'Kh\u00f4ng t\u00ecm th\u1ea5y giao d\u1ecbch.' });
    return;
  }
  if (deposit.status === 'success') {
    res.status(400).json({ message: 'Kh\u00f4ng x\u00f3a giao d\u1ecbch \u0111\u00e3 c\u1ed9ng ti\u1ec1n \u0111\u1ec3 tr\u00e1nh l\u1ec7ch log s\u1ed1 d\u01b0.' });
    return;
  }
  db.prepare('DELETE FROM deposits WHERE id = ?').run(deposit.id);
  logAdmin(req.user.id, 'delete_deposit', 'deposit', deposit.id, req);
  res.json({ ok: true });
});

app.get('/api/admin/balance-logs', requireAdmin, (_req, res) => {
  const logs = db.prepare(`
    SELECT balance_logs.*, users.username FROM balance_logs
    JOIN users ON users.id = balance_logs.user_id
    ORDER BY balance_logs.created_at DESC LIMIT 300
  `).all();
  res.json({ logs });
});

app.get('/api/admin/reviews', requireAdmin, (_req, res) => {
  const reviews = db.prepare(`
    SELECT reviews.*, users.username, items.name as item_name FROM reviews
    JOIN users ON users.id = reviews.user_id
    JOIN items ON items.id = reviews.item_id
    ORDER BY reviews.created_at DESC
  `).all();
  res.json({ reviews });
});

app.patch('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE reviews SET status = ?, admin_reply = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(req.body.status, req.body.admin_reply || '', req.params.id);
  logAdmin(req.user.id, 'update_review', 'review', Number(req.params.id), req);
  res.json({ review: db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id) });
});

app.get('/api/admin/settings', requireAdmin, (_req, res) => {
  res.json({ settings: adminSettings() });
});

app.patch('/api/admin/settings', requireAdmin, (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    setSetting(key, String(value));
  }
  logAdmin(req.user.id, 'update_settings', 'settings', null, req);
  res.json({ settings: adminSettings() });
});

app.use('/api', (error, req, res, _next) => {
  logSecurity({ eventType: 'api_error', userId: req.user?.id, severity: 'medium', message: error.message, req });
  res.status(error.status || 500).json({ message: error.message || 'Có lỗi xảy ra, vui lòng thử lại.' });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist'), { maxAge: '1d' }));
  app.use((_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

async function startServer() {
  try {
    const persistentStore = await initPersistentStore();
    if (persistentStore.enabled) {
      console.log(`Turso persistent store ready. Local rows: ${persistentStore.localCount}, remote rows: ${persistentStore.remoteCount}`);
    } else {
      console.log(persistentStore.message);
    }
    ensureEnvAdmin();
    app.listen(port, () => {
      console.log(`Sailor Piece API running at http://localhost:${port}`);
      console.log('SePay bot chạy bằng worker/tool riêng, web chỉ nhận webhook và hiển thị report.');
    });
  } catch (error) {
    console.error('Không thể khởi động persistent store:', error);
    process.exit(1);
  }
}

startServer();
