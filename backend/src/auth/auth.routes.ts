import { Router, type RequestHandler } from 'express';
import type { Db } from 'mongodb';
import { ApiError } from '../shared/http/api-error.js';
import {
  createAuthService,
  createCredentialRateLimiter,
} from './auth.service.js';
import { readAuthorization, requireSession } from './require-session.js';
import { sessionDto, type Session } from './session.model.js';
import { emptySchema, loginSchema } from './sessions.schemas.js';
import { createSessionsService } from './sessions.service.js';

export function authRoutes(
  db: Db,
  clock: () => Date,
  sharedSessions?: ReturnType<typeof createSessionsService>,
) {
  const router = Router({ caseSensitive: true, strict: true });
  const credentials = createAuthService(db, {
    rateLimiter: createCredentialRateLimiter({ now: () => clock().getTime() }),
  });
  const sessions = sharedSessions ?? createSessionsService(db, clock);
  const json: RequestHandler = (req, _res, next) => {
    if (!req.is('application/json'))
      throw new ApiError('UNSUPPORTED_MEDIA_TYPE', 'Se requiere JSON.');
    next();
  };
  router.post('/sessions', json, async (req, res) => {
    const { username, password, tabBinding } = loginSchema.parse(req.body);
    const result = await credentials.verifyCredentials(
      { username, password },
      req.ip ?? req.socket.remoteAddress ?? 'unknown',
    );
    if (result.status === 'incorrect')
      throw new ApiError('INVALID_CREDENTIALS', 'Credenciales incorrectas.');
    if (result.status === 'rate-limited')
      throw new ApiError(
        'AUTH_RATE_LIMITED',
        'Intente más tarde.',
        undefined,
        result.retryAfterSeconds,
      );
    res
      .status(201)
      .json(await sessions.create(result.accountId, username, tabBinding));
  });
  // Every subsequent /api route requires a currently valid session.
  router.use((req, _res, next) => {
    const known =
      (req.path === '/sessions/current' &&
        ['GET', 'DELETE'].includes(req.method)) ||
      (req.path === '/sessions/current/presences' && req.method === 'POST');
    if (!known) throw new ApiError('NOT_FOUND', 'Recurso no encontrado.');
    next();
  });
  router.use(requireSession(sessions));
  router.get('/sessions/current', (req, res) => {
    if (req.body !== undefined) emptySchema.parse(req.body);
    res.json(sessionDto(res.locals.session as Session));
  });
  router.post('/sessions/current/presences', json, async (req, res) => {
    emptySchema.parse(req.body);
    res.json(await sessions.presence(readAuthorization(req)));
  });
  router.delete('/sessions/current', async (req, res) => {
    if (req.body !== undefined) emptySchema.parse(req.body);
    await sessions.revoke(readAuthorization(req));
    res.status(204).end();
  });
  return router;
}
