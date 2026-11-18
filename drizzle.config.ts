import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'turso',
  schema: './src/db/relations.ts',
  out: './drizzle/migrations',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? 'file:local.db',
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  },
  strict: false,
  verbose: true,
});
