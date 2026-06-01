const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const VIEW_CHANNEL = '1024';
const SEND_MESSAGES = '2048';
const READ_MESSAGE_HISTORY = '65536';

function normalizeValue(value) {
  return String(value || '').trim();
}

function slugify(value) {
  return normalizeValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ticket';
}

function buildDiscordTicketChannelName(orderCode, username) {
  const orderPart = slugify(orderCode);
  const userPart = slugify(username).slice(0, 24);
  return `ticket-${orderPart}${userPart ? `-${userPart}` : ''}`.slice(0, 90);
}

function buildDiscordTicketPayload({ orderCode, orderId, username, discordId, totalAmount }) {
  const channelName = buildDiscordTicketChannelName(orderCode, username);
  return {
    channelName,
    topic: `Order ${orderCode} (#${orderId}) | user=${username} | discord=${discordId} | total=${Number(totalAmount || 0)}`,
    meta: {
      orderCode,
      orderId,
      username,
      discordId,
      totalAmount: Number(totalAmount || 0),
    },
  };
}

function buildDiscordAuthUrl({ clientId, redirectUri, state, scopes = ['identify'] }) {
  const params = new URLSearchParams({
    client_id: normalizeValue(clientId),
    redirect_uri: normalizeValue(redirectUri),
    response_type: 'code',
    scope: scopes.join(' '),
    prompt: 'consent',
  });
  if (state) params.set('state', normalizeValue(state));
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

function signDiscordState(payload, secret = process.env.DISCORD_STATE_SECRET || process.env.JWT_SECRET || 'change-this-secret-before-production') {
  return jwt.sign(payload, secret, { expiresIn: '15m' });
}

function verifyDiscordState(state, secret = process.env.DISCORD_STATE_SECRET || process.env.JWT_SECRET || 'change-this-secret-before-production') {
  return jwt.verify(state, secret);
}

function shouldRequireDiscordLink(user) {
  return !normalizeValue(user?.discord_id);
}

async function discordRequestJson(path, { token, method = 'GET', body, headers = {} }) {
  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const parsed = text ? (() => { try { return JSON.parse(text); } catch { return { message: text }; } })() : {};
  if (!response.ok) {
    throw new Error(parsed?.message || `Discord API error ${response.status}`);
  }
  return parsed;
}

async function exchangeDiscordCode({ clientId, clientSecret, code, redirectUri }) {
  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: normalizeValue(clientId),
      client_secret: normalizeValue(clientSecret),
      grant_type: 'authorization_code',
      code: normalizeValue(code),
      redirect_uri: normalizeValue(redirectUri),
    }).toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || `Discord token exchange failed (${response.status})`);
  }
  return data;
}

async function fetchDiscordIdentity(accessToken) {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${normalizeValue(accessToken)}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Discord identity lookup failed (${response.status})`);
  }
  return data;
}

async function getGuildMember({ guildId, userDiscordId, botToken }) {
  return discordRequestJson(`/guilds/${guildId}/members/${userDiscordId}`, {
    token: botToken,
  });
}

async function isDiscordGuildMember({ guildId, userDiscordId, botToken }) {
  if (!normalizeValue(guildId) || !normalizeValue(userDiscordId) || !normalizeValue(botToken)) return false;
  try {
    await getGuildMember({ guildId: normalizeValue(guildId), userDiscordId: normalizeValue(userDiscordId), botToken: normalizeValue(botToken) });
    return true;
  } catch (_error) {
    return false;
  }
}

async function getBotIdentity(botToken) {
  return discordRequestJson('/users/@me', { token: botToken.replace(/^Bot\s+/i, '') });
}

async function createDiscordTicketChannel({
  guildId,
  botToken,
  categoryId = '',
  ticket,
  userDiscordId,
}) {
  const botIdentity = await getBotIdentity(botToken);
  const memberAllow = String(Number(VIEW_CHANNEL) + Number(SEND_MESSAGES) + Number(READ_MESSAGE_HISTORY));
  const permissionOverwrites = [
    { id: guildId, type: 0, deny: VIEW_CHANNEL },
    { id: botIdentity.id, type: 1, allow: memberAllow },
    { id: userDiscordId, type: 1, allow: memberAllow },
  ];
  const payload = {
    name: ticket.channelName,
    type: 0,
    topic: ticket.topic,
    permission_overwrites: permissionOverwrites,
    ...(normalizeValue(categoryId) ? { parent_id: normalizeValue(categoryId) } : {}),
  };
  const channel = await discordRequestJson(`/guilds/${guildId}/channels`, {
    token: botToken,
    method: 'POST',
    body: payload,
  });
  await discordRequestJson(`/channels/${channel.id}/messages`, {
    token: botToken,
    method: 'POST',
    body: {
      content: [
        `<@${userDiscordId}>`,
        `Đơn ${ticket.meta.orderCode} đã được tạo.`,
        `Tổng: ${ticket.meta.totalAmount}`,
      ].join('\n'),
    },
  });
  return {
    channelId: channel.id,
    channelUrl: `https://discord.com/channels/${guildId}/${channel.id}`,
    botUserId: botIdentity.id,
  };
}

module.exports = {
  buildDiscordAuthUrl,
  buildDiscordTicketChannelName,
  buildDiscordTicketPayload,
  createDiscordTicketChannel,
  exchangeDiscordCode,
  fetchDiscordIdentity,
  getGuildMember,
  isDiscordGuildMember,
  shouldRequireDiscordLink,
  signDiscordState,
  verifyDiscordState,
};
