import { randomBytes, randomUUID } from 'node:crypto';
import { ObjectId, type Db } from 'mongodb';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { createApp } from '../app.js';
import {
  connectDatabase,
  type DatabaseConnection,
} from '../shared/database/connect-database.js';
import { accountsCollection, ensureAccountIndexes } from './account.model.js';
import { hashPassword } from './password.js';
import { ensureSessionIndexes, sessionsCollection } from './session.model.js';
import {
  createSessionsService,
  hashSessionSecret,
} from './sessions.service.js';

const databaseName = `kofi_sessions_test_${randomUUID().replaceAll('-', '')}`;
const password = 'test-only password';
const username = 'Test Operator';
const binding = randomBytes(32).toString('base64url');
let connection: DatabaseConnection;
let time = Date.parse('2026-10-19T12:00:00.000Z');
const clock = () => new Date(time);
let app: ReturnType<typeof createApp>;
const authHeaders = (token: string, tabBinding = binding) => ({
  Authorization: `Bearer ${token}`,
  'X-Tab-Authorization': tabBinding,
});
const login = (tabBinding = binding) =>
  request(app).post('/api/sessions').send({ username, password, tabBinding });

beforeAll(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Explicit local MONGODB_URI required');
  const target = new URL(uri);
  if (
    target.protocol !== 'mongodb:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
    target.username ||
    target.password
  )
    throw new Error('Local unauthenticated MongoDB only');
  connection = await connectDatabase(uri, databaseName);
  await ensureAccountIndexes(connection.db);
  await ensureSessionIndexes(connection.db);
  const now = clock();
  await accountsCollection(connection.db).insertOne({
    _id: new ObjectId(),
    username,
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
  });
}, 30_000);
beforeEach(() => {
  time += 1_000_000;
  app = createApp({ db: connection.db, clock });
});
afterAll(async () => {
  if (!connection) return;
  try {
    if (
      connection.db.databaseName !== databaseName ||
      !/^kofi_sessions_test_[a-f0-9]{32}$/.test(databaseName)
    )
      throw new Error('Unsafe cleanup target');
    await connection.db.dropDatabase();
  } finally {
    await connection.client.close();
  }
});

