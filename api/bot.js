/**
 * Discord Bot Integration
 * Handles Discord client setup and basic bot functionality
 * Note: Main bot code is in /bot folder
 */

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');
const axios = require('axios');
const crypto = require('crypto');
const { discordRequest } = require('./utils/discordApi');
const Order = require('./models/Order');
const User = require('./models/User');
const Proof = require('./models/Proof');
const ProofImage = require('./models/ProofImage');
const { encryptSecret, decryptSecret } = require('./utils/tokenCrypto');
const { formatPurchasedUnitsLabel } = require('./utils/itemQuantityDisplay');
const { bitmapOffsetFromHash, bitmapCheckAndSet } = require('./cache/redis');
const DeviceFingerprint = require('./models/DeviceFingerprint');
const Referral = require('./models/Referral');
const GeneratedCoupon = require('./models/GeneratedCoupon');
const { hashFingerprint, hasSuspiciousDeviceFlag, shouldGrantFirstOrderReward } = require('./utils/referralRewards');
const { buildGeneratedCouponCode } = require('./utils/luckyWheel');
const { buildTicketOrderLookupQuery } = require('./utils/ticketOrderLookup');
const { buildDiscordVouchContent, resolveVouchChannelId } = require('./utils/vouchContent');

const { log } = require('./utils/loggingService');

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
const DONE_COMMANDS = new Set(['!done', '/done']);
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
    PERM_VIEW_CHANNEL
    | PERM_SEND_MESSAGES
    | PERM_EMBED_LINKS
    | PERM_ATTACH_FILES
    | PERM_READ_MESSAGE_HISTORY
    | PERM_ADD_REACTIONS
);

let cachedBotSelfId = '';
let cachedBotSelfAt = 0;
let ticketCreateChain = Promise.resolve();
let lastTicketCreateAt = 0;
let ticketCreateBlockedUntilAt = 0;

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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const normalizeEnvValue = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    if (
        (text.startsWith('"') && text.endsWith('"'))
        || (text.startsWith("'") && text.endsWith("'"))
    ) {
        return text.slice(1, -1).trim();
    }
    return text;
};

const isSnowflake = (value) => SNOWFLAKE_PATTERN.test(String(value || '').trim());
const getBotToken = () => normalizeEnvValue(process.env.DISCORD_BOT_TOKEN);
const getGuildId = () => normalizeEnvValue(process.env.DISCORD_GUILD_ID);
const getOwnerRoleId = () => normalizeEnvValue(process.env.DISCORD_OWNER_ROLE_ID);
const getTicketCategoryId = () => normalizeEnvValue(process.env.DISCORD_TICKET_CATEGORY_ID) || '1467122339194863759';
const getOwnerId = () => normalizeEnvValue(process.env.DISCORD_OWNER_ID);
const getVouchChannelId = () => resolveVouchChannelId(normalizeEnvValue(process.env.DISCORD_VOUCH_CHANNEL_ID));
const getWalletNotifyChannelId = () => (
    normalizeEnvValue(process.env.DISCORD_WALLET_NOTIFY_CHANNEL_ID)
    || normalizeEnvValue(process.env.DISCORD_LINK_CHANNEL_ID)
    || normalizeEnvValue(process.env.DISCORD_VOUCH_CHANNEL_ID)
);
const getOauthClientId = () => normalizeEnvValue(process.env.DISCORD_CLIENT_ID);
const getOauthClientSecret = () => normalizeEnvValue(process.env.DISCORD_CLIENT_SECRET);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeRetryAfterSeconds = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    if (n > 1000) return Math.ceil(n / 1000);
    return Math.ceil(n);
};

const runTicketCreateQueued = async (runner) => {
    const run = async () => {
        const elapsed = Date.now() - lastTicketCreateAt;
        const gapWaitMs = Math.max(0, TICKET_CREATE_MIN_GAP_MS - elapsed);
        const cooldownWaitMs = Math.max(0, ticketCreateBlockedUntilAt - Date.now());
        const waitMs = Math.max(gapWaitMs, cooldownWaitMs);
        if (waitMs > 0) {
            await sleep(waitMs);
        }
        try {
            return await runner();
        } finally {
            lastTicketCreateAt = Date.now();
        }
    };

    const queued = ticketCreateChain.then(run, run);
    ticketCreateChain = queued.catch(() => {});
    return queued;
};

const setTicketCreateCooldownSeconds = (seconds) => {
    const n = Number(seconds);
    if (!Number.isFinite(n) || n <= 0) return 0;

    const clampedSeconds = Math.min(
        Math.ceil(TICKET_CREATE_QUEUE_MAX_COOLDOWN_MS / 1000),
        Math.max(1, Math.ceil(n))
    );
    ticketCreateBlockedUntilAt = Math.max(ticketCreateBlockedUntilAt, Date.now() + (clampedSeconds * 1000));
    return clampedSeconds;
};

const truncateText = (value, max = 300) => String(value || '').slice(0, Math.max(0, Number(max) || 0));

const formatDiscordApiMessage = (data) => {
    if (!data) return '';
    if (typeof data === 'string') return truncateText(data, 300);
    return truncateText(
        data.message || data.error || data.error_description || JSON.stringify(data),
        300
    );
};
const isTemporaryCloudflareBlock = (status, data) => {
    if (status !== 403) return false;
    const text = typeof data === 'string' ? data.toLowerCase() : JSON.stringify(data || {}).toLowerCase();
    return (
        text.includes('cloudflare')
        || text.includes('1015')
        || text.includes('temporarily blocked')
        || text.includes('temporarily unavailable')
    );
};

const sanitizeChannelName = (raw, fallbackPrefix = 'ticket') => {
    const text = String(raw || '').trim().toLowerCase();
    const compact = text
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    const safe = compact || `${fallbackPrefix}-${Date.now()}`;
    return safe.slice(0, 90);
};

const formatVndAmount = (amount) => {
    const num = Number(amount || 0);
    if (!Number.isFinite(num) || num < 0) return '0 VND';
    return num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
};

const formatOrderItemsVnd = (items) => {
    const lines = Array.isArray(items)
        ? items.map((item) => {
            const name = String(item?.name || 'San pham').trim();
            const quantity = Math.max(1, Number(item?.quantity) || 1);
            const deliveredLabel = formatPurchasedUnitsLabel(item);
            const lineTotal = Math.max(0, Number(item?.lineTotalVnd || item?.priceVnd || 0) * quantity);
            return `${name} (${deliveredLabel}) - ${formatVndAmount(lineTotal)}`;
        })
        : [];
    const joined = lines.join('\n') || '-';
    return truncateText(joined, 1000);
};

const formatOrderItemNamesForNote = (items) => {
    const names = Array.isArray(items)
        ? items
            .map((item) => String(item?.name || '').trim())
            .filter(Boolean)
        : [];
    return truncateText(names.join(', ') || 'San pham', 300);
};

const getOrderSequence = (order) => {
    const orderId = String(order?.orderId || '').trim();
    const match = orderId.match(/(\d+)$/);
    if (!match) return Date.now();
    const parsed = Number(match[1]);
    if (!Number.isFinite(parsed) || parsed <= 0) return Date.now();
    return Math.floor(parsed);
};

