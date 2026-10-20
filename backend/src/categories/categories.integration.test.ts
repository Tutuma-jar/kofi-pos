import { randomBytes, randomUUID } from 'node:crypto';
import { ObjectId, type Db } from 'mongodb';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { createApp } from '../app.js';
import { ensureSessionIndexes } from '../auth/session.model.js';
import { createSessionsService } from '../auth/sessions.service.js';
import {
  connectDatabase,
  type DatabaseConnection,
} from '../shared/database/connect-database.js';
import {
  categoriesCollection,
  ensureCategoryIndexes,
} from './categories.model.js';
import {
  releaseCategoryReference,
  reserveCategoryReference,
} from './categories.references.js';

const databaseName = `kofi_categories_test_${randomUUID().replaceAll('-', '')}`;
let connection: DatabaseConnection;
let time = Date.parse('2026-10-20T12:00:00.000Z');
const clock = () => new Date(time);
let app: ReturnType<typeof createApp>;
let headers: Awaited<ReturnType<typeof newSession>>['headers'];
let authorization: Awaited<ReturnType<typeof newSession>>['authorization'];

async function newSession() {
  const binding = randomBytes(32).toString('base64url');
  const result = await createSessionsService(connection.db, clock).create(
    new ObjectId(),
    'Categories test',
    binding,
  );
  return {
    headers: {
      Authorization: `Bearer ${result.sessionToken}`,
      'X-Tab-Authorization': binding,
    },
    authorization: { token: result.sessionToken, binding },
  };
}
const list = () => request(app).get('/api/categories').set(headers);
const create = (name: unknown) =>
  request(app).post('/api/categories').set(headers).send({ name });
const count = () => categoriesCollection(connection.db).countDocuments();

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
  await ensureSessionIndexes(connection.db);
  await ensureCategoryIndexes(connection.db);
  await connection.db.createCollection('fixture_products');
}, 30_000);
beforeEach(async () => {
  time += 1_000_000;
  await categoriesCollection(connection.db).deleteMany({});
  await connection.db.collection('fixture_products').deleteMany({});
  app = createApp({ db: connection.db, clock });
  ({ headers, authorization } = await newSession());
});
afterAll(async () => {
  if (!connection) return;
  try {
    if (
      connection.db.databaseName !== databaseName ||
      !/^kofi_categories_test_[a-f0-9]{32}$/.test(databaseName)
    )
      throw new Error('Unsafe cleanup target');
    await connection.db.dropDatabase();
  } finally {
    await connection.client.close();
  }
});

test('CA-01 (partial) created category is listed for assignment, without internal fields', async () => {
  const created = await create('  Café  ').expect(201);
  expect(Object.keys(created.body).sort()).toEqual(['id', 'name', 'version']);
  expect(created.body).toMatchObject({ name: 'Café', version: 1 });
  expect(created.body.id).toMatch(/^[a-f0-9]{24}$/);
  expect(created.headers['cache-control']).toBe('no-store');
  const listed = await list().expect(200);
  expect(listed.body).toEqual({ items: [created.body] });
  const stored = await categoriesCollection(connection.db).findOne({
    _id: new ObjectId(created.body.id as string),
  });
  expect(stored).toMatchObject({
    name: 'Café',
    nameKey: 'café',
    productCount: 0,
    version: 1,
  });
});

test('CA-01 list uses Spanish alphabetical order, not binary key order', async () => {
  for (const name of ['Zumos', 'Ñandú', 'Otros', 'café', 'Nata', 'Bebidas'])
    await create(name).expect(201);
  const listed = await list().expect(200);
  expect(
    (listed.body.items as { name: string }[]).map((item) => item.name),
  ).toEqual(['Bebidas', 'café', 'Nata', 'Ñandú', 'Otros', 'Zumos']);
});

test('CA-02 rejects duplicates ignoring case and edge spaces, keeps accent differences', async () => {
  await create('Café').expect(201);
  for (const name of [' café ', 'CAFÉ', 'Café', '\tcAfÉ']) {
    const duplicate = await create(name);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({
      error: { code: 'DUPLICATE_NAME', message: expect.any(String) },
    });
  }
  expect(await count()).toBe(1);
  await create('Cafe').expect(201);
  expect(await count()).toBe(2);
});

test('CA-02 concurrent creations of the same compared name admit exactly one', async () => {
  const names = ['Té verde', ' té verde', 'TÉ VERDE', 'Té verde '];
  const results = await Promise.all(
    [...names, ...names].map((name) => create(name)),
  );
  const statuses = results.map((result) => result.status).sort();
  expect(statuses).toEqual([201, 409, 409, 409, 409, 409, 409, 409]);
  expect(await count()).toBe(1);
}, 30_000);

test('CA-06 API applies 1-80 graphemes after trimming, composed characters included', async () => {
  await create(` ${'ñ'.repeat(80)} `).expect(201);
  await create('👨‍👩‍👧'.repeat(80)).expect(201);
  for (const [name, code] of [
    ['', 'TOO_SHORT'],
    ['    ', 'TOO_SHORT'],
    ['a'.repeat(81), 'TOO_LONG'],
    ['ñ'.repeat(81), 'TOO_LONG'],
  ]) {
    const rejected = await create(name);
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.code).toBe('VALIDATION_ERROR');
    expect(rejected.body.error.details).toEqual({
      fields: [{ field: 'name', code }],
    });
  }
  expect(await count()).toBe(2);
});

