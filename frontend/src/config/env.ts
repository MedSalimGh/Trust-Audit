import { z } from 'zod';

/**
 * Zod-validated environment config.
 * Fails fast with clear error if env vars are misconfigured.
 */
const envSchema = z.object({
  VITE_API_URL: z.string().url().default('http://127.0.0.1:8000'),
  VITE_CHAIN_ID: z.coerce.number().int().positive().default(1337),
  VITE_RPC_URL: z.string().url().default('http://127.0.0.1:8545'),
});

function getEnvConfig() {
  const raw = {
    VITE_API_URL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000',
    VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID ?? 1337,
    VITE_RPC_URL: import.meta.env.VITE_RPC_URL ?? 'http://127.0.0.1:8545',
  };

  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    console.error(
      '❌ Invalid environment configuration:',
      parsed.error.flatten().fieldErrors
    );
    throw new Error('Invalid environment configuration. Check your .env file.');
  }

  return parsed.data;
}

export const env = getEnvConfig();