const assertDiscordConfig = () => {
    const token = getBotToken();
    const guildId = getGuildId();
    if (!token) {
        throw new DiscordBotError('DISCORD_BOT_TOKEN is missing', {
            status: 500,
            code: 'DISCORD_BOT_TOKEN_MISSING'
        });
    }
    if (!isSnowflake(guildId)) {
        throw new DiscordBotError('DISCORD_GUILD_ID is missing or invalid', {
            status: 500,
            code: 'DISCORD_GUILD_ID_INVALID'
        });
    }
};

const toDiscordBotError = (error, { defaultMessage = 'Discord API request failed', defaultCode = 'DISCORD_API_ERROR' } = {}) => {
    if (error instanceof DiscordBotError) return error;

    const statusRaw = Number(error?.response?.status);
    const status = Number.isFinite(statusRaw) && statusRaw > 0 ? statusRaw : 500;
    const data = error?.response?.data || null;
    const apiMessage = formatDiscordApiMessage(data);
    const retryAfterSeconds = Math.max(
        normalizeRetryAfterSeconds(error?.response?.headers?.['retry-after']),
        normalizeRetryAfterSeconds(data?.retry_after),
        normalizeRetryAfterSeconds(data?.retryAfterSeconds)
    );

    if (status === 401) {
        return new DiscordBotError('DISCORD_BOT_TOKEN is invalid', {
            status: 500,
            code: 'DISCORD_BOT_UNAUTHORIZED',
            data
        });
    }
    if (isTemporaryCloudflareBlock(status, data)) {
        return new DiscordBotError('Discord is temporarily rate limited. Please retry shortly.', {
            status: 429,
            code: 'DISCORD_RATE_LIMITED',
            data,
            retryAfterSeconds: Math.max(retryAfterSeconds, 30)
        });
    }
    if (status === 403) {
        return new DiscordBotError(
            apiMessage || 'Bot lacks permission in this Discord server (check roles/permissions).',
            { status: 500, code: 'DISCORD_BOT_FORBIDDEN', data }
        );
    }
    if (status === 404) {
        return new DiscordBotError(apiMessage || 'Discord resource not found', {
            status: 404,
            code: 'DISCORD_NOT_FOUND',
            data
        });
    }
    if (status === 429) {
        console.warn('Discord rate limit hit', {
            bucket: error?.response?.headers?.['x-ratelimit-bucket'] || '',
            remaining: error?.response?.headers?.['x-ratelimit-remaining'] || '',
            resetAfter: error?.response?.headers?.['x-ratelimit-reset-after'] || '',
            scope: error?.response?.headers?.['x-ratelimit-scope'] || '',
            global: error?.response?.headers?.['x-ratelimit-global'] || ''
        });
        return new DiscordBotError('Discord is temporarily rate limited. Please retry shortly.', {
            status: 429,
            code: 'DISCORD_RATE_LIMITED',
            data,
            retryAfterSeconds
        });
    }
    if (status >= 500 && status < 600) {
        return new DiscordBotError('Discord API is temporarily unavailable. Please retry shortly.', {
            status: 503,
            code: 'DISCORD_API_UNAVAILABLE',
            data
        });
    }
    if (status >= 400 && status < 500) {
        return new DiscordBotError(apiMessage || defaultMessage, {
            status,
            code: defaultCode,
            data
        });
    }

    return new DiscordBotError(apiMessage || error?.message || defaultMessage, {
        status: 503,
        code: defaultCode,
        data
    });
};

const botRequest = async ({
    method,
    path,
    data,
    timeout = REQUEST_TIMEOUT_MS,
    retry = true,
    retryOptions = {},
    defaultCode
}) => {
    assertDiscordConfig();
    const token = getBotToken();
    try {
        return await discordRequest({
            method,
            url: `${DISCORD_API_BASE}${path}`,
            data,
            timeout,
            headers: {
                Authorization: `Bot ${token}`,
                'Content-Type': 'application/json'
            }
        }, 0, retry
            ? {
                maxRetries: Number.isInteger(retryOptions.maxRetries) ? retryOptions.maxRetries : 2,
                baseDelayMs: Number.isFinite(retryOptions.baseDelayMs) ? retryOptions.baseDelayMs : 800,
                maxDelayMs: Number.isFinite(retryOptions.maxDelayMs) ? retryOptions.maxDelayMs : 10000
            }
            : { noRetry: true }
        );
    } catch (error) {
        throw toDiscordBotError(error, { defaultCode });
    }
};

const getBotSelfId = async () => {
    if (isSnowflake(client?.user?.id)) return client.user.id;
    if (cachedBotSelfId && (Date.now() - cachedBotSelfAt) < BOT_SELF_CACHE_TTL_MS) return cachedBotSelfId;

    const res = await botRequest({
        method: 'get',
        path: '/users/@me',
        timeout: 7000,
        retry: false,
        defaultCode: 'DISCORD_BOT_SELF_LOOKUP_FAILED'
    });
    const selfId = String(res?.data?.id || '').trim();
    if (!isSnowflake(selfId)) {
        throw new DiscordBotError('Failed to resolve bot user id', {
            status: 500,
            code: 'DISCORD_BOT_SELF_INVALID'
        });
    }

    cachedBotSelfId = selfId;
    cachedBotSelfAt = Date.now();
    return selfId;
};

const getGuildMember = async (discordId) => {
    if (!isSnowflake(discordId)) return { ok: false, exists: false, unavailable: false, member: null };

    const guildId = getGuildId();
    try {
        const res = await botRequest({
            method: 'get',
            path: `/guilds/${guildId}/members/${discordId}`,
            timeout: 4000,
            retry: false,
            defaultCode: 'DISCORD_MEMBER_LOOKUP_FAILED'
        });
        return { ok: true, exists: true, unavailable: false, member: res?.data || null };
    } catch (error) {
        if (error instanceof DiscordBotError && error.status === 404) {
            return { ok: true, exists: false, unavailable: false, member: null };
        }
        if (error instanceof DiscordBotError && error.status === 503) {
            return { ok: false, exists: false, unavailable: true, member: null };
        }
        throw error;
    }
};

const checkUserInGuild = async (discordId) => {
    if (!isSnowflake(discordId)) return false;
    try {
        const result = await getGuildMember(discordId);
        if (result.unavailable) return null;
        return result.exists;
    } catch (error) {
        if (error instanceof DiscordBotError && (error.status === 500 || error.status === 503)) {
            return null;
        }
        return null;
    }
};

const checkUserHasOwnerRole = async (discordId) => {
    if (!isSnowflake(discordId)) return false;

    const ownerRoleId = getOwnerRoleId();
    if (!isSnowflake(ownerRoleId)) return false;

    try {
        const result = await getGuildMember(discordId);
        if (!result.exists || !result.member) return false;
        const roleIds = Array.isArray(result.member.roles) ? result.member.roles.map((id) => String(id)) : [];
        return roleIds.includes(ownerRoleId);
    } catch {
        return false;
    }
};

const isImageAttachment = (attachment) => {
    if (!attachment) return false;
    const contentType = String(attachment.contentType || '').toLowerCase();
    if (contentType.startsWith('image/')) return true;

    const fileName = String(attachment.name || attachment.filename || '').toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
};

const getImageAttachments = (message) => {
    if (!message?.attachments || typeof message.attachments.values !== 'function') return [];
    const imageAttachments = [];
    for (const attachment of message.attachments.values()) {
        if (isImageAttachment(attachment)) imageAttachments.push(attachment);
    }
    return imageAttachments;
};

const findOrderByTicketChannelId = async (channelId) => {
    if (!isSnowflake(channelId)) return null;
    return Order.findOne({ channelId }).sort({ createdAt: -1 });
};

