const Redis = require('ioredis');

let redisClient = null;
let redisAvailable = false;

const createRedisClient = () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 3000,
      commandTimeout: 2000,
    });

    client.on('connect', () => {
      console.log('[REDIS] Connected to Redis');
      redisAvailable = true;
    });

    client.on('error', (err) => {
      console.warn('[REDIS] Connection error (falling back to no-cache):', err.message);
      redisAvailable = false;
    });

    client.on('close', () => {
      redisAvailable = false;
    });

    client.connect().catch((err) => {
      console.warn('[REDIS] Initial connection failed (falling back to no-cache):', err.message);
      redisAvailable = false;
    });

    return client;
  } catch (err) {
    console.warn('[REDIS] Failed to create client:', err.message);
    return null;
  }
};

const getRedis = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

const isAvailable = () => redisAvailable;

const cacheGet = async (key, fallback = null) => {
  try {
    if (!isAvailable()) return fallback;
    const val = await getRedis().get(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const cacheSet = async (key, value, ttlSeconds = 300) => {
  try {
    if (!isAvailable()) return false;
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const cacheDel = async (key) => {
  try {
    if (!isAvailable()) return false;
    await getRedis().del(key);
    return true;
  } catch {
    return false;
  }
};

const cacheDelPattern = async (pattern) => {
  try {
    if (!isAvailable()) return false;
    const keys = await getRedis().keys(pattern);
    if (keys.length > 0) {
      await getRedis().del(...keys);
    }
    return true;
  } catch {
    return false;
  }
};

const DEFAULT_BITMAP_SIZE = 1 << 24;

const bitmapOffsetFromHash = (hash, bitmapSize = DEFAULT_BITMAP_SIZE) => {
  const safeSize = Math.max(1, Math.floor(Number(bitmapSize) || DEFAULT_BITMAP_SIZE));
  const hex = String(hash || '').replace(/[^a-fA-F0-9]/g, '');
  const slice = (hex || '0').slice(0, 16);
  return Number(BigInt(`0x${slice || '0'}`) % BigInt(safeSize));
};

const bitmapCheckAndSet = async (key, offset) => {
  try {
    if (!isAvailable()) return null;
    const safeOffset = Math.max(0, Math.floor(Number(offset) || 0));
    const client = getRedis();
    const previous = await client.getbit(key, safeOffset);
    if (Number(previous) === 1) {
      return { alreadySet: true };
    }
    await client.setbit(key, safeOffset, 1);
    return { alreadySet: false };
  } catch {
    return null;
  }
};

module.exports = {
  getRedis,
  isAvailable,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  bitmapOffsetFromHash,
  bitmapCheckAndSet,
};

