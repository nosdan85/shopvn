require('dotenv').config();
const crypto = require('crypto');

const DEFAULT_INTERVAL_MS = 10000;

function parseBoolean(value) {
  return String(value || '').toLowerCase() === 'true';
}

function apiBaseUrl() {
  return String(process.env.API_BASE_URL || process.env.PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
}

function workerSecret() {
  return process.env.CARD_WORKER_SECRET || process.env.CARD_WEBHOOK_SECRET || process.env.GACHTHEFAST_WEBHOOK_SECRET || '';
}

function jobsUrl() {
  const base = apiBaseUrl();
  const secret = workerSecret();
  const limit = Math.min(20, Math.max(1, Number(process.env.CARD_WORKER_LIMIT || 5)));
  if (!base || !secret) return '';
  return `${base}/api/webhooks/card-worker/jobs?secret=${encodeURIComponent(secret)}&limit=${limit}`;
}

function resultUrl() {
  const base = apiBaseUrl();
  const secret = workerSecret();
  if (!base || !secret) return '';
  return `${base}/api/webhooks/card-worker/result?secret=${encodeURIComponent(secret)}`;
}

function debugEnabled() {
  return parseBoolean(process.env.CARD_WORKER_DEBUG);
}

function cardProviderCode(method) {
  return {
    viettel_card: 'VIETTEL',
    mobifone_card: 'MOBIFONE',
    vinaphone_card: 'VINAPHONE',
  }[method] || String(method || '').replace(/_card$/i, '').toUpperCase();
}

function gachTheFastSign({ partnerKey, cardCode, serial }) {
  return crypto.createHash('md5').update(`${partnerKey}${cardCode}${serial}`).digest('hex');
}

function cardWebhookValue(payload, keys) {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null && String(payload[key]).trim() !== '') return payload[key];
  }
  return '';
}

function normalizeCardStatus(value) {
  const text = String(value || '').trim().toLowerCase();
  if (['1', 'success', 'successful', 'done', 'completed', 'approved', 'thanhcong', 'thanh_cong', 'đúng', 'dung', 'the_dung', 'card_correct'].includes(text)) return 'success';
  if (['2', '99', 'pending', 'processing', 'wait', 'waiting', 'cho_xu_ly', 'chờ xử lý'].includes(text)) return 'pending';
  if (['3', '4', '30', 'fail', 'failed', 'error', 'cancel', 'cancelled', 'rejected', 'sai', 'thatbai', 'that_bai', 'the_sai', 'card_wrong'].includes(text)) return 'failed';
  return text || 'pending';
}

function normalizeGachTheFastResponse(data) {
  const status = normalizeCardStatus(cardWebhookValue(data, ['status', 'card_status', 'result', 'state', 'code']));
  const message = String(cardWebhookValue(data, ['message', 'msg', 'note', 'reason', 'description']) || JSON.stringify(data).slice(0, 250));
  const providerTransactionId = String(cardWebhookValue(data, ['trans_id', 'transId', 'transaction_id', 'transactionId', 'request_id', 'requestId', 'id']) || '');
  const amount = cardWebhookValue(data, ['real_amount', 'receive_amount', 'value_receive', 'amount_receive', 'amount', 'value', 'declared_amount']);
  return { status, message, providerTransactionId, amount };
}

async function submitGachTheFastCard(job) {
  const apiUrl = String(process.env.GACHTHEFAST_API_URL || '').trim();
  const partnerId = String(process.env.GACHTHEFAST_PARTNER_ID || '').trim();
  const partnerKey = String(process.env.GACHTHEFAST_PARTNER_KEY || '').trim();
  const submitMethod = String(process.env.GACHTHEFAST_SUBMIT_METHOD || 'GET').trim().toUpperCase();
  if (!apiUrl || !partnerId || !partnerKey) throw new Error('Thiếu GACHTHEFAST_API_URL, GACHTHEFAST_PARTNER_ID hoặc GACHTHEFAST_PARTNER_KEY.');
  const params = new URLSearchParams({
    partner_id: partnerId,
    telco: cardProviderCode(job.method || job.provider),
    code: String(job.card_code || ''),
    serial: String(job.serial || ''),
    amount: String(job.declared_amount || job.amount || ''),
    request_id: String(job.transaction_code || ''),
    command: 'charging',
    sign: gachTheFastSign({ partnerKey, cardCode: String(job.card_code || ''), serial: String(job.serial || '') }),
  });
  const response = submitMethod === 'POST'
    ? await fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: params.toString(),
    })
    : await fetch(`${apiUrl}${apiUrl.includes('?') ? '&' : '?'}${params.toString()}`, { headers: { accept: 'application/json' } });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : { message: await response.text() };
  if (!response.ok) throw new Error(data?.message || `GachTheFast API lỗi ${response.status}`);
  return { raw: data, ...normalizeGachTheFastResponse(data) };
}

