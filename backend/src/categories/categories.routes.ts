import { Router, type RequestHandler } from 'express';
import type { Db } from 'mongodb';
import { requireSession } from '../auth/require-session.js';
import { emptySchema } from '../auth/sessions.schemas.js';
import type { createSessionsService } from '../auth/sessions.service.js';
import { ApiError } from '../shared/http/api-error.js';
import { createCategorySchema } from './categories.schemas.js';
import { createCategoriesService } from './categories.service.js';

export function categoriesRoutes(
  db: Db,
  sessions: ReturnType<typeof createSessionsService>,
  clock: () => Date = () => new Date(),
) {
  const router = Router({ caseSensitive: true, strict: true });
  const service = createCategoriesService(db, clock);
  const protect = requireSession(sessions);
  const json: RequestHandler = (req, _res, next) => {
    if (!req.is('application/json'))
      throw new ApiError('UNSUPPORTED_MEDIA_TYPE', 'Se requiere JSON.');
    next();
  };
  router.get('/categories', protect, async (req, res) => {
    emptySchema.parse(req.query);
    if (req.body !== undefined) emptySchema.parse(req.body);
    res.json(await service.list());
  });
  router.post('/categories', protect, json, async (req, res) => {
    emptySchema.parse(req.query);
    const { name } = createCategorySchema.parse(req.body);
    res.status(201).json(await service.create(name));
  });
  return router;
}
