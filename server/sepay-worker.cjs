require('dotenv').config();
const crypto = require('crypto');

const DEFAULT_INTERVAL_MS = 10000;

function parseBoolean(value) {
  return String(value || '').toLowerCase() === 'true';
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.searchParams.has('secret')) url.searchParams.set('secret', '***');
    return url.toString();
  } catch (_error) {
    return String(value || '').replace(/secret=[^&]+/i, 'secret=***');
  }
}

function debugEnabled() {
  return parseBoolean(process.env.SEPAY_BOT_DEBUG);
}

function transactionListFromResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.transactions)) return data.transactions;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function webhookUrl() {
  if (process.env.SEPAY_WEBHOOK_URL) return process.env.SEPAY_WEBHOOK_URL;
  const apiBase = String(process.env.API_BASE_URL || process.env.PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
  const secret = process.env.SEPAY_WEBHOOK_SECRET;
  if (!apiBase || !secret) return '';
  return `${apiBase}/api/webhooks/deposits?secret=${encodeURIComponent(secret)}`;
}

function reportUrl() {
  if (process.env.SEPAY_BOT_REPORT_URL) return process.env.SEPAY_BOT_REPORT_URL;
  const apiBase = String(process.env.API_BASE_URL || process.env.PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
  const secret = process.env.SEPAY_WEBHOOK_SECRET;
  if (!apiBase || !secret) return '';
  return `${apiBase}/api/webhooks/sepay-bot/report?secret=${encodeURIComponent(secret)}`;
}

function signedJsonHeaders(payload) {
  const secret = String(process.env.SEPAY_WEBHOOK_HMAC_SECRET || '').trim();
  if (!secret) return { 'content-type': 'application/json' };
  const timestamp = String(Date.now());
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return { 'content-type': 'application/json', 'x-webhook-timestamp': timestamp, 'x-webhook-signature': `sha256=${signature}` };
}

function pendingCodesUrl() {
  const apiBase = String(process.env.API_BASE_URL || process.env.PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
  const secret = process.env.SEPAY_WEBHOOK_SECRET;
  if (!apiBase || !secret) return '';
  return `${apiBase}/api/webhooks/deposits/pending-codes?secret=${encodeURIComponent(secret)}`;
}

function normalizePaymentText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function transactionContent(raw = {}) {
  return String(raw.content || raw.description || raw.transferContent || raw.transfer_content || raw.transaction_content || raw.transactionContent || raw.note || raw.memo || '');
}

async function pendingDepositCodes() {
  const url = pendingCodesUrl();
  if (!url) return [];
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `Không lấy được mã nạp pending ${response.status}`);
  return Array.isArray(data.deposits) ? data.deposits : [];
}

async function sendReport(report) {
  const url = reportUrl();
  if (!url) return;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: signedJsonHeaders(JSON.stringify(report)),
      body: JSON.stringify(report),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error(`Không gửi được report về web: HTTP ${response.status} ${data?.message || ''}`.trim());
    }
  } catch (error) {
    console.error('Không gửi được report về web:', error.message);
  }
}