const findOrderByTicketChannelName = async (channelNameRaw) => {
    const channelName = String(channelNameRaw || '').trim().toLowerCase();
    if (!channelName) return null;

    return Order.findOne({ orderId: channelName }).sort({ createdAt: -1 });
};

const findOrderByTicketChannel = async (message) => {
    const channelId = String(message?.channelId || '').trim();
    const byIdQuery = buildTicketOrderLookupQuery({ channelId });
    const byId = byIdQuery
        ? await Order.findOne(byIdQuery).sort({ createdAt: -1 })
        : null;
    if (byId) return byId;

    const channelName = String(message?.channel?.name || '').trim();
    if (!channelName) return null;
    const byNameQuery = buildTicketOrderLookupQuery({ channelName });
    if (!byNameQuery) return null;
    return Order.findOne(byNameQuery).sort({ createdAt: -1 });
};

const isConfiguredTicketCategoryChannel = (message) => {
    const ticketCategoryId = getTicketCategoryId();
    if (!isSnowflake(ticketCategoryId)) return false;
    const parentId = String(message?.channel?.parentId || '').trim();
    return parentId === ticketCategoryId;
};

const isTicketOwnerOrStaff = async (discordId, order) => {
    const userId = String(discordId || '').trim();
    if (!isSnowflake(userId)) return false;

    if (String(order?.discordId || '') === userId) {
        return true;
    }

    const ownerId = getOwnerId();
    if (ownerId && ownerId === userId) {
        return true;
    }

    return checkUserHasOwnerRole(userId);
};

const isStaffUser = async (discordId) => {
    const userId = String(discordId || '').trim();
    if (!isSnowflake(userId)) return false;

    const ownerId = getOwnerId();
    if (ownerId && ownerId === userId) {
        return true;
    }

    const hasRole = await checkUserHasOwnerRole(userId).catch(() => false);
    if (hasRole) return true;
    return false;
};

const formatPurchasedItemsForDm = (items) => {
    if (!Array.isArray(items) || items.length === 0) return 'San pham khong biet';
    return items
        .map((item) => {
            const name = String(item?.name || 'San pham khong biet').trim();
            return `${name} (${formatPurchasedUnitsLabel(item)})`;
        })
        .join(', ')
        .slice(0, 800);
};

const buildPurchaseThankYouDm = (order) => {
    const purchasedItems = formatPurchasedItemsForDm(order?.items);
    return [
        '**Cam on quy khach da mua hang!**',
        '',
        'Chung toi rat trong trong don hang cua ban va san sang phuc vu quy khach.',
        '',
        `**San pham da mua:** [${purchasedItems}]`,
        '',
        'Neu quy khach can them san pham nao khac, vui long lien he voi chung toi. Chung toi se rat vui long được tiep tuc phuc vu.',
        '',
        '**Cam on quy khach da tin tuong va ung ho!**',
        '',
        '**— ShopVN Team**'
    ].join('\n');
};

const sendPurchaseThankYouDm = async (order) => {
    const userId = String(order?.discordId || '').trim();
    if (!isSnowflake(userId)) return false;

    const user = await client.users.fetch(userId, { force: true });
    if (!user) return false;
    await user.send(buildPurchaseThankYouDm(order));
    return true;
};

const refreshDiscordAccessToken = async (refreshToken) => {
    const safeRefreshToken = String(refreshToken || '').trim();
    const clientId = getOauthClientId();
    const clientSecret = getOauthClientSecret();
    if (!safeRefreshToken || !clientId || !clientSecret) return null;

    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: safeRefreshToken
    });

    const res = await discordRequest({
        method: 'post',
        url: 'https://discord.com/api/oauth2/token',
        timeout: 12000,
        data: body.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, 0, { noRetry: true });

    return res?.data || null;
};

const getUsableUserAccessToken = async (dbUser) => {
    if (!dbUser) return { accessToken: '', refreshed: false };

    const now = Date.now();
    const accessToken = decryptSecret(dbUser.accessToken);
    const refreshToken = decryptSecret(dbUser.refreshToken);
    const tokenExpiresAtMs = new Date(dbUser.tokenExpiresAt || 0).getTime();

    if (accessToken && (!Number.isFinite(tokenExpiresAtMs) || tokenExpiresAtMs > now + 60 * 1000)) {
        return { accessToken, refreshed: false };
    }

    if (!refreshToken) return { accessToken: '', refreshed: false };

    try {
        const refreshed = await refreshDiscordAccessToken(refreshToken);
        const nextAccessToken = String(refreshed?.access_token || '').trim();
        if (!nextAccessToken) return { accessToken: '', refreshed: false };

        const nextRefreshToken = String(refreshed?.refresh_token || '').trim();
        const expiresIn = Number(refreshed?.expires_in);
        const scopes = String(refreshed?.scope || '')
            .split(' ')
            .map((value) => value.trim())
            .filter(Boolean);

        dbUser.accessToken = encryptSecret(nextAccessToken);
        if (nextRefreshToken) {
            dbUser.refreshToken = encryptSecret(nextRefreshToken);
        }
        if (Number.isFinite(expiresIn) && expiresIn > 0) {
            dbUser.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
        }
        if (scopes.length > 0) {
            dbUser.scopes = scopes;
        }
        await dbUser.save();
        return { accessToken: nextAccessToken, refreshed: true };
    } catch (error) {
        console.warn(`Refresh token failed for user ${dbUser.discordId || 'unknown'}:`, error?.response?.status || error?.message || error);
        return { accessToken: '', refreshed: false };
    }
};

const addMemberToGuild = async ({ guildId, discordId, accessToken }) => {
    if (!isSnowflake(guildId) || !isSnowflake(discordId) || !accessToken) {
        throw new DiscordBotError('Missing guild/user/access token for guild join', {
            status: 400,
            code: 'DISCORD_JOIN_INPUT_INVALID'
        });
    }

    return botRequest({
        method: 'put',
        path: `/guilds/${guildId}/members/${discordId}`,
        data: { access_token: accessToken },
        timeout: REQUEST_TIMEOUT_MS,
        retry: false,
        defaultCode: 'DISCORD_GUILD_JOIN_FAILED'
    });
};

const isForbiddenOrUnknownJoinFailure = (error) => {
    if (!(error instanceof DiscordBotError)) return false;

    const status = Number(error.status);
    if ([401, 403, 404].includes(status)) return true;

    const discordCode = Number(error?.data?.code);
    if ([10013, 50001, 50013, 50025].includes(discordCode)) return true;

    if (['DISCORD_BOT_UNAUTHORIZED', 'DISCORD_BOT_FORBIDDEN'].includes(error.code)) return true;

    const message = String(error?.data?.message || error?.message || '').toLowerCase();
    return (
        message.includes('invalid oauth')
        || message.includes('invalid access token')
        || message.includes('unknown user')
        || message.includes('missing access')
        || message.includes('missing permissions')
        || message.includes('forbidden')
    );
};

const formatLinkedUserLine = (dbUser, index) => {
    const orderNo = String(index + 1).padStart(5, '0');
    const discordId = String(dbUser?.discordId || '').trim();
    const discordUsername = String(dbUser?.discordUsername || '').trim() || 'Nguoi dung chua biet';
    return `${orderNo}. ${discordUsername} (${discordId || 'thieu-id'})`;
};

