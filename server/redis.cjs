const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || '';
const redisPrefix = process.env.REDIS_PREFIX || 'shopvn';
let client = null;
let connectPromise = null;
let disabledReason = redisUrl ? '' : 'REDIS_URL is not configured.';

function redisKey(...parts) {
  return [redisPrefix, ...parts].map((part) => String(part).replace(/[:\s]+/g, '-')).join(':');
}

function getRedisClient() {
  if (!redisUrl) return null;
  if (client) return client;
  client = createClient({ url: redisUrl });
  client.on('error', (error) => {
    disabledReason = error.message;
    console.error('Redis error:', error.message);
  });
  return client;
}

async function ensureRedis() {
  const redis = getRedisClient();
  if (!redis) return null;
  if (redis.isOpen) return redis;
  if (!connectPromise) {
    connectPromise = redis.connect().catch((error) => {
      disabledReason = error.message;
      connectPromise = null;
      return null;
    });
  }
  return connectPromise;
}

async function cacheGet(key) {
  const redis = await ensureRedis();
  if (!redis) return null;
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    disabledReason = error.message;
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 30) {
  const redis = await ensureRedis();
  if (!redis) return false;
  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return true;
  } catch (error) {
    disabledReason = error.message;
    return false;
  }
}

async function cacheDel(key) {
  const redis = await ensureRedis();
  if (!redis) return false;
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    disabledReason = error.message;
    return false;
  }
}

async function cacheDelPattern(pattern) {
  const redis = await ensureRedis();
  if (!redis) return 0;
  let cursor = 0;
  let deleted = 0;
  do {
    const result = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
    cursor = Number(result.cursor);
    if (result.keys.length) deleted += await redis.del(result.keys);
  } while (cursor !== 0);
  return deleted;
}

function userSessionKey(userId) {
  return redisKey('session', 'user', String(userId));
}

async function sessionGetUser(userId) {
  return cacheGet(userSessionKey(userId));
}

async function sessionSetUser(user, ttlSeconds = 120) {
  if (!user?.id) return false;
  return cacheSet(userSessionKey(user.id), user, ttlSeconds);
}

async function sessionDelUser(userId) {
  return cacheDel(userSessionKey(userId));
}

function botStatusKey(botName) {
  return redisKey('bot', botName, 'status');
}

async function setBotStatus(botName, status, ttlSeconds = 3600) {
  return cacheSet(botStatusKey(botName), status, ttlSeconds);
}

async function getBotStatus(botName) {
  return cacheGet(botStatusKey(botName));
}

async function withRedisLock(key, ttlMs, fn) {
  const redis = await ensureRedis();
  if (!redis) return fn({ locked: false, lockKey: key });
  const token = `${process.pid}-${Date.now()}-${Math.random()}`;
  const acquired = await redis.set(key, token, { NX: true, PX: ttlMs });
  if (!acquired) return { skipped: true, locked: true, message: 'Task is already running.' };
  try {
    return await fn({ locked: true, lockKey: key });
  } finally {
    const current = await redis.get(key).catch(() => '');
    if (current === token) await redis.del(key).catch(() => undefined);
  }
}

function createRedisRateLimitStore(name) {
  return {
    prefix: redisKey('rl', name),
    localKeys: false,
    init(options) {
      this.windowMs = options.windowMs;
    },
    async increment(key) {
      const redis = await ensureRedis();
      if (!redis) throw new Error(disabledReason || 'Redis unavailable');
      const redisKeyValue = `${this.prefix}:${key}`;
      const totalHits = await redis.incr(redisKeyValue);
      if (totalHits === 1) await redis.pExpire(redisKeyValue, this.windowMs);
      const ttl = await redis.pTTL(redisKeyValue);
      return {
        totalHits,
        resetTime: new Date(Date.now() + Math.max(ttl, this.windowMs)),
      };
    },
    async decrement(key) {
      const redis = await ensureRedis();
      if (!redis) return;
      await redis.decr(`${this.prefix}:${key}`).catch(() => undefined);
    },
    async resetKey(key) {
      const redis = await ensureRedis();
      if (!redis) return;
      await redis.del(`${this.prefix}:${key}`).catch(() => undefined);
    },
  };
}

function redisStatus() {
  return {
    configured: Boolean(redisUrl),
    connected: Boolean(client?.isOpen),
    prefix: redisPrefix,
    disabledReason,
  };
}

module.exports = {
  cacheDel,
  cacheDelPattern,
  cacheGet,
  cacheSet,
  createRedisRateLimitStore,
  ensureRedis,
  getBotStatus,
  redisKey,
  redisStatus,
  sessionDelUser,
  sessionGetUser,
  sessionSetUser,
  setBotStatus,
  withRedisLock,
};