async function pollSepayOnce() {
  const apiUrl = process.env.SEPAY_BOT_API_URL;
  const apiKey = process.env.SEPAY_BOT_API_KEY;
  const targetWebhook = webhookUrl();
  if (!apiUrl || !apiKey) throw new Error('Thiếu SEPAY_BOT_API_URL hoặc SEPAY_BOT_API_KEY.');
  if (!targetWebhook) throw new Error('Thiếu SEPAY_WEBHOOK_URL hoặc API_BASE_URL + SEPAY_WEBHOOK_SECRET.');
  const pendingDeposits = await pendingDepositCodes();
  const pendingCodes = pendingDeposits.map((deposit) => normalizePaymentText(deposit.transfer_content || deposit.transaction_code)).filter(Boolean);
  if (debugEnabled()) {
    console.log(`[debug] API_BASE_URL=${String(process.env.API_BASE_URL || process.env.PUBLIC_API_BASE_URL || '').replace(/\/+$/, '')}`);
    console.log(`[debug] pendingCodesUrl=${safeUrl(pendingCodesUrl())}`);
    console.log(`[debug] webhookUrl=${safeUrl(targetWebhook)}`);
    console.log(`[debug] pending_deposits=${pendingDeposits.length}`);
    console.log(`[debug] pending_codes_sample=${pendingCodes.slice(0, 5).join(', ') || '-'}`);
  }

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
  if (debugEnabled()) {
    console.log(`[debug] sepay_transactions=${transactions.length}`);
  }
  const matchedTransactions = transactions.filter((transaction) => {
    const content = normalizePaymentText(transactionContent(transaction));
    return pendingCodes.some((code) => content.includes(code));
  });
  if (debugEnabled()) {
    console.log(`[debug] matched_transactions=${matchedTransactions.length}`);
    for (const transaction of matchedTransactions.slice(0, 5)) {
      console.log(`[debug] matched content="${transactionContent(transaction).slice(0, 160)}" amount="${transaction.amount || transaction.paid_amount || transaction.transferAmount || transaction.transfer_amount || transaction.money || ''}"`);
    }
  }
  const deliveries = [];
  for (const transaction of matchedTransactions) {
    try {
      const webhookResponse = await fetch(targetWebhook, {
        method: 'POST',
        headers: signedJsonHeaders(JSON.stringify(transaction)),
        body: JSON.stringify(transaction),
      });
      const result = await webhookResponse.json().catch(() => ({}));
      deliveries.push({ ok: webhookResponse.ok, status: webhookResponse.status, result });
      if (debugEnabled()) {
        console.log(`[debug] webhook_delivery status=${webhookResponse.status} success=${result?.success} ignored=${result?.ignored} message="${result?.message || ''}"`);
      }
    } catch (error) {
      deliveries.push({ ok: false, error: error.message });
      if (debugEnabled()) {
        console.log(`[debug] webhook_delivery error="${error.message}"`);
      }
    }
  }

  return {
    ok: true,
    worker: true,
    ran_at: new Date().toISOString(),
    total: transactions.length,
    pending_codes: pendingCodes.length,
    matched: matchedTransactions.length,
    delivered: deliveries.filter((item) => item.ok).length,
    failed: deliveries.filter((item) => !item.ok).length,
    credited: deliveries.filter((item) => item.result?.success === true).length,
    ignored: deliveries.filter((item) => item.result?.ignored === true).length,
    deliveries: deliveries.slice(0, 20),
  };
}

async function loop() {
  const intervalMs = Math.max(5000, Number(process.env.SEPAY_BOT_INTERVAL_MS || DEFAULT_INTERVAL_MS) || DEFAULT_INTERVAL_MS);
  console.log(`SePay worker started. Interval: ${intervalMs}ms`);
  console.log(`SePay worker API: ${String(process.env.API_BASE_URL || process.env.PUBLIC_API_BASE_URL || '').replace(/\/+$/, '') || '(missing)'}`);
  while (true) {
    const startedAt = new Date().toISOString();
    try {
      const report = await pollSepayOnce();
      console.log(`[${startedAt}] total=${report.total} delivered=${report.delivered} credited=${report.credited} ignored=${report.ignored} failed=${report.failed}`);
      await sendReport(report);
    } catch (error) {
      console.error(`[${startedAt}] SePay worker error:`, error.message);
      await sendReport({ ok: false, worker: true, ran_at: startedAt, error: error.message });
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

if (!parseBoolean(process.env.SEPAY_BOT_ENABLED)) {
  console.log('SEPAY_BOT_ENABLED không phải true, worker không chạy.');
  process.exit(0);
}

if (process.argv.includes('--once')) {
  pollSepayOnce()
    .then(async (report) => {
      console.log(`SePay worker once: total=${report.total} pending=${report.pending_codes} matched=${report.matched} delivered=${report.delivered} credited=${report.credited} ignored=${report.ignored} failed=${report.failed}`);
      if (report.deliveries.length) console.log(JSON.stringify(report.deliveries, null, 2));
      await sendReport(report);
    })
    .catch((error) => {
      console.error('SePay worker once error:', error.message);
      process.exitCode = 1;
    });
} else {
loop().catch((error) => {
  console.error('SePay worker stopped:', error);
  process.exit(1);
});
}
