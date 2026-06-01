const { Worker } = require('bullmq');
const { ticketCreatedTotal, ticketCreationDuration } = require('../metrics');
const { createTicketChannel } = require('../bot/utils/channels');
const { client } = require('../bot');

const processJob = async (job) => {
  const timer = ticketCreationDuration.startTimer();
  try {
    const { orderId, discordId, items, guildId } = job.data;
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      throw new Error(`Guild ${guildId} not found`);
    }
    
    const channelId = await createTicketChannel({
      channelName: `ticket-${orderId}`,
      customerId: discordId,
      guild,
    });
    
    ticketCreatedTotal.inc({ payment_method: job.data.paymentMethod || 'unknown' });
    timer({ status: 'success' });
    return { success: true, channelId };
  } catch (err) {
    timer({ status: 'error' });
    throw err;
  }
};

const startWorker = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    const worker = new Worker('ticket-creation', processJob, {
      connection: new (require('ioredis'))(redisUrl),
      concurrency: 3,
    });
    
    worker.on('completed', (job) => {
      console.log(`[WORKER] Job ${job.id} completed`);
    });
    
    worker.on('failed', (job, err) => {
      console.error(`[WORKER] Job ${job?.id} failed:`, err.message);
    });
    
    worker.on('error', (err) => {
      console.error('[WORKER] Worker error:', err.message);
    });
    
    console.log('[WORKER] Ticket worker started, listening for jobs');
  } catch (err) {
    console.error('[WORKER] Failed to start worker:', err.message);
  }
};

startWorker().catch(console.error);