async function fetchJobs() {
  const url = jobsUrl();
  if (!url) throw new Error('Thiếu API_BASE_URL hoặc CARD_WORKER_SECRET.');
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `Không lấy được job thẻ ${response.status}`);
  return Array.isArray(data.jobs) ? data.jobs : [];
}

async function reportResult(payload) {
  const url = resultUrl();
  if (!url) throw new Error('Thiếu result URL cho card worker.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `Không báo được kết quả card worker ${response.status}`);
  return data;
}

async function pollCardOnce() {
  const jobs = await fetchJobs();
  const results = [];
  if (debugEnabled()) console.log(`[debug] card_jobs=${jobs.length}`);
  for (const job of jobs) {
    try {
      const cardResult = await submitGachTheFastCard(job);
      const report = await reportResult({
        transaction_code: job.transaction_code,
        status: cardResult.status,
        message: cardResult.message,
        provider_transaction_id: cardResult.providerTransactionId,
        amount: cardResult.amount || job.amount,
      });
      results.push({ transaction_code: job.transaction_code, ok: true, status: cardResult.status, report });
      if (debugEnabled()) console.log(`[debug] card_job=${job.transaction_code} status=${cardResult.status} message="${cardResult.message || ''}"`);
    } catch (error) {
      await reportResult({ transaction_code: job.transaction_code, status: 'retry', message: error.message }).catch((reportError) => {
        console.error(`Không báo được lỗi tạm thời cho ${job.transaction_code}:`, reportError.message);
      });
      results.push({ transaction_code: job.transaction_code, ok: false, error: error.message });
      if (debugEnabled()) console.log(`[debug] card_job=${job.transaction_code} error="${error.message}"`);
    }
  }
  return {
    ok: true,
    worker: true,
    ran_at: new Date().toISOString(),
    total: jobs.length,
    processed: results.length,
    success: results.filter((item) => item.status === 'success').length,
    failed: results.filter((item) => item.status === 'failed' || item.ok === false).length,
    pending: results.filter((item) => item.status === 'pending').length,
    results: results.slice(0, 20),
  };
}

async function loop() {
  const intervalMs = Math.max(5000, Number(process.env.CARD_WORKER_INTERVAL_MS || DEFAULT_INTERVAL_MS) || DEFAULT_INTERVAL_MS);
  console.log(`Card worker started. Interval: ${intervalMs}ms`);
  console.log(`Card worker API: ${apiBaseUrl() || '(missing)'}`);
  while (true) {
    const startedAt = new Date().toISOString();
    try {
      const report = await pollCardOnce();
      console.log(`[${startedAt}] jobs=${report.total} processed=${report.processed} success=${report.success} pending=${report.pending} failed=${report.failed}`);
    } catch (error) {
      console.error(`[${startedAt}] Card worker error:`, error.message);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

if (!parseBoolean(process.env.CARD_WORKER_ENABLED)) {
  console.log('CARD_WORKER_ENABLED không phải true, worker không chạy.');
  process.exit(0);
}

if (process.argv.includes('--once')) {
  pollCardOnce()
    .then((report) => {
      console.log(`Card worker once: jobs=${report.total} processed=${report.processed} success=${report.success} pending=${report.pending} failed=${report.failed}`);
      if (report.results.length) console.log(JSON.stringify(report.results, null, 2));
    })
    .catch((error) => {
      console.error('Card worker once error:', error.message);
      process.exitCode = 1;
    });
} else {
  loop().catch((error) => {
    console.error('Card worker stopped:', error);
    process.exit(1);
  });
}
