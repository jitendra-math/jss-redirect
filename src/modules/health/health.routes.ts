import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import type { AppEnv } from '../../types/hono-env.js';

const routes = new Hono<AppEnv>();

routes.get('/health', (c) => c.json({ status: 'ok', service: 'jss-redirect' }));

routes.get('/health/ready', async (c) => {
  await db.run(sql`select 1`);
  return c.json({ status: 'ready', service: 'jss-redirect' });
});

export { routes as healthRoutes };
