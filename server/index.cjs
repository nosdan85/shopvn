const crypto = require('crypto');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { db, setting, setSetting } = require('./db.cjs');

const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const allowedOrigins = clientOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);
const jwtSecret = process.env.JWT_SECRET || 'change-this-secret-before-production';
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const idAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS origin không được phép.'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadDir));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false });
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
  completed: 'Đã giao item',
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

ensureEnvAdmin();

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
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });
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
    res.status(401).json({ message: 'Vui lòng đăng nhập.' });
    return;
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getCurrentUser(req);
  if (!user || user.status !== 'active' || !['admin', 'super_admin'].includes(user.role)) {
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

function extractDepositCode(value) {
  const match = normalizePaymentText(value).match(/nap[a-z0-9]+/i);
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
  const amount = parseAmount(raw.amount || raw.paid_amount || raw.transferAmount || raw.transfer_amount || raw.amount_in || raw.amountIn || raw.creditAmount || raw.credit_amount || raw.money || 0);
  const transferType = String(raw.transferType || raw.transfer_type || raw.type || raw.transaction_type || raw.direction || (amount > 0 ? 'in' : '')).trim().toLowerCase();
  return {
    transferType,
    content: String(raw.content || raw.description || raw.transferContent || raw.transfer_content || raw.transaction_content || raw.transactionContent || raw.note || raw.memo || ''),
    transactionId: String(raw.transaction_id || raw.transactionId || raw.reference || raw.referenceCode || raw.reference_code || raw.id || raw.code || ''),
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

let sepayBotRunning = false;

async function runSepayBotOnce() {
  if (sepayBotRunning) return { skipped: true, message: 'Bot đang chạy vòng trước.' };
  const apiUrl = setting('sepay_bot_api_url');
  const apiKey = setting('sepay_bot_api_key');
  if (!apiUrl || !apiKey) return { skipped: true, message: 'Thiếu SEPAY_BOT_API_URL hoặc SEPAY_BOT_API_KEY.' };
  sepayBotRunning = true;
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
    return {
      ok: true,
      total: transactions.length,
      credited: results.filter((result) => !result?.ignored).length,
      ignored: results.filter((result) => result?.ignored).length,
    };
  } finally {
    sepayBotRunning = false;
  }
}

function startSepayBot() {
  if (setting('sepay_bot_enabled', 'false') !== 'true') return;
  const intervalMs = Math.max(5000, Number(setting('sepay_bot_interval_ms', '15000')) || 15000);
  runSepayBotOnce().catch((error) => console.error('SePay bot error:', error.message));
  setInterval(() => {
    runSepayBotOnce().catch((error) => console.error('SePay bot error:', error.message));
  }, intervalMs);
}

app.get('/api/settings/public', (_req, res) => {
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
    res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
    return;
  }
  db.prepare('UPDATE users SET failed_login_count = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  if (['admin', 'super_admin'].includes(user.role)) logAdmin(user.id, 'admin_login', 'user', user.id, req);
  res.cookie('token', signToken(user), authCookieOptions()).json({ user: sanitizeUser(user) });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('token').json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET reset_token_hash = ?, reset_token_expires_at = ? WHERE id = ?').run(hash, expires, user.id);
    console.log(`Reset password link for ${email}: ${clientOrigin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`);
  }
  res.json({ message: 'Nếu email tồn tại, hệ thống đã tạo link đặt lại mật khẩu.' });
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

app.get('/api/items', (req, res) => {
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

app.get('/api/items/:slug', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE slug = ? AND status = ?').get(req.params.slug, 'active');
  if (!item) {
    res.status(404).json({ message: 'Không tìm thấy item.' });
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

app.get('/api/home', (_req, res) => {
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

app.post('/api/deposits', requireAuth, (req, res) => {
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
  const code = `NAP${nanoid()}`;
  let transferContent = `${req.user.username}-${code}`;
  if (cardMethods.includes(method)) {
    if (!req.body.serial || !req.body.code) {
      res.status(400).json({ message: 'Vui lòng nhập serial và mã thẻ.' });
      return;
    }
    transferContent = `CARD-${method.toUpperCase()}-${String(req.body.serial).slice(-6)}-${code}`;
  }
  const result = db.prepare(`
    INSERT INTO deposits (transaction_code, user_id, method, amount, transfer_content, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(code, req.user.id, method, amount, transferContent);
  const deposit = db.prepare('SELECT * FROM deposits WHERE id = ?').get(result.lastInsertRowid);
  res.json({ deposit, bank: publicSettings() });
});

app.post('/api/webhooks/deposits', (req, res) => {
  const allowedSecrets = [setting('sepay_webhook_secret'), setting('card_webhook_secret')].map((value) => String(value || '').trim()).filter(Boolean);
  const providedSecrets = extractWebhookSecret(req);
  if (!allowedSecrets.length || !providedSecrets.some((secret) => allowedSecrets.includes(secret))) {
    res.status(401).json({ success: false, ignored: true, message: 'Webhook secret không hợp lệ.' });
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

app.post('/api/admin/sepay-bot/run', requireAdmin, async (_req, res) => {
  try {
    const result = await runSepayBotOnce();
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
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
    res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    return;
  }
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const logs = db.prepare('SELECT * FROM order_status_logs WHERE order_id = ? ORDER BY created_at ASC').all(order.id);
  res.json({ order, items, logs });
});

app.post('/api/orders/buy', requireAuth, (req, res) => {
  if (setting('purchase_enabled', 'true') !== 'true') {
    res.status(403).json({ message: 'Website đang tắt mua hàng.' });
    return;
  }
  const { itemId, quantity, robloxUsername, robloxProfile, robloxDisplayName, customerNote } = req.body;
  const qty = Number(quantity);
  if (!robloxUsername || !Number.isInteger(qty) || qty < 1) {
    res.status(400).json({ message: 'Vui lòng nhập Roblox Username và số lượng hợp lệ.' });
    return;
  }

  try {
    const result = db.transaction(() => {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      const item = db.prepare("SELECT * FROM items WHERE id = ? AND status = 'active'").get(itemId);
      if (!item) throw new Error('Item không tồn tại.');
      if (item.stock < qty) throw new Error('Item đã hết hàng hoặc không đủ số lượng.');
      const price = item.sale_price || item.price;
      const total = price * qty;
      if (user.balance < total) throw new Error('Số dư không đủ. Vui lòng nạp thêm tiền.');
      const before = user.balance;
      const after = before - total;
      db.prepare('UPDATE users SET balance = ?, total_spent = total_spent + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(after, total, user.id);
      db.prepare('UPDATE items SET stock = stock - ?, sold_count = sold_count + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(qty, qty, item.id);
      const orderCode = `SP${nanoid()}`;
      const orderResult = db.prepare(`
        INSERT INTO orders (order_code, user_id, total_amount, status, roblox_username, roblox_profile, roblox_display_name, customer_note)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
      `).run(orderCode, user.id, total, robloxUsername, robloxProfile || '', robloxDisplayName || '', customerNote || '');
      db.prepare(`
        INSERT INTO order_items (order_id, item_id, item_name, quantity, price, total_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(orderResult.lastInsertRowid, item.id, item.name, qty, price, total);
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
        note: `Mua ${qty} x ${item.name}`,
      });
      notifyUser(user.id, 'Mua item thành công', `Đơn ${orderCode} đang chờ xử lý.`, 'order');
      return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderResult.lastInsertRowid);
    })();
    res.json({ order: result });
  } catch (error) {
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
  const message = String(req.body.message || '').trim();
  if (!message) {
    res.status(400).json({ message: 'Vui lòng nhập nội dung chat.' });
    return;
  }
  db.prepare('INSERT INTO chat_messages (user_id, sender_id, message) VALUES (?, ?, ?)').run(req.user.id, req.user.id, message.slice(0, 1000));
  notifyUser(req.user.id, 'Đã gửi tin nhắn', 'Admin sẽ phản hồi trong thời gian sớm nhất.', 'chat');
  res.json({ ok: true });
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

app.post('/api/uploads/image', requireAdmin, upload.single('image'), (req, res) => {
  res.json({ url: `/uploads/${req.file.filename}` });
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
    res.status(404).json({ message: 'Không tìm thấy item.' });
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
  db.prepare("UPDATE items SET status = 'hidden', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  logAdmin(req.user.id, 'hide_item', 'item', Number(req.params.id), req);
  res.json({ ok: true });
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

app.get('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const order = db.prepare('SELECT orders.*, users.username, users.email FROM orders JOIN users ON users.id = orders.user_id WHERE orders.id = ?').get(req.params.id);
  if (!order) {
    res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
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
      if (status === 'completed') notifyUser(order.user_id, 'Đơn đã giao item', `Đơn ${order.order_code} đã hoàn thành.`, 'order');
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
    res.status(404).json({ message: 'Không tìm thấy user.' });
    return;
  }
  if (req.body.role && req.user.role !== 'super_admin' && req.body.role === 'super_admin') {
    res.status(403).json({ message: 'Không thể tự nâng quyền cao nhất.' });
    return;
  }
  db.prepare('UPDATE users SET status = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(req.body.status || user.status, req.body.role || user.role, user.id);
  logAdmin(req.user.id, 'update_user', 'user', user.id, req);
  res.json({ user: sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
});

app.post('/api/admin/users/:id/adjust-balance', requireAdmin, (req, res) => {
  const amount = Number(req.body.amount);
  const note = String(req.body.note || '');
  if (!Number.isInteger(amount) || amount === 0 || !note) {
    res.status(400).json({ message: 'Cần nhập số tiền cộng/trừ và lý do.' });
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
    res.status(404).json({ message: 'Không tìm thấy user.' });
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
  const message = String(req.body.message || '').trim();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
  if (!user) {
    res.status(404).json({ message: 'Không tìm thấy user.' });
    return;
  }
  if (!message) {
    res.status(400).json({ message: 'Vui lòng nhập nội dung chat.' });
    return;
  }
  db.prepare('INSERT INTO chat_messages (user_id, sender_id, message) VALUES (?, ?, ?)').run(user.id, req.user.id, message.slice(0, 1000));
  notifyUser(user.id, 'Admin đã phản hồi chat', message.slice(0, 180), 'chat');
  logAdmin(req.user.id, 'reply_chat', 'user', user.id, req);
  res.json({ ok: true });
});

app.get('/api/admin/deposits', requireAdmin, (req, res) => {
  const status = String(req.query.status || '');
  const deposits = status
    ? db.prepare('SELECT deposits.*, users.username, users.email FROM deposits JOIN users ON users.id = deposits.user_id WHERE deposits.status = ? ORDER BY deposits.created_at DESC').all(status)
    : db.prepare('SELECT deposits.*, users.username, users.email FROM deposits JOIN users ON users.id = deposits.user_id ORDER BY deposits.created_at DESC').all();
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

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.use((_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Sailor Piece API running at http://localhost:${port}`);
  startSepayBot();
});
