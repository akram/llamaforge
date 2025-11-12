import type { FastifyBaseLogger } from 'fastify';
import { getEnv } from './env.js';

const env = getEnv();

export function createLogger(): FastifyBaseLogger {
  // In production, integrate with structured logging (e.g., Winston, Pino with transports)
  // For now, return a simple logger interface
  return {
    info: (obj: unknown, msg?: string) => {
      const logObj = typeof obj === 'object' && obj !== null ? obj : { data: obj };
      console.log(JSON.stringify({ level: 'info', ...logObj, msg }));
    },
    error: (obj: unknown, msg?: string) => {
      const logObj = typeof obj === 'object' && obj !== null ? obj : { data: obj };
      console.error(JSON.stringify({ level: 'error', ...logObj, msg }));
    },
    warn: (obj: unknown, msg?: string) => {
      const logObj = typeof obj === 'object' && obj !== null ? obj : { data: obj };
      console.warn(JSON.stringify({ level: 'warn', ...logObj, msg }));
    },
    debug: (obj: unknown, msg?: string) => {
      if (env.LOG_LEVEL === 'debug') {
        const logObj = typeof obj === 'object' && obj !== null ? obj : { data: obj };
        console.debug(JSON.stringify({ level: 'debug', ...logObj, msg }));
      }
    },
  } as FastifyBaseLogger;
}

