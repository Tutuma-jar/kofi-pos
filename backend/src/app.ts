import express from 'express';
import type { Db } from 'mongodb';
import { authRoutes } from './auth/auth.routes.js';
import { emptySchema } from './auth/sessions.schemas.js';
import { errorHandler } from './shared/http/error-handler.js';
import { notFound } from './shared/http/not-found.js';
import { createSessionsService } from './auth/sessions.service.js';
import { createDashboardEvents } from './dashboard/dashboard-events.js';
import { dashboardRoutes } from './dashboard/dashboard.routes.js';
import type { DashboardSource } from './dashboard/dashboard.contract.js';
import { createDashboardDemo } from './dashboard/dashboard-demo.js';

export function createApp(options?: {
  db: Db;
  clock?: () => Date;
  dashboardSource?: DashboardSource;
  dashboardDemo?: boolean;
}) {
  const app = express();

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
  if (options) {
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
    app.use('/api', authRoutes(options.db, clock, sessions));
  }
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
