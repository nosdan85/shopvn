const { normalizeEnvValue } = require('../config');
const { formatPurchasedUnitsLabel } = require('../../utils/itemQuantityDisplay');
const { truncateText } = require('./validation');

const sanitizeChannelName = (raw, fallbackPrefix = 'ticket') => {
  const text = String(raw || '').trim().toLowerCase();
  const compact = text
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const safe = compact || `${fallbackPrefix}-${Date.now()}`;
  return safe.slice(0, 90);
};

const formatOrderItems = (items) => {
  const lines = Array.isArray(items)
    ? items.map((item) => {
        const name = String(item?.name || 'Item').trim();
        return `${name} (${formatPurchasedUnitsLabel(item)})`;
      })
    : [];
  const joined = lines.join('\n') || '-';
  return truncateText(joined, 1000);
};

const formatOrderItemsWithPrice = (items) => {
  const lines = Array.isArray(items)
    ? items.map((item) => {
        const quantity = Math.max(1, Number(item?.quantity) || 1);
        const name = String(item?.name || 'Item').trim();
        const deliveredLabel = formatPurchasedUnitsLabel(item);
        const lineTotal = (Math.max(0, Number(item?.price) || 0) * quantity).toFixed(2);
        return `${name} (${deliveredLabel}) - $${lineTotal}`;
      })
    : [];
  const joined = lines.join('\n') || '-';
  return truncateText(joined, 1000);
};

const formatOrderItemNamesForNote = (items) => {
  const names = Array.isArray(items)
    ? items.map((item) => String(item?.name || '').trim()).filter(Boolean)
    : [];
  return truncateText(names.join(', ') || 'Item', 300);
};

const formatPayPalMemoForOrder = (order) => {
  const existingMemo = normalizeEnvValue(order?.memoExpected);
  if (existingMemo) return truncateText(existingMemo, 255);
  const orderCode = String(order?.orderId || '').trim().toUpperCase();
  return truncateText(`NOSMARKET ${orderCode} - ${formatOrderItemNamesForNote(order?.items)}`, 255);
};

const getOrderSequence = (order) => {
  const orderId = String(order?.orderId || '').trim();
  const match = orderId.match(/(\d+)$/);
  if (!match) return Date.now();
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) return Date.now();
  return Math.floor(parsed);
};

module.exports = {
  sanitizeChannelName,
  formatOrderItems,
  formatOrderItemsWithPrice,
  formatOrderItemNamesForNote,
  formatPayPalMemoForOrder,
  getOrderSequence,
};
