import type { Request, RequestHandler } from 'express';
import { ApiError } from '../shared/http/api-error.js';
import { opaqueSecretSchema } from './sessions.schemas.js';
import type {
  createSessionsService,
  SessionAuthorization,
} from './sessions.service.js';

export function readAuthorization(req: Request): SessionAuthorization {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
    req.get('Authorization') ?? '',
  );
  const binding = opaqueSecretSchema.safeParse(req.get('X-Tab-Authorization'));
  if (!match?.[1] || !binding.success)
    throw new ApiError('UNAUTHORIZED', 'Autorización requerida.');
  return { token: match[1], binding: binding.data };
}
export function requireSession(
  service: ReturnType<typeof createSessionsService>,
): RequestHandler {
  return async (req, res, next) => {
    const auth = readAuthorization(req);
    res.locals.session = await service.current(auth);
    next();
  };
}
