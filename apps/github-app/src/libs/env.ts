import { z } from 'zod';

const envSchema = z.object({
  GITHUB_APP_ID: z.string().transform(Number),
  GITHUB_PRIVATE_KEY: z.string(),
  GITHUB_WEBHOOK_SECRET: z.string(),
  PORT: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  SERVICE_API_URL: z.string().url().default('http://localhost:3000'),
  SERVICE_HMAC_SECRET: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
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

