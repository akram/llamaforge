import type { FastifyBaseLogger } from 'fastify';
import { getEnv } from './env.js';

const env = getEnv();

export function createLogger(): FastifyBaseLogger {
  // In production, integrate with structured logging (e.g., Winston, Pino with transports)
  // For now, return a simple logger interface
  return {
    info: (obj: unknown, msg?: string) => console.log(JSON.stringify({ level: 'info', ...obj, msg })),
    error: (obj: unknown, msg?: string) => console.error(JSON.stringify({ level: 'error', ...obj, msg })),
    warn: (obj: unknown, msg?: string) => console.warn(JSON.stringify({ level: 'warn', ...obj, msg })),
    debug: (obj: unknown, msg?: string) => {
      if (env.LOG_LEVEL === 'debug') {
        console.debug(JSON.stringify({ level: 'debug', ...obj, msg }));
      }
    },
  } as FastifyBaseLogger;
}

