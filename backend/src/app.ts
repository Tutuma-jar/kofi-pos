import express from 'express';
import type { Db } from 'mongodb';
import { authRoutes } from './auth/auth.routes.js';
import { categoriesRoutes } from './categories/categories.routes.js';
import { emptySchema } from './auth/sessions.schemas.js';
import { errorHandler } from './shared/http/error-handler.js';
import { frontendRoutes } from './shared/http/frontend.js';
import { notFound } from './shared/http/not-found.js';
import { createSessionsService } from './auth/sessions.service.js';
import { createDashboardEvents } from './dashboard/dashboard-events.js';
import { dashboardRoutes } from './dashboard/dashboard.routes.js';
import type { DashboardSource } from './dashboard/dashboard.contract.js';
import { createDashboardDemo } from './dashboard/dashboard-demo.js';
import { productsRoutes } from './products/products.routes.js';
import type { ImageStore } from './products/image-store.js';

export function createApp(options?: {
  // API routes are mounted only with a database.
  db?: Db;
  clock?: () => Date;
  dashboardSource?: DashboardSource;
  dashboardDemo?: boolean;
  // Product routes are mounted only with an image volume (server always has one).
  productImages?: ImageStore;
  // Reverse proxy hops (TRUST_PROXY); 0 keeps req.ip as the socket address.
  trustProxy?: number;
  // Built SPA (FRONTEND_DIST_DIR); omitted in development, where Vite serves it.
  frontendDir?: string;
}) {
  const app = express();

  app.set('trust proxy', options?.trustProxy ?? 0);
  app.disable('x-powered-by');
  app.disable('etag');
  app.enable('case sensitive routing');
  app.enable('strict routing');
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', express.json({ limit: '100kb' }));
  app.use('/api', (req, _res, next) => {
    emptySchema.parse(req.query);
    next();
  });
  if (options?.db) {
    const clock = options.clock ?? (() => new Date());
    const demo =
      options.dashboardDemo && !options.dashboardSource
        ? createDashboardDemo(clock)
        : undefined;
    const sessions = createSessionsService(options.db, clock, (id) =>
      events.revoke(id),
    );
    const events = createDashboardEvents(sessions, clock, () => demo?.stop());
    demo?.start(
      () => events.publishSimulatedChange(),
      () => events.size > 0,
    );
    app.locals.dashboardEvents = events;
    app.use(
      '/api',
      dashboardRoutes(
        options.db,
        sessions,
        events,
        options.dashboardSource,
        clock,
        demo,
      ),
    );
    // Before authRoutes: its fallback answers any other /api path with 404.
    app.use('/api', categoriesRoutes(options.db, sessions, clock));
    if (options.productImages)
      app.use(
        '/api',
        productsRoutes(options.db, sessions, options.productImages, clock),
      );
    app.use('/api', authRoutes(options.db, clock, sessions));
  }
  if (options?.frontendDir) app.use(frontendRoutes(options.frontendDir));
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