test('issues public 201 only for correct credentials; persists hashes, not secrets', async () => {
  const initialSessions = await sessionsCollection(
    connection.db,
  ).countDocuments();
  for (const credentials of [
    { username, password: 'wrong' },
    { username: 'unknown', password },
  ]) {
    const result = await request(app)
      .post('/api/sessions')
      .send({ ...credentials, tabBinding: binding });
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe('INVALID_CREDENTIALS');
  }
  expect(await sessionsCollection(connection.db).countDocuments()).toBe(
    initialSessions,
  );
  const result = await login();
  expect(result.status).toBe(201);
  expect(result.body.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(Object.keys(result.body.session).sort()).toEqual([
    'createdAt',
    'expiresAt',
    'id',
    'label',
    'lastPresenceAt',
  ]);
  const stored = await sessionsCollection(connection.db).findOne({
    _id: new ObjectId(result.body.session.id),
  });
  expect(stored?.tokenHash).toBe(hashSessionSecret(result.body.sessionToken));
  expect(stored?.bindingHash).toBe(hashSessionSecret(binding));
  expect(JSON.stringify(stored)).not.toContain(result.body.sessionToken);
  expect(JSON.stringify(stored)).not.toContain(binding);
  expect(result.headers['cache-control']).toBe('no-store');
  expect(result.headers.etag).toBeUndefined();
  expect(result.headers['x-powered-by']).toBeUndefined();
}, 30_000);

test('strict inputs, parser limits, methods, query and media errors use envelopes', async () => {
  for (const body of [
    { username, password, tabBinding: binding, extra: true },
    { username, password },
    { username: {}, password, tabBinding: binding },
  ]) {
    expect((await request(app).post('/api/sessions').send(body)).status).toBe(
      400,
    );
  }
  const malformed = await request(app)
    .post('/api/sessions')
    .set('Content-Type', 'application/json')
    .send('{');
  expect(malformed.status).toBe(400);
  expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  expect(
    (await request(app).post('/api/sessions').type('text').send('x')).status,
  ).toBe(415);
  expect(
    (
      await request(app)
        .post('/api/sessions')
        .send({ username, password: 'x'.repeat(103_000), tabBinding: binding })
    ).status,
  ).toBe(413);
  expect(
    (
      await request(app)
        .post('/api/sessions?token=x')
        .send({ username, password, tabBinding: binding })
    ).status,
  ).toBe(400);
  expect((await request(app).get('/api/missing')).status).toBe(404);
  expect((await request(app).put('/api/sessions/current')).status).toBe(404);
  const missing = await request(app).get('/api/sessions/current');
  expect(missing.status).toBe(401);
  expect(missing.headers['www-authenticate']).toBe('Bearer');
});

test('rate limiting returns 429 and Retry-After without issuing a session', async () => {
  for (let i = 0; i < 5; i++)
    await request(app)
      .post('/api/sessions')
      .set('X-Forwarded-For', `192.0.2.${i + 1}`)
      .send({ username: 'unknown', password, tabBinding: binding })
      .expect(401);
  const response = await login();
  expect(response.status).toBe(429);
  expect(response.body.error.code).toBe('AUTH_RATE_LIMITED');
  expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
}, 30_000);

test('independent concurrent logins, binding and presence-only renewal at exact boundary', async () => {
  const [a, b] = await Promise.all([
    login(),
    login(randomBytes(32).toString('base64url')),
  ]);
  expect(a.status).toBe(201);
  expect(b.status).toBe(201);
  expect(a.body.session.id).not.toBe(b.body.session.id);
  const headers = authHeaders(a.body.sessionToken);
  await request(app)
    .get('/api/sessions/current')
    .set(
      authHeaders(a.body.sessionToken, randomBytes(32).toString('base64url')),
    )
    .expect(401);
  time += 119_999;
  const current = await request(app)
    .get('/api/sessions/current')
    .set(headers)
    .expect(200);
  expect(current.body.expiresAt).toBe(a.body.session.expiresAt);
  const presence = await request(app)
    .post('/api/sessions/current/presences')
    .set(headers)
    .send({})
    .expect(200);
  expect(Date.parse(presence.body.expiresAt)).toBe(time + 120_000);
  time += 120_000;
  await request(app).get('/api/sessions/current').set(headers).expect(401);
  await request(app)
    .post('/api/sessions/current/presences')
    .set(headers)
    .send({})
    .expect(401);
}, 30_000);

test('manual revoke affects only current token; repeated delete fails and login can start anew', async () => {
  const [a, b] = await Promise.all([login(), login()]);
  const headers = authHeaders(a.body.sessionToken);
  const deleted = await request(app)
    .delete('/api/sessions/current')
    .set(headers)
    .expect(204);
  expect(deleted.text).toBe('');
  await request(app).delete('/api/sessions/current').set(headers).expect(401);
  await request(app)
    .post('/api/sessions/current/presences')
    .set(headers)
    .send({})
    .expect(401);
  await request(app)
    .get('/api/sessions/current')
    .set(authHeaders(b.body.sessionToken))
    .expect(200);
  expect((await login()).status).toBe(201);
}, 30_000);

test('atomic revoke/presence race cannot revive; monotonic dates under reordered clocks', async () => {
  const a = await login();
  const service = createSessionsService(connection.db, clock);
  const authorization = { token: a.body.sessionToken as string, binding };
  time += 10_000;
  await service.presence(authorization);
  time -= 5_000;
  const monotonic = await service.presence(authorization);
  expect(Date.parse(monotonic.lastPresenceAt)).toBe(time + 5_000);
  const [revocation] = await Promise.allSettled([
    service.revoke(authorization),
    service.presence(authorization),
  ]);
  expect(revocation.status).toBe('fulfilled');
  await expect(service.presence(authorization)).rejects.toMatchObject({
    code: 'UNAUTHORIZED',
  });
  const stored = await sessionsCollection(connection.db).findOne({
    _id: new ObjectId(a.body.session.id),
  });
  expect(stored?.revokedAt).not.toBeNull();
}, 30_000);

test('database failures are sanitized', async () => {
  const db = {
    collection: () => ({
      findOne: async () => {
        throw new Error('secret-db-diagnostic');
      },
    }),
  } as unknown as Db;
  const failing = createApp({ db, clock });
  const result = await request(failing)
    .post('/api/sessions')
    .send({ username, password, tabBinding: binding });
  expect(result.status).toBe(500);
  expect(result.body.error.code).toBe('INTERNAL_ERROR');
  expect(JSON.stringify(result.body)).not.toContain('secret-db-diagnostic');
});

test('GET-only session expires exactly at 120000 while another presence-renewed session remains valid', async () => {
  const [a, b] = await Promise.all([login(), login()]);
  time += 60_000;
  await request(app)
    .post('/api/sessions/current/presences')
    .set(authHeaders(b.body.sessionToken))
    .send({})
    .expect(200);
  time += 59_999;
  const read = await request(app)
    .get('/api/sessions/current')
    .set(authHeaders(a.body.sessionToken))
    .expect(200);
  expect(read.body.expiresAt).toBe(a.body.session.expiresAt);
  time++;
  await request(app)
    .get('/api/sessions/current')
    .set(authHeaders(a.body.sessionToken))
    .expect(401);
  await request(app)
    .get('/api/sessions/current')
    .set(authHeaders(b.body.sessionToken))
    .expect(200);
}, 30_000);

test('wrong binding cannot renew or revoke and unknown valid-shape tokens never upsert', async () => {
  const a = await login();
  const sessions = sessionsCollection(connection.db);
  const id = new ObjectId(a.body.session.id);
  const before = await sessions.findOne({ _id: id });
  const count = await sessions.countDocuments();
  const wrongBinding = randomBytes(32).toString('base64url');
  for (const headers of [
    authHeaders(a.body.sessionToken, wrongBinding),
    authHeaders(randomBytes(32).toString('base64url')),
  ]) {
    const presence = await request(app)
      .post('/api/sessions/current/presences')
      .set(headers)
      .send({})
      .expect(401);
    const revoke = await request(app)
      .delete('/api/sessions/current')
      .set(headers)
      .expect(401);
    expect(presence.body.error.code).toBe('UNAUTHORIZED');
    expect(revoke.body.error.code).toBe('UNAUTHORIZED');
  }
  expect(await sessions.findOne({ _id: id })).toEqual(before);
  expect(await sessions.countDocuments()).toBe(count);
  await request(app)
    .get('/api/sessions/current')
    .set(authHeaders(a.body.sessionToken))
    .expect(200);
}, 30_000);

test('protected presence rejects malformed/extra/media/oversized bodies without changing session', async () => {
  const a = await login();
  const headers = authHeaders(a.body.sessionToken);
  const sessions = sessionsCollection(connection.db);
  const id = new ObjectId(a.body.session.id);
  const before = await sessions.findOne({ _id: id });
  time += 1000;
  const invalid = [
    await request(app)
      .post('/api/sessions/current/presences')
      .set(headers)
      .send({ now: clock().toISOString() }),
    await request(app)
      .post('/api/sessions/current/presences')
      .set(headers)
      .set('Content-Type', 'application/json')
      .send('{'),
    await request(app)
      .post('/api/sessions/current/presences')
      .set(headers)
      .type('text')
      .send('{}'),
    await request(app)
      .post('/api/sessions/current/presences')
      .set(headers)
      .send({ value: 'x'.repeat(103_000) }),
  ];
  expect(
    invalid.map((result) => [result.status, result.body.error.code]),
  ).toEqual([
    [400, 'VALIDATION_ERROR'],
    [400, 'VALIDATION_ERROR'],
    [415, 'UNSUPPORTED_MEDIA_TYPE'],
    [413, 'PAYLOAD_TOO_LARGE'],
  ]);
  expect(await sessions.findOne({ _id: id })).toEqual(before);
}, 30_000);

test('concurrent DELETE admits exactly one confirmation; unique token index rejects duplicates', async () => {
  const a = await login();
  const sessions = sessionsCollection(connection.db);
  const stored = await sessions.findOne({
    _id: new ObjectId(a.body.session.id),
  });
  if (!stored) throw new Error('Missing test session');
  await expect(
    sessions.insertOne({ ...stored, _id: new ObjectId() }),
  ).rejects.toMatchObject({ code: 11000 });
  const headers = authHeaders(a.body.sessionToken);
  const results = await Promise.all([
    request(app).delete('/api/sessions/current').set(headers),
    request(app).delete('/api/sessions/current').set(headers),
  ]);
  expect(results.map((result) => result.status).sort()).toEqual([204, 401]);
  expect(results.find((result) => result.status === 401)?.body.error.code).toBe(
    'UNAUTHORIZED',
  );
}, 30_000);
