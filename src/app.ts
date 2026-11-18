import { Hono } from 'hono';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { redirectRoutes } from './modules/redirects/redirect.routes.js';
import { trackingRoutes } from './modules/tracking/tracking.routes.js';
import type { AppEnv } from './types/hono-env.js';

const app = new Hono<AppEnv>();

app.use('*', requestIdMiddleware);
app.onError(errorHandler);
app.notFound((c) => c.json({
  error: {
    code: 'NOT_FOUND',
    message: 'The requested route was not found.',
  },
  requestId: c.get('requestId'),
}, 404));

app.get('/', (c) => c.json({ service: 'jss-redirect', status: 'ok' }));
app.route('/', healthRoutes);
app.route('/', redirectRoutes);
app.route('/api/tracking', trackingRoutes);
app.route('/api/analytics', analyticsRoutes);

export default app;