test('CA-07 (server) empty catalog is an empty list; a read failure is a sanitized 500', async () => {
  expect((await list().expect(200)).body).toEqual({ items: [] });
  const db = {
    collection: (name: string) =>
      name === 'categories'
        ? {
            find: () => ({
              toArray: async () => {
                throw new Error('secret-db-diagnostic');
              },
            }),
          }
        : connection.db.collection(name),
  } as unknown as Db;
  const failing = await request(createApp({ db, clock }))
    .get('/api/categories')
    .set(headers);
  expect(failing.status).toBe(500);
  expect(failing.body.error.code).toBe('INTERNAL_ERROR');
  expect(failing.body).not.toHaveProperty('items');
  expect(JSON.stringify(failing.body)).not.toContain('secret-db-diagnostic');
});

test('US-001 CA-03/CA-04/CA-09 categories require a valid session of the same tab', async () => {
  const other = randomBytes(32).toString('base64url');
  const attempts = [
    {},
    { Authorization: headers.Authorization },
    { ...headers, 'X-Tab-Authorization': other },
    { ...headers, Authorization: `Bearer ${other}` },
  ];
  for (const set of attempts) {
    const read = await request(app).get('/api/categories').set(set);
    const write = await request(app)
      .post('/api/categories')
      .set(set)
      .send({ name: 'Intrusa' });
    for (const result of [read, write]) {
      expect(result.status).toBe(401);
      expect(result.body.error.code).toBe('UNAUTHORIZED');
      expect(result.headers['www-authenticate']).toBe('Bearer');
    }
  }
  // Authorization is checked before media type.
  await request(app).post('/api/categories').type('text').send('x').expect(401);
  expect(await count()).toBe(0);
});

test('US-001 CA-09 revoked or expired sessions cannot read or create categories', async () => {
  await createSessionsService(connection.db, clock).revoke(authorization);
  await list().expect(401);
  await create('Revocada').expect(401);
  ({ headers, authorization } = await newSession());
  time += 119_999;
  await list().expect(200);
  time += 1;
  await list().expect(401);
  await create('Expirada').expect(401);
  expect(await count()).toBe(0);
});

test('error envelope: media, size, malformed JSON, query, unknown fields and methods', async () => {
  const cases = [
    await request(app)
      .post('/api/categories')
      .set(headers)
      .type('text')
      .send('{}'),
    await request(app)
      .post('/api/categories')
      .set(headers)
      .send({ name: 'x'.repeat(103_000) }),
    await request(app)
      .post('/api/categories')
      .set(headers)
      .set('Content-Type', 'application/json')
      .send('{'),
    await request(app)
      .post('/api/categories?name=x')
      .set(headers)
      .send({ name: 'Query' }),
    await request(app).get('/api/categories?all=1').set(headers),
    await request(app)
      .post('/api/categories')
      .set(headers)
      .send({ name: 'Extra', version: 1 }),
    await request(app).put('/api/categories').set(headers).send({ name: 'x' }),
    await request(app).get('/api/categories/').set(headers),
  ];
  expect(
    cases.map((result) => [result.status, result.body.error.code]),
  ).toEqual([
    [415, 'UNSUPPORTED_MEDIA_TYPE'],
    [413, 'PAYLOAD_TOO_LARGE'],
    [400, 'VALIDATION_ERROR'],
    [400, 'VALIDATION_ERROR'],
    [400, 'VALIDATION_ERROR'],
    [400, 'VALIDATION_ERROR'],
    [404, 'NOT_FOUND'],
    [404, 'NOT_FOUND'],
  ]);
  expect(cases[5]?.body.error.details.fields).toContainEqual(
    expect.objectContaining({ code: 'NOT_ALLOWED' }),
  );
  expect(await count()).toBe(0);
});

test('reference contract: reserve/release in a transaction change only the counter', async () => {
  const created = await create('Panadería').expect(201);
  const id = new ObjectId(created.body.id as string);
  const before = await categoriesCollection(connection.db).findOne({ _id: id });
  const session = connection.client.startSession();
  try {
    await session.withTransaction(async () => {
      await reserveCategoryReference(connection.db, session, id);
      await reserveCategoryReference(connection.db, session, id);
    });
    let stored = await categoriesCollection(connection.db).findOne({ _id: id });
    expect(stored).toEqual({ ...before, productCount: 2 });
    await session.withTransaction(async () => {
      await releaseCategoryReference(connection.db, session, id);
    });
    stored = await categoriesCollection(connection.db).findOne({ _id: id });
    expect(stored).toEqual({ ...before, productCount: 1 });
    expect((await list().expect(200)).body.items).toEqual([created.body]);
  } finally {
    await session.endSession();
  }
}, 30_000);

test('reference contract: a missing category aborts the whole transaction', async () => {
  const products = connection.db.collection('fixture_products');
  const session = connection.client.startSession();
  try {
    await expect(
      session.withTransaction(async () => {
        await products.insertOne({ name: 'Huérfano' }, { session });
        await reserveCategoryReference(connection.db, session, new ObjectId());
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { fields: [{ field: 'categoryId', code: 'NOT_ALLOWED' }] },
    });
  } finally {
    await session.endSession();
  }
  expect(await products.countDocuments()).toBe(0);
}, 30_000);

test('reference contract: releasing below zero is an integrity failure and changes nothing', async () => {
  const created = await create('Temporada').expect(201);
  const id = new ObjectId(created.body.id as string);
  const before = await categoriesCollection(connection.db).findOne({ _id: id });
  const session = connection.client.startSession();
  try {
    await expect(
      session.withTransaction(async () => {
        await releaseCategoryReference(connection.db, session, id);
      }),
    ).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  } finally {
    await session.endSession();
  }
  expect(
    await categoriesCollection(connection.db).findOne({ _id: id }),
  ).toEqual(before);
}, 30_000);
