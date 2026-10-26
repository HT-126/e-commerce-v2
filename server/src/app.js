import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import adminRoutes from './routes/admin.routes.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import cartRoutes from './routes/cart.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import filtersRoutes from './routes/filters.routes.js';
import healthRoutes from './routes/health.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import productsRoutes from './routes/products.routes.js';
import reviewsRoutes from './routes/reviews.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createRateLimiters } from './middleware/rate-limit.js';

// Helmet's defaults suit an API. The site's pages come from here too when the client is served (below), and its
// product photos live on other hosts (cdn.shopify.com, livostyle.com), so images may come from any https address.
// "Upgrade insecure requests" only makes sense on HTTPS: on plain http://localhost it would send the page's own
// scripts to https and break it, so it is on only when cookies are secure (a real HTTPS deployment).
function securityHeaders(secure) {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': ["'self'", 'data:', 'https:'],
        'upgrade-insecure-requests': secure ? [] : null,
      },
    },
  });
}

// Builds the app without listening, so tests can use it with Supertest. Every app gets its own rate limiters.
// `trustProxy`: the number of proxies in front of the API (null: none). Tests set it to send X-Forwarded-For.
// `clientDir`: the built client (a folder with index.html). When given, the app serves it too, so one server
// gives the site and the API. `secure`: whether the site runs on HTTPS (see securityHeaders).
export function createApp({ trustProxy = env.TRUST_PROXY, clientDir = null, secure = env.COOKIE_SECURE } = {}) {
  const app = express();

  // Only behind a real proxy. Trusting X-Forwarded-For without one lets anyone fake their IP.
  if (trustProxy !== null) app.set('trust proxy', trustProxy);

  app.use(securityHeaders(secure));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/health', healthRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/auth', createAuthRoutes(createRateLimiters()));
  app.use('/api/cart', cartRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/filters', filtersRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/products/:slug/reviews', reviewsRoutes);
  app.use('/api/products', productsRoutes);

  if (clientDir) serveClient(app, path.resolve(clientDir));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// The built client: its files, and `index.html` for every other page address, so a refresh on /products/x
// still opens the app (React Router then shows the page). A path under /api that no route answered is not a
// page: it falls through to the JSON 404 below.
function serveClient(app, dir) {
  app.use(express.static(dir));
  app.get(/^\/(?!api(\/|$))/, (req, res) => res.sendFile(path.join(dir, 'index.html')));
}
