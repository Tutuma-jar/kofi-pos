import { Router, type Request, type RequestHandler } from 'express';
import type { Db } from 'mongodb';
import { requireSession } from '../auth/require-session.js';
import { emptySchema } from '../auth/sessions.schemas.js';
import type { createSessionsService } from '../auth/sessions.service.js';
import { ApiError } from '../shared/http/api-error.js';
import {
  categoryParamsSchema,
  createCategorySchema,
  deleteCategorySchema,
  updateCategorySchema,
} from './categories.schemas.js';
import { createCategoriesService } from './categories.service.js';

function categoryId(req: Request): string {
  const parsed = categoryParamsSchema.safeParse(req.params);
  // A malformed identity cannot exist: same answer as an unknown one.
  if (!parsed.success)
    throw new ApiError('NOT_FOUND', 'Recurso no encontrado.');
  return parsed.data.id;
}

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
  // Renaming (TASK-020): `{ version, name }`; stale -> 409 VERSION_CONFLICT.
  router.patch('/categories/:id', protect, json, async (req, res) => {
    const id = categoryId(req);
    emptySchema.parse(req.query);
    const input = updateCategorySchema.parse(req.body);
    res.json(await service.rename(id, input));
  });
  // Deletion (TASK-020): `{ version }` in a JSON body (queries are rejected
  // globally); stale -> 409 VERSION_CONFLICT, with products -> 409
  // CATEGORY_NOT_EMPTY; success -> 204.
  router.delete('/categories/:id', protect, json, async (req, res) => {
    const id = categoryId(req);
    emptySchema.parse(req.query);
    const input = deleteCategorySchema.parse(req.body);
    await service.remove(id, input);
    res.status(204).end();
  });
  return router;
}
