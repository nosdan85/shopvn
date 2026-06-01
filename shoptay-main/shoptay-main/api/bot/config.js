const DISCORD_API_BASE = 'https://discord.com/api/v10';
const SNOWFLAKE_PATTERN = /^\d{16,22}$/;
const BOT_SELF_CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;
const REQUEST_TIMEOUT_CREATE_CHANNEL_MS = 8000;
const TICKET_CREATE_MIN_GAP_MS = (() => {
  const n = Number(process.env.DISCORD_TICKET_CREATE_MIN_GAP_MS);
  if (!Number.isFinite(n) || n < 500) return 3500;
  return Math.floor(n);
})();
const TICKET_CREATE_QUEUE_MAX_COOLDOWN_MS = 2 * 60 * 1000;
const TICKET_CREATE_RETRY_MAX_RETRIES = 2;
const TICKET_CREATE_RETRY_BASE_DELAY_MS = 900;
const TICKET_CREATE_RETRY_MAX_DELAY_MS = 5000;
const MAX_VOUCH_IMAGES_PER_MESSAGE = 10;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 15000;
const MAX_PROOF_IMAGE_BYTES = (() => {
  const n = Number(process.env.MAX_PROOF_IMAGE_BYTES);
  if (!Number.isFinite(n) || n <= 0) return 8 * 1024 * 1024;
  return Math.max(256 * 1024, Math.min(25 * 1024 * 1024, Math.floor(n)));
})();
const ADDALL_CONCURRENCY = (() => {
  const n = Number(process.env.DISCORD_ADDALL_CONCURRENCY);
  if (!Number.isFinite(n)) return 4;
  return Math.max(1, Math.min(12, Math.floor(n)));
})();
const ADDALL_PROGRESS_INTERVAL = (() => {
  const n = Number(process.env.DISCORD_ADDALL_PROGRESS_INTERVAL);
  if (!Number.isFinite(n)) return 100;
  return Math.max(25, Math.min(1000, Math.floor(n)));
})();
const ADDALL_MAX_JOIN_RETRIES = (() => {
  const n = Number(process.env.DISCORD_ADDALL_MAX_JOIN_RETRIES);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(8, Math.floor(n)));
})();
const CLOSE_COMMANDS = new Set(['!close', '/close', '!dong', '/dong']);
const DONE_COMMANDS = new Set(['!done', '/done']);
const CONFIRM_COMMANDS = new Set(['!confirm', '/confirm']);
const READD_ALL_COMMANDS = new Set(['!addall', '/addall', '!readdall', '/readdall']);
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.svg'];

const PERM_VIEW_CHANNEL = 1n << 10n;
const PERM_SEND_MESSAGES = 1n << 11n;
const PERM_EMBED_LINKS = 1n << 14n;
const PERM_ATTACH_FILES = 1n << 15n;
const PERM_READ_MESSAGE_HISTORY = 1n << 16n;
const PERM_ADD_REACTIONS = 1n << 6n;
const PERM_VIEW_CHANNEL_ONLY = String(PERM_VIEW_CHANNEL);
const PERM_TICKET_CHAT = String(
  PERM_VIEW_CHANNEL |
  PERM_SEND_MESSAGES |
  PERM_EMBED_LINKS |
  PERM_ATTACH_FILES |
  PERM_READ_MESSAGE_HISTORY |
  PERM_ADD_REACTIONS
);

class DiscordBotError extends Error {
  constructor(message, { status = 500, code = 'DISCORD_BOT_ERROR', data = null, retryAfterSeconds = 0 } = {}) {
    super(message);
    this.name = 'DiscordBotError';
    this.status = status;
    this.code = code;
    this.data = data;
    this.retryAfterSeconds = Number.isFinite(Number(retryAfterSeconds))
      ? Math.max(0, Math.ceil(Number(retryAfterSeconds)))
      : 0;
  }
}

const normalizeEnvValue = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).trim();
  }
  return text;
};

const getBotToken = () => normalizeEnvValue(process.env.DISCORD_BOT_TOKEN);
const getGuildId = () => normalizeEnvValue(process.env.DISCORD_GUILD_ID);
const getOwnerRoleId = () => normalizeEnvValue(process.env.DISCORD_OWNER_ROLE_ID);
const getTicketCategoryId = () => normalizeEnvValue(process.env.DISCORD_TICKET_CATEGORY_ID);
const getOwnerId = () => normalizeEnvValue(process.env.DISCORD_OWNER_ID);
const getVouchChannelId = () => normalizeEnvValue(process.env.DISCORD_VOUCH_CHANNEL_ID);
const getWalletNotifyChannelId = () => (
  normalizeEnvValue(process.env.DISCORD_WALLET_NOTIFY_CHANNEL_ID) ||
  normalizeEnvValue(process.env.DISCORD_LINK_CHANNEL_ID) ||
  normalizeEnvValue(process.env.DISCORD_VOUCH_CHANNEL_ID)
);
const getOauthClientId = () => normalizeEnvValue(process.env.DISCORD_CLIENT_ID);
const getOauthClientSecret = () => normalizeEnvValue(process.env.DISCORD_CLIENT_SECRET);
const getPayPalPaymentEmail = () => normalizeEnvValue(process.env.PAYPAL_PAYMENT_EMAIL) || 'nguyenquanghuy111106@gmail.com';
const getCashAppHandle = () => normalizeEnvValue(process.env.CASHAPP_HANDLE) || '$yoko276';
const getLtcPayAddress = () => normalizeEnvValue(process.env.LTC_PAY_ADDRESS) || 'ltc1ququ7e6ryccpnu7jgy0l4vukgc3mventxyulyge';

module.exports = {
  DISCORD_API_BASE,
  SNOWFLAKE_PATTERN,
  BOT_SELF_CACHE_TTL_MS,
  REQUEST_TIMEOUT_MS,
  REQUEST_TIMEOUT_CREATE_CHANNEL_MS,
  TICKET_CREATE_MIN_GAP_MS,
  TICKET_CREATE_QUEUE_MAX_COOLDOWN_MS,
  TICKET_CREATE_RETRY_MAX_RETRIES,
  TICKET_CREATE_RETRY_BASE_DELAY_MS,
  TICKET_CREATE_RETRY_MAX_DELAY_MS,
  MAX_VOUCH_IMAGES_PER_MESSAGE,
  IMAGE_DOWNLOAD_TIMEOUT_MS,
  MAX_PROOF_IMAGE_BYTES,
  ADDALL_CONCURRENCY,
  ADDALL_PROGRESS_INTERVAL,
  ADDALL_MAX_JOIN_RETRIES,
  CLOSE_COMMANDS,
  DONE_COMMANDS,
  CONFIRM_COMMANDS,
  READD_ALL_COMMANDS,
  IMAGE_EXTENSIONS,
  PERM_VIEW_CHANNEL,
  PERM_SEND_MESSAGES,
  PERM_EMBED_LINKS,
  PERM_ATTACH_FILES,
  PERM_READ_MESSAGE_HISTORY,
  PERM_ADD_REACTIONS,
  PERM_VIEW_CHANNEL_ONLY,
  PERM_TICKET_CHAT,
  DiscordBotError,
  normalizeEnvValue,
  getBotToken,
  getGuildId,
  getOwnerRoleId,
  getTicketCategoryId,
  getOwnerId,
  getVouchChannelId,
  getWalletNotifyChannelId,
  getOauthClientId,
  getOauthClientSecret,
  getPayPalPaymentEmail,
  getCashAppHandle,
  getLtcPayAddress,
};
