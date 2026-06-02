const { Queue } = require('bullmq');
const Redis = require('ioredis');

let ticketQueue = null;
let queueAvailable = false;

const createConnection = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    connectTimeout: 3000,
    commandTimeout: 2000,
  });
};

const createTicketQueue = () => {
  try {
    const queue = new Queue('ticket-creation', {
      connection: createConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    queue.waitUntilReady().then(() => {
      console.log('[QUEUE] Ticket queue ready');
      queueAvailable = true;
    }).catch((err) => {
      console.warn('[QUEUE] Queue error (falling back to direct):', err.message);
      queueAvailable = false;
    });

    queue.on('error', (err) => {
      console.warn('[QUEUE] Queue error (falling back to direct):', err.message);
      queueAvailable = false;
    });

    return queue;
  } catch (err) {
    console.warn('[QUEUE] Failed to create queue:', err.message);
    return null;
  }
};

const getQueue = () => {
  if (!ticketQueue) {
    ticketQueue = createTicketQueue();
  }
  return ticketQueue;
};

const isAvailable = () => queueAvailable;

const addTicketJob = async (data) => {
  try {
    if (!isAvailable()) return null;
    const job = await getQueue().add('create', data);
    return { jobId: job.id, queued: true };
  } catch (err) {
    console.error('[QUEUE] Failed to add ticket job:', err.message);
    return null;
  }
};

const getQueueStats = async () => {
  try {
    if (!isAvailable()) return null;
    const [waiting, active, completed, failed] = await Promise.all([
      getQueue().getWaitingCount(),
      getQueue().getActiveCount(),
      getQueue().getCompletedCount(),
      getQueue().getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  } catch {
    return null;
  }
};

module.exports = {
  getQueue,
  isAvailable,
  addTicketJob,
  getQueueStats,
};
