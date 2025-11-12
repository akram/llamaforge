import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // GitHub
  GITHUB_APP_ID: z.string().transform(Number),
  GITHUB_PRIVATE_KEY: z.string(),

  // LlamaStack
  LLAMA_URL: z.string().url().default('https://api.llamastack.com/v1'),
  LLAMA_API_KEY: z.string(),
  LLAMA_MODEL: z.string().default('llama-3.1-70b'),
  LLAMA_MAX_TOKENS: z.string().transform(Number).default('4096'),

  // Queue & Database
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  DATABASE_URL: z.string().url(),

  // Feature Flags
  DRY_RUN: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1'),

  // Observability
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
}

