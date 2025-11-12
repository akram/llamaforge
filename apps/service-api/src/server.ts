import Fastify from 'fastify';
import { Queue } from 'bullmq';
import { createConnection } from './libs/redis.js';
import { githubWebhookRoute } from './routes/githubWebhook.js';
import { jobsRoutes } from './routes/jobs.js';
import { getEnv } from './libs/env.js';

const env = getEnv();
const app = Fastify({ logger: true });

// Initialize Redis connection
const redis = createConnection();

// Initialize BullMQ queue
export const prTestQueue = new Queue('pr-test-generation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Health check
app.get('/health', async () => {
  return { status: 'ok', service: 'service-api' };
});

// Register routes
app.register(githubWebhookRoute, { prefix: '/events' });
app.register(jobsRoutes, { prefix: '/jobs' });

// Graceful shutdown
const shutdown = async () => {
  app.log.info('Shutting down gracefully...');
  await app.close();
  await prTestQueue.close();
  await redis.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const start = async () => {
  try {
    await app.listen({ port: env.PORT || 3000, host: '0.0.0.0' });
    app.log.info(`Service API listening on port ${env.PORT || 3000}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