const getLinkedUsersSnapshot = async () => {
    const users = await User.find({
        discordId: { $exists: true, $ne: '' },
        linkedActive: { $ne: false }
    })
        .select('discordId discordUsername')
        .sort({ discordUsername: 1, discordId: 1 })
        .lean();

    return Array.isArray(users)
        ? users.filter((item) => String(item?.discordId || '').trim())
        : [];
};

const buildLinkedUsersListText = (users) => {
    const rows = Array.isArray(users)
        ? users.map((item, index) => formatLinkedUserLine(item, index))
        : [];
    const body = rows.join('\n') || 'Khong co nguoi dung lien ket.';
    return `Nguoi dung lien ket (${rows.length})\n\n${body}`;
};

const reAddLinkedUsersToGuild = async ({ targetGuildId, totalLinkedHint = 0, onProgress = null } = {}) => {
    const guildId = String(targetGuildId || '').trim() || getGuildId();
    if (!isSnowflake(guildId)) {
        throw new DiscordBotError('DISCORD_GUILD_ID is missing or invalid', {
            status: 500,
            code: 'DISCORD_GUILD_ID_INVALID'
        });
    }

    const baseFilter = {
        discordId: { $exists: true, $ne: '' },
        linkedActive: { $ne: false }
    };
    const totalLinked = Number(totalLinkedHint) > 0
        ? Math.floor(Number(totalLinkedHint))
        : await User.countDocuments(baseFilter);
    const restoreBitmapKey = `bot:addall:${guildId}:${Date.now().toString(36)}`;
    const restoreBitmapSize = Number(process.env.REDIS_BOT_ADDALL_BITMAP_SIZE) || (1 << 27);

    const cursor = User.find(baseFilter)
        .select('discordId discordUsername accessToken refreshToken tokenExpiresAt scopes')
        .cursor();

    const summary = {
        totalLinked,
        added: 0,
        alreadyInGuild: 0,
        refreshedToken: 0,
        skippedNoToken: 0,
        skippedForbiddenOrUnknown: 0,
        rateLimited: 0,
        failed: 0,
        processed: 0
    };

    const notifyProgress = async (force = false) => {
        if (typeof onProgress !== 'function') return;
        if (!force && summary.processed > 0 && (summary.processed % ADDALL_PROGRESS_INTERVAL !== 0)) return;
        try {
            await onProgress({ ...summary });
        } catch {
            // Ignore progress callback errors.
        }
    };

    const processOneUser = async (dbUser) => {
        const discordId = String(dbUser?.discordId || '').trim();
        if (!isSnowflake(discordId)) {
            summary.failed += 1;
            summary.processed += 1;
            await notifyProgress();
            return;
        }
        const restoreHash = crypto.createHash('sha256').update(`${guildId}:${discordId}`).digest('hex');
        const restoreSeen = await bitmapCheckAndSet(
            restoreBitmapKey,
            bitmapOffsetFromHash(restoreHash, restoreBitmapSize)
        );
        if (restoreSeen?.alreadySet) {
            summary.alreadyInGuild += 1;
            summary.processed += 1;
            await notifyProgress();
            return;
        }

        const tokenResult = await getUsableUserAccessToken(dbUser);
        const accessToken = String(tokenResult?.accessToken || '').trim();
        if (tokenResult?.refreshed) {
            summary.refreshedToken += 1;
        }
        if (!accessToken) {
            summary.skippedNoToken += 1;
            summary.processed += 1;
            await notifyProgress();
            return;
        }

        let joined = false;
        let skippedForbiddenOrUnknown = false;
        let rateLimited = false;
        for (let attempt = 1; attempt <= ADDALL_MAX_JOIN_RETRIES; attempt += 1) {
            try {
                const res = await addMemberToGuild({ guildId, discordId, accessToken });
                const status = Number(res?.status || 0);
                if (status === 204) {
                    summary.alreadyInGuild += 1;
                } else {
                    summary.added += 1;
                }
                joined = true;
                break;
            } catch (error) {
                if (error instanceof DiscordBotError) {
                    if (error.status === 429) {
                        rateLimited = true;
                        if (attempt < ADDALL_MAX_JOIN_RETRIES) {
                            const waitMs = Math.max(1000, (Number(error.retryAfterSeconds) || 1) * 1000);
                            await sleep(waitMs);
                            continue;
                        }
                    }
                    if (isForbiddenOrUnknownJoinFailure(error)) {
                        skippedForbiddenOrUnknown = true;
                        break;
                    }
                }
                if (
                    error instanceof DiscordBotError
                    && (error.status === 500 || error.status === 503)
                    && attempt < ADDALL_MAX_JOIN_RETRIES
                ) {
                    const waitMs = Math.min(8000, 600 * attempt);
                    await sleep(waitMs);
                    continue;
                }
                break;
            }
        }

        if (rateLimited) {
            summary.rateLimited += 1;
        }

        if (skippedForbiddenOrUnknown) {
            summary.skippedForbiddenOrUnknown += 1;
        } else if (!joined) {
            summary.failed += 1;
        }

        summary.processed += 1;
        await notifyProgress();
    };

    const activeTasks = new Set();
    for await (const dbUser of cursor) {
        const task = processOneUser(dbUser)
            .catch(() => {
                summary.failed += 1;
                summary.processed += 1;
            })
            .finally(() => {
                activeTasks.delete(task);
            });

        activeTasks.add(task);
        if (activeTasks.size >= ADDALL_CONCURRENCY) {
            await Promise.race(activeTasks);
        }
    }

    await Promise.all(Array.from(activeTasks));
    await notifyProgress(true);

    return summary;
};

const buildProofItems = (items) => {
    if (!Array.isArray(items)) return [];
    return items
        .map((item) => {
            const name = String(item?.name || '').trim();
            if (!name) return null;
            const quantity = Math.max(1, Number(item?.quantity) || 1);
            const deliveredLabel = formatPurchasedUnitsLabel(item);
            const lineTotal = Math.max(0, Number(item?.lineTotalVnd || item?.priceVnd || 0) * quantity);
            return {
                name,
                packQuantity: Math.max(1, Number(item?.packQuantity) || 1),
                quantity,
                deliveredLabel,
                lineTotal: Number.isFinite(lineTotal) ? Number(lineTotal) : 0
            };
        })
        .filter(Boolean);
};

const getProofImageHash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const normalizeProofImageContentType = (value) => {
    const text = String(value || '').split(';')[0].trim().toLowerCase();
    return text.startsWith('image/') ? text : 'image/jpeg';
};

