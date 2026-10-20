import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import type { IncomingHttpHeaders } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ObjectId, type Db } from 'mongodb';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { createApp } from '../app.js';
import { ensureSessionIndexes } from '../auth/session.model.js';
import { createSessionsService } from '../auth/sessions.service.js';
import { createImageStore } from '../products/image-store.js';
import {
  ensureProductIndexes,
  productImagesCollection,
  productsCollection,
} from '../products/products.model.js';
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
// Products are mounted only with an image volume (associations of TASK-020).
let imagesDir: string;
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
  await ensureProductIndexes(connection.db);
  await connection.db.createCollection('fixture_products');
  imagesDir = await mkdtemp(join(tmpdir(), 'kofi-category-images-'));
}, 30_000);
beforeEach(async () => {
  time += 1_000_000;
  await categoriesCollection(connection.db).deleteMany({});
  await productsCollection(connection.db).deleteMany({});
  await productImagesCollection(connection.db).deleteMany({});
  await connection.db.collection('fixture_products').deleteMany({});
  const images = createImageStore(imagesDir);
  await images.prepare();
  app = createApp({ db: connection.db, clock, productImages: images });
  ({ headers, authorization } = await newSession());
});
afterAll(async () => {
  if (imagesDir) await rm(imagesDir, { recursive: true, force: true });
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

// --- TASK-020: renaming, deletion and associations -------------------------

type Body = Record<string, unknown>;
const CONFLICT_MESSAGE =
  'Esta categoría cambió mientras la editabas. Revisa la versión actual y vuelve a aplicar tus cambios.';
const NOT_EMPTY_MESSAGE =
  'No puedes eliminar una categoría con productos asociados, incluidos los inactivos.';
const rename = (id: string, body: Body, set: IncomingHttpHeaders = headers) =>
  request(app).patch(`/api/categories/${id}`).set(set).send(body);
const remove = (id: string, body: Body, set: IncomingHttpHeaders = headers) =>
  request(app).delete(`/api/categories/${id}`).set(set).send(body);
const createdId = async (name: string) =>
  (await create(name).expect(201)).body.id as string;
const storedCategory = (id: string) =>
  categoriesCollection(connection.db).findOne({ _id: new ObjectId(id) });
const storedProduct = (id: string) =>
  productsCollection(connection.db).findOne({ _id: new ObjectId(id) });
const createProduct = (categoryId: string, name: string) =>
  request(app).post('/api/products').set(headers).send({
    name,
    description: 'Producto de prueba.',
    priceTenths: 100,
    categoryId,
    imageId: null,
  });
const productId = async (categoryId: string, name: string) =>
  (await createProduct(categoryId, name).expect(201)).body.id as string;
const deactivate = (id: string, version: number) =>
  request(app)
    .patch(`/api/products/${id}/activation`)
    .set(headers)
    .send({ version, active: false })
    .expect(200);
const reassign = (id: string, version: number, categoryId: string) =>
  request(app)
    .patch(`/api/products/${id}`)
    .set(headers)
    .send({ version, categoryId });
async function expectCountersMatchProducts() {
  for (const category of await categoriesCollection(connection.db)
    .find()
    .toArray())
    expect(category.productCount).toBe(
      await productsCollection(connection.db).countDocuments({
        categoryId: category._id,
      }),
    );
  for (const product of await productsCollection(connection.db)
    .find()
    .toArray())
    expect(
      await categoriesCollection(connection.db).findOne({
        _id: product.categoryId,
      }),
    ).not.toBeNull();
}

test('CA-01/CA-03 renaming keeps identity, counter and products, active or inactive', async () => {
  const id = await createdId('Bebidas');
  const active = await productId(id, 'Limonada');
  const inactive = await productId(id, 'Horchata');
  await deactivate(inactive, 1);
  const productsBefore = await productsCollection(connection.db)
    .find()
    .toArray();
  const before = await storedCategory(id);
  time += 1000;
  // Assignments do not change the category version: version 1 is current.
  const renamed = await rename(id, { version: 1, name: '  Bebidas frías ' });
  expect(renamed.status).toBe(200);
  expect(renamed.body).toEqual({ id, name: 'Bebidas frías', version: 2 });
  expect(renamed.headers['cache-control']).toBe('no-store');
  expect(await storedCategory(id)).toEqual({
    ...before,
    name: 'Bebidas frías',
    nameKey: 'bebidas frías',
    version: 2,
    updatedAt: new Date(time),
  });
  expect(await productsCollection(connection.db).find().toArray()).toEqual(
    productsBefore,
  );
  expect((await list().expect(200)).body.items).toEqual([renamed.body]);
  const listed = await request(app).get('/api/products').set(headers);
  expect(
    (listed.body.items as { id: string; categoryId: string }[])
      .map((item) => [item.id, item.categoryId])
      .sort(),
  ).toEqual(
    [
      [active, id],
      [inactive, id],
    ].sort(),
  );
  // CA-01: the renamed category is still available for assignment.
  await productId(id, 'Agua');
  expect((await storedCategory(id))?.productCount).toBe(3);
  await expectCountersMatchProducts();
}, 30_000);

test('CA-02 renaming rejects other names ignoring case and edge spaces, keeps accents and the own name', async () => {
  await createdId('Café');
  const tea = await createdId('Té');
  const before = await storedCategory(tea);
  for (const name of [' café ', 'CAFÉ', 'Café', '\tcAfÉ']) {
    const duplicate = await rename(tea, { version: 1, name });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({
      error: { code: 'DUPLICATE_NAME', message: expect.any(String) },
    });
  }
  expect(await storedCategory(tea)).toEqual(before);
  // An accent difference is another name.
  await rename(tea, { version: 1, name: 'Cafe' })
    .expect(200)
    .expect((res) => expect(res.body.version).toBe(2));
  // The own name, with other case or edge spaces, is no duplicate.
  await rename(tea, { version: 2, name: ' CAFE ' })
    .expect(200)
    .expect((res) =>
      expect(res.body).toMatchObject({ name: 'CAFE', version: 3 }),
    );
  // The same exact name on the current version is saved and versioned.
  await rename(tea, { version: 3, name: 'CAFE' })
    .expect(200)
    .expect((res) =>
      expect(res.body).toMatchObject({ name: 'CAFE', version: 4 }),
    );
  expect(await count()).toBe(2);
});

test('CA-02 simultaneous renamings and creations of the same compared name admit exactly one', async () => {
  for (let round = 0; round < 5; round++) {
    await categoriesCollection(connection.db).deleteMany({});
    const ids = await Promise.all(
      ['Uno', 'Dos', 'Tres', 'Cuatro'].map((name) => createdId(name)),
    );
    const names = ['Mesa', ' mesa', 'MESA ', '\tMeSa'];
    const results = await Promise.all([
      ...ids.map((id, index) => rename(id, { version: 1, name: names[index] })),
      ...names.map((name) => create(name)),
    ]);
    const succeeded = results.filter((result) => result.status < 300);
    expect(succeeded).toHaveLength(1);
    for (const result of results)
      if (result.status >= 300) {
        expect(result.status).toBe(409);
        expect(result.body.error.code).toBe('DUPLICATE_NAME');
      }
    expect(
      await categoriesCollection(connection.db).countDocuments({
        nameKey: 'mesa',
      }),
    ).toBe(1);
    // Rejected renamings keep their name and version.
    for (const id of ids) {
      const category = await storedCategory(id);
      if (category?.nameKey !== 'mesa') expect(category?.version).toBe(1);
    }
  }
}, 60_000);

test('CA-06 renaming applies 1-80 graphemes after trimming and never persists an invalid name', async () => {
  const id = await createdId('Original');
  const before = await storedCategory(id);
  for (const [name, code] of [
    ['', 'TOO_SHORT'],
    ['   \t ', 'TOO_SHORT'],
    ['a'.repeat(81), 'TOO_LONG'],
    [` ${'ñ'.repeat(81)} `, 'TOO_LONG'],
    ['👨‍👩‍👧'.repeat(81), 'TOO_LONG'],
  ]) {
    const rejected = await rename(id, { version: 1, name });
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.code).toBe('VALIDATION_ERROR');
    expect(rejected.body.error.details).toEqual({
      fields: [{ field: 'name', code }],
    });
  }
  expect(await storedCategory(id)).toEqual(before);
  let version = 1;
  for (const [name, saved] of [
    [' a ', 'a'],
    [` ${'ñ'.repeat(80)} `, 'ñ'.repeat(80)],
    ['👨‍👩‍👧'.repeat(80), '👨‍👩‍👧'.repeat(80)],
    // Decomposed input is stored composed (NFC): 4 visible characters.
    ['Baño', 'Baño'],
  ]) {
    const saved200 = await rename(id, { version, name }).expect(200);
    expect(saved200.body).toEqual({ id, name: saved, version: version + 1 });
    version++;
  }
});

test('CA-04 an empty category is deleted and disappears from the list', async () => {
  const id = await createdId('Temporal');
  const kept = await createdId('Bebidas');
  const deleted = await remove(id, { version: 1 });
  expect(deleted.status).toBe(204);
  expect(deleted.text).toBe('');
  expect(await storedCategory(id)).toBeNull();
  expect(
    (await list().expect(200)).body.items.map(
      (item: { id: string }) => item.id,
    ),
  ).toEqual([kept]);
  // A deleted category is no longer assignable.
  const orphan = await createProduct(id, 'Huérfano');
  expect(orphan.status).toBe(400);
  expect(orphan.body.error.details).toEqual({
    fields: [{ field: 'categoryId', code: 'NOT_ALLOWED' }],
  });
  await remove(id, { version: 1 }).expect(404);
});

test('CA-04 a category with an active or only inactive product is not deleted', async () => {
  const withActive = await createdId('Con activo');
  await productId(withActive, 'Activo');
  const withInactive = await createdId('Con inactivo');
  const inactive = await productId(withInactive, 'Inactivo');
  await deactivate(inactive, 1);
  const productsBefore = await productsCollection(connection.db)
    .find()
    .toArray();
  for (const id of [withActive, withInactive]) {
    const before = await storedCategory(id);
    const rejected = await remove(id, { version: 1 });
    expect(rejected.status).toBe(409);
    expect(rejected.body).toEqual({
      error: { code: 'CATEGORY_NOT_EMPTY', message: NOT_EMPTY_MESSAGE },
    });
    expect(await storedCategory(id)).toEqual(before);
  }
  expect(await productsCollection(connection.db).find().toArray()).toEqual(
    productsBefore,
  );
  await expectCountersMatchProducts();
});

test('CA-04 after reassigning its last product (TASK-018) the category can be deleted', async () => {
  const source = await createdId('Origen');
  const target = await createdId('Destino');
  const product = await productId(source, 'Viajero');
  await deactivate(product, 1);
  await remove(source, { version: 1 }).expect(409);
  await reassign(product, 2, target).expect(200);
  expect((await storedCategory(source))?.productCount).toBe(0);
  // Reference changes never bump the category version.
  await remove(source, { version: 1 }).expect(204);
  expect((await storedProduct(product))?.categoryId.toHexString()).toBe(target);
  await remove(target, { version: 1 }).expect(409);
  await expectCountersMatchProducts();
});

test('CA-01/CA-04 concurrent creation and deletion through the API never leave an orphan', async () => {
  for (let round = 0; round < 15; round++) {
    const target = await createdId(`Temporal ${round}`);
    const [created, deleted] = await Promise.all([
      createProduct(target, `Producto ${round}`),
      remove(target, { version: 1 }),
    ]);
    if (created.status === 201) {
      expect(deleted.status).toBe(409);
      expect(deleted.body.error.code).toBe('CATEGORY_NOT_EMPTY');
      expect((await storedCategory(target))?.productCount).toBe(1);
    } else {
      expect(created.status).toBe(400);
      expect(created.body.error.details).toEqual({
        fields: [{ field: 'categoryId', code: 'NOT_ALLOWED' }],
      });
      expect(deleted.status).toBe(204);
      expect(await storedCategory(target)).toBeNull();
    }
  }
  await expectCountersMatchProducts();
}, 120_000);

test('CA-04 concurrent reassignment and deletion through the API never leave an orphan', async () => {
  const home = await createdId('Casa');
  const product = await productId(home, 'Nómada');
  let version = 1;
  let category = home;
  for (let round = 0; round < 15; round++) {
    const target = await createdId(`Destino ${round}`);
    const [moved, deleted] = await Promise.all([
      reassign(product, version, target),
      remove(target, { version: 1 }),
    ]);
    if (moved.status === 200) {
      expect(deleted.status).toBe(409);
      expect(deleted.body.error.code).toBe('CATEGORY_NOT_EMPTY');
      version++;
      category = target;
    } else {
      expect(moved.status).toBe(400);
      expect(moved.body.error.details).toEqual({
        fields: [{ field: 'categoryId', code: 'NOT_ALLOWED' }],
      });
      expect(deleted.status).toBe(204);
    }
    const stored = await storedProduct(product);
    expect(stored?.version).toBe(version);
    expect(stored?.categoryId.toHexString()).toBe(category);
    await expectCountersMatchProducts();
  }
}, 120_000);

test('CA-05 two sessions on the same version: the first rename wins, the stale one is rejected with the current version', async () => {
  const id = await createdId('Postres');
  const other = (await newSession()).headers;
  await rename(id, { version: 1, name: 'Dulces' }).expect(200);
  const stale = await rename(id, { version: 1, name: 'Tartas' }, other);
  expect(stale.status).toBe(409);
  expect(stale.body).toEqual({
    error: {
      code: 'VERSION_CONFLICT',
      message: CONFLICT_MESSAGE,
      details: { current: { id, name: 'Dulces', version: 2 } },
    },
  });
  expect(await storedCategory(id)).toMatchObject({
    name: 'Dulces',
    version: 2,
  });
  // The second session reloads the current version and saves on it.
  const current = (await list().set(other).expect(200)).body.items[0];
  expect(current).toEqual({ id, name: 'Dulces', version: 2 });
  await rename(id, { version: 2, name: 'Tartas' }, other).expect(200);
});

test('CA-05 simultaneous renamings of the same version: exactly one applies', async () => {
  const id = await createdId('Snacks');
  const sessions = await Promise.all(
    Array.from({ length: 6 }, async () => (await newSession()).headers),
  );
  const results = await Promise.all(
    sessions.map((set, index) =>
      rename(id, { version: 1, name: `Snacks ${index}` }, set),
    ),
  );
  const winners = results.filter((result) => result.status === 200);
  expect(winners).toHaveLength(1);
  for (const result of results)
    if (result.status !== 200) {
      expect(result.status).toBe(409);
      expect(result.body.error).toEqual({
        code: 'VERSION_CONFLICT',
        message: CONFLICT_MESSAGE,
        details: { current: winners[0]?.body },
      });
    }
  expect(await storedCategory(id)).toMatchObject({
    name: winners[0]?.body.name,
    version: 2,
  });
}, 30_000);

test('CA-05 a stale deletion is a conflict, checked before the counter; a deleted category is not found', async () => {
  const id = await createdId('Salados');
  const other = (await newSession()).headers;
  await rename(id, { version: 1, name: 'Saladitos' }).expect(200);
  const stale = await remove(id, { version: 1 }, other);
  expect(stale.status).toBe(409);
  expect(stale.body.error).toEqual({
    code: 'VERSION_CONFLICT',
    message: CONFLICT_MESSAGE,
    details: { current: { id, name: 'Saladitos', version: 2 } },
  });
  expect(await storedCategory(id)).not.toBeNull();
  // With products and a stale version, the conflict comes first.
  await productId(id, 'Empanada');
  const staleNotEmpty = await remove(id, { version: 1 }, other);
  expect(staleNotEmpty.status).toBe(409);
  expect(staleNotEmpty.body.error.code).toBe('VERSION_CONFLICT');
  // A rename after a deletion of the same version finds nothing.
  const empty = await createdId('Vacía');
  await remove(empty, { version: 1 }).expect(204);
  const late = await rename(empty, { version: 1, name: 'Tarde' }, other);
  expect(late.status).toBe(404);
  expect(late.body.error.code).toBe('NOT_FOUND');
});

test('CA-05 renaming and deleting the same version at once: exactly one applies', async () => {
  for (let round = 0; round < 10; round++) {
    const id = await createdId(`Carrera ${round}`);
    const [renamed, deleted] = await Promise.all([
      rename(id, { version: 1, name: `Renombrada ${round}` }),
      remove(id, { version: 1 }),
    ]);
    if (renamed.status === 200) {
      expect(deleted.status).toBe(409);
      expect(deleted.body.error.code).toBe('VERSION_CONFLICT');
      expect(await storedCategory(id)).toMatchObject({ version: 2 });
    } else {
      expect(renamed.status).toBe(404);
      expect(deleted.status).toBe(204);
      expect(await storedCategory(id)).toBeNull();
    }
  }
}, 60_000);

test('CA-05 the control is per category: distinct categories change in parallel', async () => {
  const ids = await Promise.all(
    Array.from({ length: 8 }, (_, index) => createdId(`Grupo ${index}`)),
  );
  const results = await Promise.all(
    ids.map((id, index) =>
      index % 2
        ? remove(id, { version: 1 })
        : rename(id, { version: 1, name: `Grupo ${index} nuevo` }),
    ),
  );
  expect(results.map((result) => result.status)).toEqual(
    ids.map((_, index) => (index % 2 ? 204 : 200)),
  );
  expect(await count()).toBe(4);
}, 30_000);

test('renaming and deletion errors: unknown or malformed ids, media, query and body', async () => {
  const id = await createdId('Estable');
  const before = await storedCategory(id);
  const unknown = new ObjectId().toHexString();
  const cases = [
    await rename(unknown, { version: 1, name: 'x' }),
    await remove(unknown, { version: 1 }),
    await rename('x', { version: 1, name: 'x' }),
    await remove(`${id}0`, { version: 1 }),
    await request(app)
      .patch(`/api/categories/${id}`)
      .set(headers)
      .type('text')
      .send('{}'),
    await request(app).delete(`/api/categories/${id}`).set(headers),
    await request(app)
      .delete(`/api/categories/${id}?version=1`)
      .set(headers)
      .send({ version: 1 }),
    await rename(id, { version: 1, name: 'Otro', extra: true }),
    await rename(id, { name: 'Otro' }),
    await rename(id, { version: 0, name: 'Otro' }),
    await rename(id, { version: '1', name: 'Otro' }),
    await remove(id, {}),
    await remove(id, { version: 1.5 }),
    await remove(id, { version: 1, name: 'Estable' }),
    await request(app).put(`/api/categories/${id}`).set(headers).send({}),
  ];
  expect(
    cases.map((result) => [result.status, result.body.error.code]),
  ).toEqual([
    [404, 'NOT_FOUND'],
    [404, 'NOT_FOUND'],
    [404, 'NOT_FOUND'],
    [404, 'NOT_FOUND'],
    [415, 'UNSUPPORTED_MEDIA_TYPE'],
    [415, 'UNSUPPORTED_MEDIA_TYPE'],
    [400, 'VALIDATION_ERROR'],
    [400, 'VALIDATION_ERROR'],
    [400, 'VALIDATION_ERROR'],
    [400, 'VALIDATION_ERROR'],
    [400, 'VALIDATION_ERROR'],
    [400, 'VALIDATION_ERROR'],
    [400, 'VALIDATION_ERROR'],
    [400, 'VALIDATION_ERROR'],
    [404, 'NOT_FOUND'],
  ]);
  expect(cases[7]?.body.error.details.fields).toEqual([
    { field: '', code: 'NOT_ALLOWED' },
  ]);
  for (const index of [8, 9, 10, 11, 12])
    expect(cases[index]?.body.error.details.fields).toEqual([
      { field: 'version', code: 'INVALID_FORMAT' },
    ]);
  expect(await storedCategory(id)).toEqual(before);
});

test('US-001 CA-03/CA-04/CA-09 renaming and deletion require a valid session of the same tab', async () => {
  const id = await createdId('Protegida');
  const before = await storedCategory(id);
  const other = randomBytes(32).toString('base64url');
  const attempts = [
    {},
    { Authorization: headers.Authorization },
    { ...headers, 'X-Tab-Authorization': other },
    { ...headers, Authorization: `Bearer ${other}` },
  ];
  for (const set of attempts)
    for (const result of [
      await rename(id, { version: 1, name: 'Intrusa' }, set),
      await remove(id, { version: 1 }, set),
      // Authorization is checked before media type and identity.
      await request(app).delete('/api/categories/x').set(set).type('text'),
    ]) {
      expect(result.status).toBe(401);
      expect(result.body.error.code).toBe('UNAUTHORIZED');
    }
  await createSessionsService(connection.db, clock).revoke(authorization);
  await rename(id, { version: 1, name: 'Revocada' }).expect(401);
  await remove(id, { version: 1 }).expect(401);
  expect(await storedCategory(id)).toEqual(before);
});
