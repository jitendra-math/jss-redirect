import { Hono } from 'hono';
import { errorHandler } from './middleware/error-handler.middleware';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { healthRoutes } from './modules/health/health.routes';
import { redirectRoutes } from './modules/redirects/redirect.routes';
import { trackingRoutes } from './modules/tracking/tracking.routes';
import type { AppEnv } from './types/hono-env';

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