const upsertProofImages = async ({ proofId, orderId, imageBuffers }) => {
    if (!proofId || !Array.isArray(imageBuffers) || imageBuffers.length === 0) return;

    await Promise.all(imageBuffers.map(async (image, index) => {
        const buffer = Buffer.isBuffer(image?.buffer) ? image.buffer : null;
        if (!buffer || buffer.length === 0 || buffer.length > MAX_PROOF_IMAGE_BYTES) return;

        await ProofImage.findOneAndUpdate(
            { proofId, position: index },
            {
                $set: {
                    orderId: String(orderId || ''),
                    contentType: normalizeProofImageContentType(image.contentType),
                    data: buffer,
                    sourceUrl: String(image.sourceUrl || '').trim(),
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );
    }));
};

const saveProofRecord = async ({ order, imageUrls, imageBuffers = [], vouchMessageIds = [] }) => {
    const images = Array.from(new Set((Array.isArray(imageUrls) ? imageUrls : []).filter(Boolean)));
    if (!order || images.length === 0) return;
    const normalizedImageBuffers = Array.isArray(imageBuffers) ? imageBuffers.filter((image) => Buffer.isBuffer(image?.buffer)) : [];
    const imageHashes = normalizedImageBuffers.map((image) => getProofImageHash(image.buffer));
    const payload = {
        orderId: String(order?.orderId || ''),
        discordId: String(order?.discordId || ''),
        discordUsername: String(order?.discordTenHienThi || order?.discordUsername || ''),
        robloxUsername: String(order?.tenDangNhap || order?.robloxUsername || ''),
        totalAmount: Number(order?.totalVnd || order?.subtotalVnd || order?.totalAmount || 0),
        items: buildProofItems(order?.items),
        imageUrls: images,
        imageHashes,
        vouchMessageIds: Array.from(new Set((Array.isArray(vouchMessageIds) ? vouchMessageIds : []).filter(Boolean))),
        source: 'auto_vouch'
    };

    const normalizeUrl = (value) => String(value || '').trim();
    const sameImageSet = (left, right) => {
        const a = new Set((Array.isArray(left) ? left : []).map(normalizeUrl).filter(Boolean));
        const b = new Set((Array.isArray(right) ? right : []).map(normalizeUrl).filter(Boolean));
        if (a.size !== b.size) return false;
        for (const url of a) {
            if (!b.has(url)) return false;
        }
        return true;
    };
    const sameHashSet = (left, right) => {
        const a = new Set((Array.isArray(left) ? left : []).map(normalizeUrl).filter(Boolean));
        const b = new Set((Array.isArray(right) ? right : []).map(normalizeUrl).filter(Boolean));
        if (a.size === 0 || b.size === 0 || a.size !== b.size) return false;
        for (const hash of a) {
            if (!b.has(hash)) return false;
        }
        return true;
    };

    const latestForOrder = await Proof.findOne({ orderId: payload.orderId })
        .sort({ createdAt: -1 })
        .select('_id createdAt imageUrls imageHashes')
        .lean();

    let proofId = '';
    if (
        latestForOrder
        && (
            sameHashSet(latestForOrder.imageHashes, payload.imageHashes)
            || sameImageSet(latestForOrder.imageUrls, payload.imageUrls)
        )
    ) {
        await Proof.updateOne(
            { _id: latestForOrder._id },
            {
                $set: {
                    ...payload,
                    createdAt: latestForOrder.createdAt || new Date()
                }
            }
        );
        proofId = latestForOrder._id;
    } else {
        const created = await Proof.create(payload);
        proofId = created?._id;
    }

    await upsertProofImages({
        proofId,
        orderId: payload.orderId,
        imageBuffers: normalizedImageBuffers
    });
};

const sendAutoVouchFromTicketImages = async ({ order, imageUrls }) => {
    const vouchChannelId = getVouchChannelId();
    const uniqueImageUrls = Array.from(
        new Set(
            (Array.isArray(imageUrls) ? imageUrls : [])
                .map((url) => String(url || '').trim())
                .filter(Boolean)
        )
    );
    if (!isSnowflake(vouchChannelId) || uniqueImageUrls.length === 0) return false;

    const getImageExtFromUrl = (url) => {
        try {
            const pathname = String(new URL(String(url || '')).pathname || '').toLowerCase();
            const matched = IMAGE_EXTENSIONS.find((ext) => pathname.endsWith(ext));
            if (matched) return matched;
        } catch {
            // Ignore URL parse errors.
        }
        return '.png';
    };

    const downloadImageBuffer = async (url) => {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: IMAGE_DOWNLOAD_TIMEOUT_MS,
            maxContentLength: MAX_PROOF_IMAGE_BYTES,
            validateStatus: (status) => Number(status) >= 200 && Number(status) < 300
        });
        const buffer = Buffer.from(res.data);
        if (buffer.length > MAX_PROOF_IMAGE_BYTES) {
            throw new Error(`Image is too large (${buffer.length} bytes)`);
        }
        return {
            buffer,
            contentType: normalizeProofImageContentType(res.headers?.['content-type'])
        };
    };

    const channel = await client.channels.fetch(vouchChannelId, { force: true });
    if (!channel || typeof channel.send !== 'function') {
        return false;
    }

    const sentMessageIds = [];
    const uploadedImageUrls = [];
    const uploadedImageBuffers = [];
    let didSendHeaderContent = false;
    for (let index = 0; index < uniqueImageUrls.length; index += MAX_VOUCH_IMAGES_PER_MESSAGE) {
        const imageBatch = uniqueImageUrls.slice(index, index + MAX_VOUCH_IMAGES_PER_MESSAGE);
        const files = [];
        const preparedImages = [];

        for (let imageIndex = 0; imageIndex < imageBatch.length; imageIndex += 1) {
            const sourceUrl = imageBatch[imageIndex];
            try {
                const image = await downloadImageBuffer(sourceUrl);
                const ext = getImageExtFromUrl(sourceUrl);
                files.push(new AttachmentBuilder(image.buffer, {
                    name: `proof-${Date.now()}-${index + imageIndex}${ext}`
                }));
                preparedImages.push({
                    ...image,
                    sourceUrl
                });
            } catch (error) {
                console.warn(`Auto-vouch image download failed: ${sourceUrl}`, error?.message || error);
            }
        }

        if (files.length === 0) {
            continue;
        }

        const sent = await channel.send({
            ...(didSendHeaderContent ? {} : { content: buildDiscordVouchContent(order) }),
            files
        });
        didSendHeaderContent = true;
        const messageId = String(sent?.id || '').trim();
        if (isSnowflake(messageId)) {
            sentMessageIds.push(messageId);
        }
        let attachmentIndex = 0;
        for (const attachment of sent.attachments.values()) {
            const uploadedUrl = String(attachment?.url || '').trim();
            if (uploadedUrl) {
                uploadedImageUrls.push(uploadedUrl);
                const prepared = preparedImages[attachmentIndex];
                if (prepared?.buffer) {
                    uploadedImageBuffers.push({
                        buffer: prepared.buffer,
                        contentType: normalizeProofImageContentType(attachment?.contentType || prepared.contentType),
                        sourceUrl: uploadedUrl
                    });
                }
            }
            attachmentIndex += 1;
        }
    }

    if (uploadedImageUrls.length === 0) {
        return false;
    }

    try {
        await saveProofRecord({
            order,
            imageUrls: Array.from(new Set(uploadedImageUrls)),
            imageBuffers: uploadedImageBuffers,
            vouchMessageIds: sentMessageIds
        });
    } catch (error) {
        console.error('Save proof record error:', error?.message || error);
    }

    return true;
};

const resetOrderTicketStateByChannel = async (order, channelId, { finalStatus = '' } = {}) => {
    if (!order || !channelId) return;

    const update = {};
    if (String(order.channelId || '') === channelId) {
        update.channelId = '';
        update.ticketStatus = 'chua_yeu_cau';
        update.ticketError = '';
        update.ticketLockUntil = null;
    }

    if (finalStatus === 'huy') {
        update.status = 'huy';
        update.paymentStatus = 'cancelled';
    }
    if (finalStatus === 'hoan_thanh') {
        update.status = 'hoan_thanh';
        update.paymentStatus = 'paid';
    }

    if (Object.keys(update).length > 0) {
        await Order.updateOne({ _id: order._id }, { $set: update });
    }
};

