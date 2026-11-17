import { z } from 'zod';

const httpsUrl = z.url().refine((value) => new URL(value).protocol === 'https:', {
  message: 'Must be an HTTPS URL',
});

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TURSO_DATABASE_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z.string().optional().default(''),
  INTERNAL_API_KEY: z.string().min(32),
  WHATSAPP_PHONE_NUMBER: z.string().regex(/^\d{8,15}$/).default('918000938427'),
  GITHUB_PROFILE_URL: httpsUrl.default('https://github.com/jitendra-math'),
  GITHUB_WORK_URL: httpsUrl.default('https://github.com/jitendra-math/WhatsApp-Business-API'),
  WEBSITE_URL: httpsUrl.default('https://jitubanna.com/'),
  TRACKING_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(3650).default(180),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).max(3600000).default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(10000).default(30),
});

export type AppConfig = z.infer<typeof envSchema>;

let cachedConfig: AppConfig | undefined;

export function getEnv(): AppConfig {
  cachedConfig ??= envSchema.parse(process.env);
  return cachedConfig;
}
