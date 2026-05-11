const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let createClient = null;
try {
  ({ createClient } = require('@libsql/client'));
} catch (_error) {
  createClient = null;
}

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'sailor-piece-shop.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      full_name TEXT,
      phone TEXT,
      reset_token_hash TEXT,
      reset_token_expires_at TEXT,
      failed_login_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      total_deposited INTEGER NOT NULL DEFAULT 0,
      total_spent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      item_code TEXT,
      image TEXT,
      gallery TEXT NOT NULL DEFAULT '[]',
      short_description TEXT,
      description TEXT,
      price INTEGER NOT NULL,
      original_price INTEGER,
      sale_price INTEGER,
      stock INTEGER NOT NULL DEFAULT 0,
      sold_count INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_best_seller INTEGER NOT NULL DEFAULT 0,
      is_sale INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT,
      seo_description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      roblox_username TEXT NOT NULL,
      roblox_profile TEXT,
      roblox_display_name TEXT,
      customer_note TEXT,
      admin_note TEXT,
      internal_note TEXT,
      refund_reason TEXT,
      assigned_to INTEGER,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS order_status_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      old_status TEXT,
      new_status TEXT NOT NULL,
      note TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_code TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      method TEXT NOT NULL,
      amount INTEGER NOT NULL,
      transfer_content TEXT NOT NULL,
      bank_transaction_id TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS card_deposit_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deposit_id INTEGER NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      serial TEXT NOT NULL,
      card_code TEXT NOT NULL,
      declared_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      worker_note TEXT,
      provider_transaction_id TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      submitted_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (deposit_id) REFERENCES deposits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS balance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_before INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reference_id INTEGER,
      reference_type TEXT,
      note TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL UNIQUE,
      rating INTEGER NOT NULL,
      content TEXT NOT NULL,
      image TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_reply TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      user_id INTEGER,
      severity TEXT NOT NULL DEFAULT 'info',
      message TEXT,
      ip_address TEXT,
      user_agent TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_items_slug ON items(slug);
    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
    CREATE INDEX IF NOT EXISTS idx_items_featured ON items(status, is_featured);
    CREATE INDEX IF NOT EXISTS idx_items_sale ON items(status, is_sale);
    CREATE INDEX IF NOT EXISTS idx_items_sold ON items(status, sold_count);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_item_id ON order_items(item_id);
    CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
    CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
    CREATE INDEX IF NOT EXISTS idx_deposits_transaction_code ON deposits(transaction_code);
    CREATE INDEX IF NOT EXISTS idx_deposits_bank_transaction_id ON deposits(bank_transaction_id);
    CREATE INDEX IF NOT EXISTS idx_card_deposit_jobs_status ON card_deposit_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_card_deposit_jobs_deposit_id ON card_deposit_jobs(deposit_id);
    CREATE INDEX IF NOT EXISTS idx_balance_logs_user_id ON balance_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_order_chat_messages_order_id ON order_chat_messages(order_id);
    CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
  `;
function migrate() {
  db.exec(schemaSql);
}

const persistentTables = [
  'users',
  'items',
  'orders',
  'order_items',
  'order_status_logs',
  'deposits',
  'card_deposit_jobs',
  'balance_logs',
  'reviews',
  'notifications',
  'chat_messages',
  'order_chat_messages',
  'settings',
  'admin_logs',
  'security_events',
];
const originalPrepare = db.prepare.bind(db);
const originalTransaction = db.transaction.bind(db);
let remoteClient = null;
let remoteQueue = Promise.resolve();
let remoteReady = false;
let transactionDepth = 0;
let transactionQueue = [];

function splitSqlStatements(sql) {
  return sql.split(';').map((statement) => statement.trim()).filter(Boolean);
}

function localTableCount() {
  return persistentTables.reduce((total, table) => {
    return total + originalPrepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
  }, 0);
}

function columnsFor(table) {
  return originalPrepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function remoteTableCount() {
  let total = 0;
  for (const table of persistentTables) {
    const result = await remoteClient.execute(`SELECT COUNT(*) as count FROM ${table}`);
    total += Number(result.rows[0]?.count || 0);
  }
  return total;
}

async function migrateRemote() {
  for (const statement of splitSqlStatements(schemaSql)) {
    await remoteClient.execute(statement);
  }
}

async function backupLocalToRemote() {
  await remoteClient.execute('PRAGMA foreign_keys = OFF');
  for (const table of [...persistentTables].reverse()) {
    await remoteClient.execute(`DELETE FROM ${table}`);
  }
  for (const table of persistentTables) {
    const rows = originalPrepare(`SELECT * FROM ${table}`).all();
    const columns = columnsFor(table);
    if (!rows.length) continue;
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    for (const row of rows) {
      await remoteClient.execute({ sql, args: columns.map((column) => row[column]) });
    }
  }
  await remoteClient.execute('PRAGMA foreign_keys = ON');
}

async function restoreRemoteToLocal() {
  originalPrepare('PRAGMA foreign_keys = OFF').run();
  const deleteLocal = db.transaction(() => {
    for (const table of [...persistentTables].reverse()) originalPrepare(`DELETE FROM ${table}`).run();
  });
  deleteLocal();
  for (const table of persistentTables) {
    const columns = columnsFor(table);
    const selectColumns = columns.map((column) => `CAST(${quoteIdentifier(column)} AS TEXT) AS ${quoteIdentifier(column)}`).join(', ');
    const result = await remoteClient.execute(`SELECT ${selectColumns} FROM ${quoteIdentifier(table)}`);
    const rows = result.rows || [];
    if (!rows.length) continue;
    const placeholders = columns.map(() => '?').join(', ');
    const statement = originalPrepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);
    const insertRows = db.transaction(() => {
      for (const row of rows) statement.run(columns.map((column) => row[column]));
    });
    insertRows();
  }
  originalPrepare('PRAGMA foreign_keys = ON').run();
}

function queueRemoteRun(sql, args) {
  if (!remoteClient || !remoteReady) return;
  const normalized = String(sql || '').trim().toLowerCase();
  if (!normalized || normalized.startsWith('select') || normalized.startsWith('pragma')) return;
  if (transactionDepth > 0) {
    transactionQueue.push({ sql, args });
    return;
  }
  remoteQueue = remoteQueue
    .then(() => remoteClient.execute({ sql, args }))
    .catch((error) => {
      console.error('Turso mirror error:', error.message);
    });
}

function flushRemoteRuns(items) {
  for (const item of items) queueRemoteRun(item.sql, item.args);
}

function enableRemoteMirror() {
  db.prepare = (sql) => {
    const statement = originalPrepare(sql);
    return {
      get: (...args) => statement.get(...args),
      all: (...args) => statement.all(...args),
      run: (...args) => {
        const result = statement.run(...args);
        queueRemoteRun(sql, args);
        return result;
      },
    };
  };
  db.transaction = (fn) => {
    const transaction = originalTransaction((...args) => {
      transactionDepth += 1;
      const previousQueue = transactionQueue;
      transactionQueue = [];
      try {
        const result = fn(...args);
        const committedQueue = transactionQueue;
        transactionQueue = previousQueue;
        transactionDepth -= 1;
        flushRemoteRuns(committedQueue);
        return result;
      } catch (error) {
        transactionQueue = previousQueue;
        transactionDepth -= 1;
        throw error;
      }
    });
    return (...args) => transaction(...args);
  };
}

async function initPersistentStore() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return { enabled: false, message: 'Turso chưa được cấu hình.' };
  if (!createClient) throw new Error('Thiếu dependency @libsql/client. Hãy chạy npm install sau khi cập nhật package.json.');
  remoteClient = createClient({ url, authToken });
  await migrateRemote();
  const localCount = localTableCount();
  const remoteCount = await remoteTableCount();
  if (localCount === 0 && remoteCount > 0) {
    await restoreRemoteToLocal();
  } else if (localCount > 0 && remoteCount === 0) {
    await backupLocalToRemote();
  }
  remoteReady = true;
  enableRemoteMirror();
  return { enabled: true, localCount: localTableCount(), remoteCount: await remoteTableCount() };
}

function setting(key, fallback = '') {
  const envKey = key.toUpperCase();
  if (process.env[envKey] !== undefined) return process.env[envKey];
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(key, value);
}

migrate();

module.exports = { db, migrate, setting, setSetting, dbPath, initPersistentStore };