const closeTicketChannel = async ({ order, channelId, finalStatus = '' }) => {
    await resetOrderTicketStateByChannel(order, channelId, { finalStatus }).catch((error) => {
        console.error('Reset ticket state error:', error?.message || error);
    });

    await botRequest({
        method: 'delete',
        path: `/channels/${channelId}`,
        timeout: REQUEST_TIMEOUT_MS,
        retry: false,
        defaultCode: 'DISCORD_CHANNEL_CLOSE_FAILED'
    });
};

const buildPermissionOverwrites = ({ customerId, includeOwnerRole, botSelfId }) => {
    const guildId = getGuildId();
    const ownerRoleId = getOwnerRoleId();
    const privilegedUserIds = ['1146730730060271736', '1005326332001009784'];

    const overwrites = [
        { id: guildId, type: 0, deny: PERM_VIEW_CHANNEL_ONLY },
        { id: customerId, type: 1, allow: PERM_TICKET_CHAT },
        ...privilegedUserIds.map((id) => ({ id, type: 1, allow: PERM_TICKET_CHAT }))
    ];

    if (includeOwnerRole && isSnowflake(ownerRoleId) && !overwrites.some(o => o.id === ownerRoleId)) {
        overwrites.push({ id: ownerRoleId, type: 0, allow: PERM_TICKET_CHAT });
    }

    if (isSnowflake(botSelfId)) {
        overwrites.push({ id: botSelfId, type: 1, allow: PERM_TICKET_CHAT });
    }

    return overwrites;
};

const buildCreateChannelPayloads = async ({ channelName, customerId }) => {
    const safeName = sanitizeChannelName(channelName, 'ticket');
    const categoryId = getTicketCategoryId();
    const ownerRoleId = getOwnerRoleId();
    const hasCategory = isSnowflake(categoryId);
    const hasOwnerRole = isSnowflake(ownerRoleId);
    const botSelfId = await getBotSelfId().catch(() => '');

    const payload = {
        name: safeName,
        type: 0,
        permission_overwrites: buildPermissionOverwrites({
            customerId,
            includeOwnerRole: hasOwnerRole,
            botSelfId
        })
    };
    if (hasCategory) {
        payload.parent_id = categoryId;
    }

    const fallbackPayload = {
        name: safeName,
        type: 0,
        permission_overwrites: buildPermissionOverwrites({
            customerId,
            includeOwnerRole: false,
            botSelfId
        })
    };

    const samePayload = JSON.stringify(payload) === JSON.stringify(fallbackPayload);
    return samePayload ? [payload] : [payload, fallbackPayload];
};

const createTicketChannel = async ({ channelName, customerId }) => {
    log.info('[TICKET] Creating ticket channel', {
        channelName,
        customerId,
        guildId: getGuildId()
    });

    if (!isSnowflake(customerId)) {
        throw new DiscordBotError('Customer Discord ID is invalid', {
            status: 400,
            code: 'DISCORD_USER_ID_INVALID'
        });
    }

    const inGuild = await checkUserInGuild(customerId);
    if (inGuild === false) {
        log.warn('[TICKET] User not in guild', { customerId });
        throw new DiscordBotError('Ban phai gia nhap Discord server truoc khi tao ticket.', {
            status: 403,
            code: 'USER_NOT_IN_GUILD'
        });
    }
    if (inGuild === null) {
        console.warn(`Ticket guild membership check unavailable for ${customerId}; proceeding with channel create.`);
    }

    return runTicketCreateQueued(async () => {
        const guildId = getGuildId();
        const payloads = await buildCreateChannelPayloads({ channelName, customerId });

        let lastRecoverableError = null;
        for (const payload of payloads) {
            try {
                log.debug('[TICKET] Attempting channel create', {
                    guildId,
                    payload: { ...payload, permission_overwrites: '[HIDDEN]' }
                });

                const res = await botRequest({
                    method: 'post',
                    path: `/guilds/${guildId}/channels`,
                    data: payload,
                    timeout: REQUEST_TIMEOUT_CREATE_CHANNEL_MS,
                    retry: true,
                    retryOptions: {
                        maxRetries: TICKET_CREATE_RETRY_MAX_RETRIES,
                        baseDelayMs: TICKET_CREATE_RETRY_BASE_DELAY_MS,
                        maxDelayMs: TICKET_CREATE_RETRY_MAX_DELAY_MS
                    },
                    defaultCode: 'DISCORD_CHANNEL_CREATE_FAILED'
                });
                const channelId = String(res?.data?.id || '').trim();
                if (isSnowflake(channelId)) {
                    log.info('[TICKET] Channel created successfully', {
                        channelId,
                        channelName,
                        customerId
                    });
                    return channelId;
                }
                lastRecoverableError = new DiscordBotError('Discord returned an invalid channel id', {
                    status: 503,
                    code: 'DISCORD_CHANNEL_CREATE_INVALID'
                });
            } catch (error) {
                log.error('[TICKET] Channel create failed', {
                    channelName,
                    customerId,
                    error: error?.message || error,
                    status: error?.status
                });
                if (!(error instanceof DiscordBotError)) {
                    throw error;
                }
                if (error.status === 429) {
                    const cooldownSeconds = setTicketCreateCooldownSeconds(
                        Math.max(Number(error.retryAfterSeconds) || 0, 2)
                    );
                    if (cooldownSeconds > 0) {
                        error.retryAfterSeconds = Math.max(Number(error.retryAfterSeconds) || 0, cooldownSeconds);
                    }
                    throw error;
                }
                if (error.status === 500 || error.status === 503) {
                    throw error;
                }
                lastRecoverableError = error;
            }
        }

        log.error('[TICKET] All channel create attempts failed', {
            channelName,
            customerId,
            lastError: lastRecoverableError?.message
        });
        throw lastRecoverableError || new DiscordBotError('Could not create Discord ticket channel', {
            status: 503,
            code: 'DISCORD_CHANNEL_CREATE_FAILED'
        });
    });
};

const sendTicketMessage = async ({ channelId, content, embed, components = [] }) => {
    if (!isSnowflake(channelId)) {
        throw new DiscordBotError('Created channel id is invalid', {
            status: 500,
            code: 'DISCORD_CHANNEL_ID_INVALID'
        });
    }

    await botRequest({
        method: 'post',
        path: `/channels/${channelId}/messages`,
        data: {
            content: truncateText(content, 1900),
            embeds: embed ? [embed.toJSON()] : [],
            components: Array.isArray(components) ? components.map((item) => item.toJSON()) : []
        },
        timeout: REQUEST_TIMEOUT_MS,
        retry: true,
        retryOptions: { maxRetries: 2, baseDelayMs: 700, maxDelayMs: 8000 },
        defaultCode: 'DISCORD_MESSAGE_SEND_FAILED'
    });
};

const buildOrderMention = (discordId) => {
    const ownerRoleId = getOwnerRoleId();
    if (isSnowflake(ownerRoleId)) {
        return `<@${discordId}> <@&${ownerRoleId}>`;
    }
    return `<@${discordId}>`;
};

