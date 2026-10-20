import { EventEmitter } from 'node:events';
import type { Server } from 'node:http';
import type { Response } from 'express';
import { ObjectId } from 'mongodb';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
  vi,
} from 'vitest';
import { createApp } from '../app.js';
import { createSessionsService } from '../auth/sessions.service.js';
import type { Session } from '../auth/session.model.js';
import { createDashboardEvents } from './dashboard-events.js';
import {
  isolatedDashboardDatabase,
  testSession,
} from './dashboard.test-support.js';

let database: Awaited<ReturnType<typeof isolatedDashboardDatabase>>;
let app: ReturnType<typeof createApp>;
let server: Server;
let origin: string;
let session: Awaited<ReturnType<typeof testSession>>;
let events: ReturnType<typeof createDashboardEvents>;
const aborts: AbortController[] = [];
beforeAll(async () => {
  database = await isolatedDashboardDatabase();
}, 30_000);
beforeEach(async () => {
  session = await testSession(database.db, () => new Date());
  app = createApp({ db: database.db });
  events = app.locals.dashboardEvents as typeof events;
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing address');
  origin = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  vi.useRealTimers();
  aborts.splice(0).forEach((abort) => abort.abort());
  events.close();
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
afterAll(async () => {
  await database?.cleanup();
});
async function stream() {
  const abort = new AbortController();
  aborts.push(abort);
  const response = await fetch(`${origin}/api/dashboard-events`, {
    headers: { ...session.headers, Accept: 'text/event-stream' },
    signal: abort.signal,
  });
  return { response, reader: response.body!.getReader(), abort };
}
test('unauthorized open is JSON 401; queries/body rejected before SSE headers', async () => {
  const rejected = await fetch(`${origin}/api/dashboard-events`);
  expect(rejected.status).toBe(401);
  expect(await rejected.json()).toMatchObject({
    error: { code: 'UNAUTHORIZED' },
  });
  expect(
    (
      await request(app)
        .get('/api/dashboard-events')
        .set(session.headers)
        .query({ token: 'no' })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .get('/api/dashboard-events')
        .set(session.headers)
        .send({})
    ).status,
  ).toBe(400);
});
test('real authorized stream emits only invalidation, cleans disconnect and shutdown', async () => {
  const opened = await stream();
  expect(opened.response.headers.get('content-type')).toContain(
    'text/event-stream',
  );
  expect(events.size).toBe(1);
  await events.publishPersistedSale();
  expect(new TextDecoder().decode((await opened.reader.read()).value)).toBe(
    'event: sales-changed\ndata: {}\n\n',
  );
  await opened.reader.cancel();
  for (let i = 0; i < 30 && events.size; i++)
    await new Promise((resolve) => setTimeout(resolve, 10));
  expect(events.size).toBe(0);
  const second = await stream();
  events.close();
  expect((await second.reader.read()).done).toBe(true);
  expect(events.size).toBe(0);
});
test('revocation closes open stream immediately and reconnection returns 401', async () => {
  const opened = await stream();
  expect(
    (await request(app).delete('/api/sessions/current').set(session.headers))
      .status,
  ).toBe(204);
  expect((await opened.reader.read()).done).toBe(true);
  expect(events.size).toBe(0);
  expect(
    (
      await fetch(`${origin}/api/dashboard-events`, {
        headers: session.headers,
      })
    ).status,
  ).toBe(401);
});
test('authorization is checked again before every invalidation', async () => {
  const opened = await stream();
  await createSessionsService(database.db).revoke(session.auth);
  await events.publishPersistedSale();
  expect((await opened.reader.read()).done).toBe(true);
  expect(events.size).toBe(0);
});

test('simulated notice preserves the SSE contract without a sales write', async () => {
  const before = await database.db.collection('fixture_sales').countDocuments();
  const opened = await stream();
  await events.publishSimulatedChange();
  expect(new TextDecoder().decode((await opened.reader.read()).value)).toBe(
    'event: sales-changed\ndata: {}\n\n',
  );
  expect(await database.db.collection('fixture_sales').countDocuments()).toBe(
    before,
  );
});

function fakeResponse() {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    writableLength: 0,
    write: vi.fn(() => true),
    end: vi.fn(),
  });
}
test('25-second heartbeat, logical expiration, renewal and timer cleanup', async () => {
  vi.useFakeTimers();
  const now = new Date('2026-10-19T12:00:00Z');
  vi.setSystemTime(now);
  let expiresAt = new Date(now.getTime() + 40_000);
  const current = vi.fn(async () => {
    if (Date.now() >= expiresAt.getTime()) throw new Error('expired');
    return { _id: new ObjectId(), expiresAt } as Session;
  });
  const hub = createDashboardEvents({ current });
  const response = fakeResponse();
  hub.subscribe(response as unknown as Response, session.auth, await current());
  await vi.advanceTimersByTimeAsync(25_000);
  expect(response.write).toHaveBeenCalledWith(': heartbeat\n\n');
  expect(current).toHaveBeenCalledTimes(2);
  expiresAt = new Date(now.getTime() + 70_000); // external presence, never the stream
  await vi.advanceTimersByTimeAsync(15_000);
  expect(hub.size).toBe(1);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(hub.size).toBe(0);
  expect(response.end).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
test('slow clients and overlapping authorization checks cannot accumulate queues', async () => {
  vi.useFakeTimers();
  const active = {
    _id: new ObjectId(),
    expiresAt: new Date(Date.now() + 120_000),
  } as Session;
  const hub = createDashboardEvents({ current: async () => active });
  const response = fakeResponse();
  response.write.mockReturnValue(false);
  hub.subscribe(response as unknown as Response, session.auth, active);
  await hub.publishPersistedSale();
  expect(hub.size).toBe(0);
  expect(response.end).toHaveBeenCalledOnce();
  let release!: (value: Session) => void;
  const busy = createDashboardEvents({
    current: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  const second = fakeResponse();
  busy.subscribe(second as unknown as Response, session.auth, active);
  const pending = busy.publishPersistedSale();
  await busy.publishPersistedSale();
  release(active);
  await pending;
  expect(busy.size).toBe(0);
  expect(second.write).not.toHaveBeenCalled();
  hub.close();
  busy.close();
  expect(vi.getTimerCount()).toBe(0);
});
