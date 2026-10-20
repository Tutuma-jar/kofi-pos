import { Router, type Request } from 'express';
import type { Db } from 'mongodb';
import { readAuthorization, requireSession } from '../auth/require-session.js';
import type { Session } from '../auth/session.model.js';
import type { createSessionsService } from '../auth/sessions.service.js';
import type { DashboardSource } from './dashboard.contract.js';
import type { createDashboardEvents } from './dashboard-events.js';
import {
  dashboardParamsSchema,
  noDashboardInputSchema,
} from './dashboard.schemas.js';
import { createDashboardService } from './dashboard.service.js';
import type { createDashboardDemo } from './dashboard-demo.js';

function noBody(req: Request) {
  if (
    req.body !== undefined ||
    Number(req.get('Content-Length') ?? 0) > 0 ||
    req.get('Transfer-Encoding')
  )
    noDashboardInputSchema.parse({ body: true });
}

export function dashboardRoutes(
  db: Db,
  sessions: ReturnType<typeof createSessionsService>,
  events: ReturnType<typeof createDashboardEvents>,
  source?: DashboardSource,
  clock = () => new Date(),
  demo?: ReturnType<typeof createDashboardDemo>,
) {
  const router = Router({ caseSensitive: true, strict: true });
  const service = createDashboardService(db, source, clock);
  const protect = requireSession(sessions);
  router.get('/dashboard-periods/:period', protect, async (req, res) => {
    const { period } = dashboardParamsSchema.parse(req.params);
    noDashboardInputSchema.parse(req.query);
    noBody(req);
    if (demo) res.set('X-Kofi-Dashboard-Mode', 'demo');
    res.json(await (demo ?? service).read(period));
  });
  router.get('/dashboard-events', protect, (req, res) => {
    noDashboardInputSchema.parse(req.query);
    noBody(req);
    res.status(200).set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    events.subscribe(
      res,
      readAuthorization(req),
      res.locals.session as Session,
    );
  });
  return router;
}