const getClientBaseUrl = () => normalizeEnvValue((process.env.CLIENT_URL || '').split(',')[0] || '') || 'https://shopvn.live';
const formatDateInTimezone = (value, timezone) => {
    if (!value) return '-';
    try {
        return new Intl.DateTimeFormat('vi-VN', {
            timeZone: String(timezone || 'Asia/Ho_Chi_Minh'),
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(value));
    } catch {
        return new Date(value).toISOString();
    }
};

const buildDeliveryTicketFields = (order) => {
    const discordUsername = String(order?.discordTenHienThi || order?.discordUsername || '').trim();
    const tenDangNhap = String(order?.tenDangNhap || order?.robloxUsername || '').trim();
    const discordId = String(order?.discordId || '').trim();

    const fields = [
        { name: 'Khach hang', value: discordId ? `<@${discordId}>` : (discordUsername || '-'), inline: true },
        { name: 'Tai khoan web', value: tenDangNhap || '-', inline: true },
        { name: 'Tong don', value: `**${formatVndAmount(order?.totalVnd || order?.subtotalVnd || order?.total || 0)}**`, inline: true },
        { name: 'Trang thai thanh toan', value: '**Da thanh toan**', inline: false },
        { name: 'San pham', value: formatOrderItemsVnd(order?.items), inline: false }
    ];
    return fields;
};

const createWalletDeliveryTicket = async (order) => {
    const seq = getOrderSequence(order);
    const channelId = await createTicketChannel({
        channelName: `order_${seq}`,
        customerId: order.discordId
    });

    const embed = new EmbedBuilder()
        .setColor(0x00D4AA)
        .setTitle('Giao Hang')
        .setDescription(
            `Xin chao <@${order.discordId}>. Thanh toan da xac nhan. Nhan vien se giao hang trong khung gio da chon.`
        )
        .addFields([
            { name: 'Ma don', value: String(order.orderId || '').toUpperCase(), inline: false },
            ...buildDeliveryTicketFields(order)
        ]);

    try {
        await sendTicketMessage({
            channelId,
            content: buildOrderMention(order.discordId),
            embed
        });
    } catch (error) {
        console.error('Wallet delivery ticket message error:', error?.message || error);
    }

    return channelId;
};

const notifyOwnerWalletTopupRequest = async (transaction) => {
    const channelId = getWalletNotifyChannelId();
    if (!isSnowflake(channelId)) return false;

    const ownerRoleId = getOwnerRoleId();
    const ownerMention = isSnowflake(ownerRoleId) ? `<@&${ownerRoleId}>` : '';
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('Yeu Cau Nap Vi')
        .setDescription('Mot khach hang da tao yeu cau nap vi. Hay xac nhan sau khi kiem tra thanh toan.')
        .addFields([
            {
                name: 'Khach hang',
                value: transaction?.discordId ? `<@${transaction.discordId}>` : (transaction?.discordUsername || '-'),
                inline: true
            },
            { name: 'So tien', value: formatVndAmount(Number(transaction?.amountCents || 0) / 100), inline: true },
            { name: 'Phuong thuc', value: String(transaction?.method || '-'), inline: true },
            { name: 'Ma tham chieu', value: String(transaction?.referenceCode || '-'), inline: true },
            { name: 'Ghi chu', value: truncateText(transaction?.memoExpected || '-', 900), inline: false }
        ]);

    try {
        await sendTicketMessage({
            channelId,
            content: ownerMention || 'Yeu cau nap vi',
            embed
        });
        return true;
    } catch (error) {
        console.error('Wallet top-up notification error:', error?.message || error);
        return false;
    }
};

client.on('interactionCreate', async (interaction) => {
    // No longer handling copy buttons for payment methods
});

client.on('channelDelete', async (channel) => {
    const channelId = String(channel?.id || '').trim();
    if (!isSnowflake(channelId)) return;

    try {
        const order = await findOrderByTicketChannelId(channelId);
        if (!order) return;
        await resetOrderTicketStateByChannel(order, channelId);
    } catch (error) {
        console.error('Channel delete ticket sync error:', error?.message || error);
    }
});

client.on('messageCreate', async (message) => {
    if (!message || message.author?.bot) return;
    if (!message.guildId) return;

    const channelId = String(message.channelId || '').trim();
    if (!isSnowflake(channelId)) return;

    const normalizedContent = String(message.content || '').trim().toLowerCase();
    const isDoneCommand = DONE_COMMANDS.has(normalizedContent);
    const isReAddAllCommand = READD_ALL_COMMANDS.has(normalizedContent);
    const imageAttachments = getImageAttachments(message);
    if (!isDoneCommand && !isReAddAllCommand && imageAttachments.length === 0) return;

    if (isReAddAllCommand) {
        const canRun = await isStaffUser(message.author.id);
        if (!canRun) {
            await message.reply('Ban khong co quyen su dung lenh nay.');
            return;
        }

        const targetGuildId = String(message.guildId || '').trim();
        if (!isSnowflake(targetGuildId)) {
            await message.reply('Khong the resolve server cho lenh nay.');
            return;
        }

        let progressMessage = null;
        try {
            const totalLinked = await User.countDocuments({
                discordId: { $exists: true, $ne: '' }
            });
            if (totalLinked === 0) {
                await message.reply('Khong co nguoi dung lien ket de khoi phuc.');
                return;
            }

            await message.reply(`Tim thay ${totalLinked} nguoi dung lien ket. Dang bat dau khoi phucvao server...`);

            progressMessage = await message.reply('Dang khoi phuc... 0 nguoi dung da xu ly.');
            let lastProgressEditAt = 0;
            const summary = await reAddLinkedUsersToGuild({
                targetGuildId,
                totalLinkedHint: totalLinked,
                onProgress: async (progress) => {
                    const now = Date.now();
                    if (
                        progress.processed < progress.totalLinked
                        && (now - lastProgressEditAt) < 2000
                    ) {
                        return;
                    }

                    lastProgressEditAt = now;
                    if (progressMessage && typeof progressMessage.edit === 'function') {
                        const progressText = [
                            `Khoi phuc tai server ${targetGuildId}`,
                            `Da xu ly: ${progress.processed}/${progress.totalLinked}`,
                            `Da them: ${progress.added}`,
                            `Da trong server: ${progress.alreadyInGuild}`,
                            `Lam moi token: ${progress.refreshedToken}`,
                            `Bo qua (thieu/het han): ${progress.skippedNoToken}`,
                            `Bo qua (cam/tim khong thay): ${progress.skippedForbiddenOrUnknown}`,
                            `Bi gioi han: ${progress.rateLimited}`,
                            `That bai: ${progress.failed}`
                        ].join('\n');
                        await progressMessage.edit(progressText);
                    }
                }
            });
            const summaryText = [
                'Hoan tat them-tat-ca.',
                `Server dich: ${targetGuildId}`,
                `Nguoi dung lien ket: ${summary.totalLinked}`,
                `Da xu ly: ${summary.processed}`,
                `Da them: ${summary.added}`,
                `Da trong server: ${summary.alreadyInGuild}`,
                `Lam moi token: ${summary.refreshedToken}`,
                `Bo qua (thieu/ het han): ${summary.skippedNoToken}`,
                `Bo qua (cam/tim khong thay): ${summary.skippedForbiddenOrUnknown}`,
                `Bi gioi han: ${summary.rateLimited}`,
                `That bai: ${summary.failed}`
            ].join('\n');

            if (progressMessage && typeof progressMessage.edit === 'function') {
                await progressMessage.edit(summaryText);
            } else {
                await message.reply(summaryText);
            }
        } catch (error) {
            console.error('Add-all command error:', error?.message || error);
            const failText = 'That bai khi them nguoi dung lien ket. Kiem tra quyen bot va cau hinh OAuth.';
            if (progressMessage && typeof progressMessage.edit === 'function') {
                await progressMessage.edit(failText).catch(() => {});
            } else {
                await message.reply(failText).catch(() => {});
            }
        }
        return;
    }

    let order = null;
    try {
        order = await findOrderByTicketChannel(message);
    } catch (error) {
        console.error('Ticket channel order lookup failed:', error?.message || error);
        return;
    }

    if (isDoneCommand) {
        try {
            if (!order) {
                await message.reply('Khong tim thay don hang cho ticket channel nay.');
                return;
            }

            await Order.updateOne(
                { _id: order._id },
                {
                    $set: {
                        status: 'hoan_thanh',
                        paymentStatus: 'paid',
                        paymentMethod: order.paymentMethod || 'wallet',
                        completedAt: new Date(),
                        completedBy: String(message.author.id || '')
                    }
                }
            );

            await maybeGrantNewUserReward(order);
            await maybeGrantReferralReward(order);

            let dmSent = false;
            try {
                dmSent = await sendPurchaseThankYouDm(order);
            } catch (error) {
                console.error('Send purchase thank-you DM error:', error?.message || error);
            }

            await message.reply(
                dmSent
                    ? 'Don hang da danh dau hoan thanh. Da gui tin nhan cam on. Dong ticket trong 3 giay...'
                    : 'Don hang da danh dau hoan thanh. Khong gui duoc tin nhan cam on. Dong ticket trong 3 giay...'
            );
            await sleep(3000);
            await closeTicketChannel({ order, channelId, finalStatus: 'hoan_thanh' });
            return;
        } catch (error) {
            console.error('Done ticket command error:', error?.message || error);
            try {
                await message.reply('That bai hoan thanh don hang ticket. Thu lai.');
            } catch {
                // Ignore reply failures.
            }
            return;
        }
    }

    if (!order) {
        if (imageAttachments.length > 0) {
            console.warn(`No order mapped for ticket channel ${channelId}`);
        }
        return;
    }
    if (imageAttachments.length === 0) return;
    if (normalizedContent !== '!') return;

    try {
        const canSendVouch = ['1146730730060271736', '1005326332001009784'].includes(String(message.author.id || ''));
        if (!canSendVouch) {
            console.warn(`Auto-vouch denied for user ${message.author.id} in channel ${channelId}`);
            return;
        }

        const imageUrls = imageAttachments
            .map((attachment) => String(attachment?.url || attachment?.proxyURL || '').trim())
            .filter(Boolean);

        if (imageUrls.length === 0) return;

        const sent = await sendAutoVouchFromTicketImages({
            order,
            imageUrls
        });

        if (sent) {
            const imageCountText = imageUrls.length > 1
                ? ` (${imageUrls.length} anh)`
                : '';
            await message.reply(`Viet thanh cong${imageCountText}.`);
            return;
        }

        console.warn(`Auto-vouch skipped for channel ${channelId}: DISCORD_VOUCH_CHANNEL_ID missing/invalid or bot cannot send.`);
    } catch (error) {
        console.error('Auto vouch send error:', error?.message || error);
        try {
            await message.reply('Khong the Viet. Kiem tra DISCORD_VOUCH_CHANNEL_ID va quyen bot.');
        } catch {
            // Ignore reply failures.
        }
    }
});

client.on('clientReady', () => {
    log.info('[DISCORD BOT] Bot online', {
        tag: client.user?.tag || 'unknown',
        userId: client.user?.id || 'unknown'
    });
});

client.on('error', (error) => {
    log.error('[DISCORD BOT] Client error', {
        error: error?.message || error,
        name: error?.name
    });
});

client.on('disconnect', () => {
    log.warn('[DISCORD BOT] Mat ket noi khoi gateway');
});

client.on('reconnecting', () => {
    log.info('[DISCORD BOT] Dang ket noi lai...');
});

// --- REFERRAL + NEW-USER REWARD HELPERS ---
const sendDmToUser = async (discordId, content) => {
    try {
        const user = await client.users.fetch(discordId).catch(() => null);
        if (user) await user.send(content);
        return true;
    } catch (e) {
        console.error('DM send error:', e?.message || e);
        return false;
    }
};

const createRewardCoupon = async ({ discountPercent, discordId, source }) => {
    for (let attempt = 0; attempt < 8; attempt++) {
        const couponCode = buildGeneratedCouponCode();
        try {
            return await GeneratedCoupon.create({ couponCode, discountPercent, discordId, source });
        } catch (err) {
            if (Number(err?.code) !== 11000 || attempt >= 7) throw err;
        }
    }
    throw new Error('Khong tao duoc ma giam gia.');
};

const maybeGrantNewUserReward = async (order) => {
    const discordId = String(order?.discordId || '').trim();
    if (!discordId || order.newUserRewardSent) return;
    const fp = await DeviceFingerprint.findOne({ discordId }).sort({ orderCount: -1 }).lean();
    if (!shouldGrantFirstOrderReward(fp)) {
        if (fp) console.warn('[REWARD] New-user reward blocked for', discordId, 'flags:', fp.flags);
        return;
    }
    const coupon = await createRewardCoupon({ discountPercent: 20, discordId, source: 'new_user' });
    await sendDmToUser(discordId, 'Day la ma giam gia cho nguoi dung moi cua ban:\n```' + coupon.couponCode + '```\nGiam 20% cho don hang tiep theo!');
    await DeviceFingerprint.updateMany({ discordId }, { $set: { orderCount: 1, firstOrderAt: new Date() } });
    await Order.updateOne({ _id: order._id }, { $set: { newUserRewardSent: true } });
    console.log('[REWARD] New-user 20% coupon sent to', discordId, coupon.couponCode);
};

const maybeGrantReferralReward = async (order) => {
    const referrerId = String(order?.referredByDiscordId || '').trim();
    const refereeId = String(order?.discordId || '').trim();
    if (!referrerId || !refereeId) return;

    const referral = await Referral.findOne({ referrerDiscordId: referrerId, refereeDiscordId: refereeId }).lean();
    if (!referral) return;

    const fp = await DeviceFingerprint.findOne({ discordId: refereeId }).sort({ updatedAt: -1 }).lean();
    if (hasSuspiciousDeviceFlag(fp)) {
        await Referral.updateOne(
            { referrerDiscordId: referrerId, refereeDiscordId: refereeId },
            { $set: { status: 'flagged' } }
        ).catch(() => {});
        return;
    }

    let rewardCode = String(referral.rewardCouponCode || '').trim().toUpperCase();
    if (!rewardCode) {
        const coupon = await createRewardCoupon({ discountPercent: 15, discordId: referrerId, source: 'referral' });
        rewardCode = coupon.couponCode;
        await Referral.updateOne(
            { referrerDiscordId: referrerId, refereeDiscordId: refereeId },
            { $set: { rewardCouponCode: rewardCode } }
        ).catch(() => {});
    }

    await Referral.updateOne(
        { referrerDiscordId: referrerId, refereeDiscordId: refereeId },
        { $set: { status: 'rewarded', refereeFirstOrderId: String(order?.orderId || '') } }
    ).catch(() => {});

    const fence = String.fromCharCode(96).repeat(3);
    await sendDmToUser(referrerId, 'Thuong cua ban (50%):\n' + fence + rewardCode + fence);
};

module.exports = {
    client,
    DiscordBotError,
    createTicketChannel,
    sendTicketMessage,
    createWalletDeliveryTicket,
    notifyOwnerWalletTopupRequest,
    checkUserInGuild,
    checkUserHasOwnerRole,
    getOwnerId
};
