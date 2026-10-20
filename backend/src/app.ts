import express from 'express';
import type { Db } from 'mongodb';
import { authRoutes } from './auth/auth.routes.js';
import { emptySchema } from './auth/sessions.schemas.js';
import { errorHandler } from './shared/http/error-handler.js';
import { notFound } from './shared/http/not-found.js';

export function createApp(options?: { db: Db; clock?: () => Date }) {
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
  if (options)
    app.use(
      '/api',
      authRoutes(options.db, options.clock ?? (() => new Date())),
    );
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
