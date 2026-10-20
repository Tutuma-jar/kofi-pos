import express, { Router, type Request, type RequestHandler } from 'express';
import type { Db } from 'mongodb';
import { requireSession } from '../auth/require-session.js';
import { emptySchema } from '../auth/sessions.schemas.js';
import type { createSessionsService } from '../auth/sessions.service.js';
import { ApiError } from '../shared/http/api-error.js';
import type { ImageStore } from './image-store.js';
import { IMAGE_MAX_BYTES, imageContentTypes } from './product-images.js';
import {
  parseCreateProduct,
  parseUpdateProduct,
  productParamsSchema,
} from './products.schemas.js';
import { createProductsService } from './products.service.js';

function productId(req: Request): string {
  const parsed = productParamsSchema.safeParse(req.params);
  // A malformed identity cannot exist: same answer as an unknown one.
  if (!parsed.success)
    throw new ApiError('NOT_FOUND', 'Recurso no encontrado.');
  return parsed.data.id;
}
function noInput(req: Request) {
  emptySchema.parse(req.query);
  if (req.body !== undefined) emptySchema.parse(req.body);
}

export function productsRoutes(
  db: Db,
  sessions: ReturnType<typeof createSessionsService>,
  images: ImageStore,
  clock: () => Date = () => new Date(),
) {
  const router = Router({ caseSensitive: true, strict: true });
  const service = createProductsService(db, images, clock);
  const protect = requireSession(sessions);
  const json: RequestHandler = (req, _res, next) => {
    if (!req.is('application/json'))
      throw new ApiError('UNSUPPORTED_MEDIA_TYPE', 'Se requiere JSON.');
    next();
  };
  // Own transport and limit for images; the declared type is never trusted.
  const binary: RequestHandler = (req, _res, next) => {
    if (!req.is('application/octet-stream'))
      throw new ApiError(
        'UNSUPPORTED_MEDIA_TYPE',
        'Se requiere application/octet-stream.',
      );
    next();
  };
  const raw = express.raw({
    type: 'application/octet-stream',
    limit: IMAGE_MAX_BYTES,
  });

  router.get('/products', protect, async (req, res) => {
    noInput(req);
    res.json(await service.list());
  });
  router.get('/products/:id', protect, async (req, res) => {
    const id = productId(req);
    noInput(req);
    res.json(await service.get(id));
  });
  router.post('/products', protect, json, async (req, res) => {
    emptySchema.parse(req.query);
    const input = parseCreateProduct(req.body);
    res.status(201).json(await service.create(input));
  });
  // Edition (TASK-018): `version` in the body; stale -> 409 VERSION_CONFLICT.
  router.patch('/products/:id', protect, json, async (req, res) => {
    const id = productId(req);
    emptySchema.parse(req.query);
    const input = parseUpdateProduct(req.body);
    res.json(await service.update(id, input));
  });
  router.post('/product-images', protect, binary, raw, async (req, res) => {
    emptySchema.parse(req.query);
    const body: unknown = req.body;
    const bytes = Buffer.isBuffer(body) ? body : Buffer.alloc(0);
    res.status(201).json(await service.uploadImage(bytes));
  });
  router.get('/product-images/:id', protect, async (req, res) => {
    const id = productId(req);
    noInput(req);
    const image = await service.readImage(id);
    res.set({
      'Content-Type': imageContentTypes[image.format],
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    res.send(image.bytes);
  });
  return router;
}
