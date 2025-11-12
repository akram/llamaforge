import Redis from 'ioredis';
import { getEnv } from './env.js';

const env = getEnv();

export function createConnection(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
}

