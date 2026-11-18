import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { getEnv } from '../config/env.js';
import * as schema from './relations.js';

const env = getEnv();

export const libsqlClient = createClient({
  url: env.TURSO_DATABASE_URL,
  ...(env.TURSO_AUTH_TOKEN ? { authToken: env.TURSO_AUTH_TOKEN } : {}),
});

export const db = drizzle(libsqlClient, { schema });
