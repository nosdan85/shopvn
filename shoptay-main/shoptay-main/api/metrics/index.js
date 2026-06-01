const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const ticketCreatedTotal = new client.Counter({
  name: 'ticket_created_total',
  help: 'Total tickets created',
  labelNames: ['payment_method'],
  registers: [register],
});

const ticketCreationDuration = new client.Histogram({
  name: 'ticket_creation_duration_seconds',
  help: 'Time to create a ticket',
  labelNames: ['status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

const discordApiRequests = new client.Counter({
  name: 'discord_api_requests_total',
  help: 'Total Discord API requests',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [register],
});

const discordApiDuration = new client.Histogram({
  name: 'discord_api_duration_seconds',
  help: 'Discord API response time',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

const rateLimitHits = new client.Gauge({
  name: 'rate_limit_hits_active',
  help: 'Number of active rate limit cooldowns',
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: 'discord_gateway_active_connections',
  help: 'Active Discord gateway connections',
  registers: [register],
});

const queueSize = new client.Gauge({
  name: 'ticket_queue_size',
  help: 'Current ticket queue size',
  labelNames: ['state'],
  registers: [register],
});

const slotCacheHits = new client.Counter({
  name: 'slot_cache_hits_total',
  help: 'Total slot cache hits',
  registers: [register],
});

const slotCacheMisses = new client.Counter({
  name: 'slot_cache_misses_total',
  help: 'Total slot cache misses',
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const getMetrics = async () => {
  return register.metrics();
};

const getContentType = () => {
  return register.contentType;
};

module.exports = {
  ticketCreatedTotal,
  ticketCreationDuration,
  discordApiRequests,
  discordApiDuration,
  rateLimitHits,
  activeConnections,
  queueSize,
  slotCacheHits,
  slotCacheMisses,
  httpRequestDuration,
  getMetrics,
  getContentType,
  register,
};

