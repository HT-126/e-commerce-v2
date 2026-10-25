import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import categoriesRoutes from './routes/categories.routes.js';
import filtersRoutes from './routes/filters.routes.js';
import healthRoutes from './routes/health.routes.js';
import productsRoutes from './routes/products.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

// Builds the app without listening, so tests can use it with Supertest.
export function createApp() {
  const app = express();

  // Only behind a real proxy. Trusting X-Forwarded-For without one lets anyone fake their IP.
  if (env.TRUST_PROXY !== null) app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/health', healthRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/filters', filtersRoutes);
  app.use('/api/products', productsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
