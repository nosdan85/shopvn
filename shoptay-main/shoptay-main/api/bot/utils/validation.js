const { SNOWFLAKE_PATTERN } = require('../config');

const isSnowflake = (value) => SNOWFLAKE_PATTERN.test(String(value || '').trim());
const truncateText = (value, max = 300) => String(value || '').slice(0, Math.max(0, Number(max) || 0));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeRetryAfterSeconds = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n > 1000) return Math.ceil(n / 1000);
  return Math.ceil(n);
};

module.exports = { isSnowflake, truncateText, sleep, normalizeRetryAfterSeconds };
