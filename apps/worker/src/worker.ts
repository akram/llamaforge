import { Worker } from 'bullmq';
import { createConnection } from './libs/redis.js';
import { processPRTestGeneration } from './processors/prTestGeneration.js';
import { initDb } from './libs/db.js';
import { getEnv } from './libs/env.js';

const env = getEnv();
const redis = createConnection();

// Initialize database
await initDb();

// Create worker
const worker = new Worker(
  'pr-test-generation',
  async (job) => {
    console.log(`Processing job ${job.id}`, job.data);
    return await processPRTestGeneration(job.data, job);
  },
  {
    connection: redis,
    concurrency: 5, // Process up to 5 jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // per minute
    },
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('Worker started, waiting for jobs...');

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down worker...');
  await worker.close();
  await redis.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

