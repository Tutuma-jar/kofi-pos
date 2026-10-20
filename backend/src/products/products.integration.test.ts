import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ObjectId, type Db } from 'mongodb';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { createApp } from '../app.js';
import { ensureSessionIndexes } from '../auth/session.model.js';
import { createSessionsService } from '../auth/sessions.service.js';
import {
  categoriesCollection,
  ensureCategoryIndexes,
} from '../categories/categories.model.js';
import {
  connectDatabase,
  type DatabaseConnection,
} from '../shared/database/connect-database.js';
import { createImageStore, type ImageStore } from './image-store.js';
import {
  apng,
  gif,
  jpeg,
  png,
  pngOfSize,
  svg,
  webpAnimated,
  webpLossless,
  webpLossy,
} from './product-images.test-support.js';
import {
  ensureProductIndexes,
  productImagesCollection,
  productsCollection,
} from './products.model.js';
import {
  createProductsService,
  ORPHAN_IMAGE_TTL_MS,
} from './products.service.js';

const databaseName = `kofi_products_test_${randomUUID().replaceAll('-', '')}`;
let connection: DatabaseConnection;
let imagesDir: string;
let images: ImageStore;
let time = Date.parse('2026-10-20T12:00:00.000Z');
const clock = () => new Date(time);
let app: ReturnType<typeof createApp>;
let headers: Record<string, string>;

async function newSession() {
  const binding = randomBytes(32).toString('base64url');
  const result = await createSessionsService(connection.db, clock).create(
    new ObjectId(),
    'Products test',
    binding,
  );
  return {
    Authorization: `Bearer ${result.sessionToken}`,
    'X-Tab-Authorization': binding,
  };
}

type Body = Record<string, unknown>;
let categoryId: string;
const productInput = (overrides: Body = {}): Body => ({
  name: 'Café americano',
  description: 'Café filtrado de la casa.',
  priceTenths: 105,
  categoryId,
  imageId: null,
  ...overrides,
});
const createCategory = async (name: string) =>
  (
    await request(app)
      .post('/api/categories')
      .set(headers)
      .send({ name })
      .expect(201)
  ).body.id as string;
const create = (overrides: Body = {}) =>
  request(app).post('/api/products').set(headers).send(productInput(overrides));
const list = () => request(app).get('/api/products').set(headers);
const upload = (bytes: Buffer, type = 'application/octet-stream') =>
  request(app)
    .post('/api/product-images')
    .set(headers)
    .set('Content-Type', type)
    .send(bytes);
const productCount = () => productsCollection(connection.db).countDocuments();
const categoryCounter = async (id: string) =>
  (
    await categoriesCollection(connection.db).findOne({
      _id: new ObjectId(id),
    })
  )?.productCount;
const fieldsOf = (response: { body: unknown }) =>
  (response.body as { error: { details: { fields: unknown[] } } }).error.details
    .fields;

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
  imagesDir = await mkdtemp(join(tmpdir(), 'kofi-product-images-'));
}, 30_000);
beforeEach(async () => {
  time += 1_000_000;
  await productsCollection(connection.db).deleteMany({});
  await productImagesCollection(connection.db).deleteMany({});
  await categoriesCollection(connection.db).deleteMany({});
  await rm(imagesDir, { recursive: true, force: true });
  images = createImageStore(imagesDir);
  await images.prepare();
  app = createApp({ db: connection.db, clock, productImages: images });
  headers = await newSession();
  categoryId = await createCategory('Bebidas calientes');
});
afterAll(async () => {
  if (imagesDir) await rm(imagesDir, { recursive: true, force: true });
  if (!connection) return;
  try {
    if (
      connection.db.databaseName !== databaseName ||
      !/^kofi_products_test_[a-f0-9]{32}$/.test(databaseName)
    )
      throw new Error('Unsafe cleanup target');
    await connection.db.dropDatabase();
  } finally {
    await connection.client.close();
  }
});

test('CA-01/CA-06 a registered product is read back with its saved data, one category and active', async () => {
  const created = await create({
    name: '  Café americano ',
    description: '\tCafé filtrado de la casa. ',
  }).expect(201);
  expect(Object.keys(created.body).sort()).toEqual([
    'active',
    'categoryId',
    'description',
    'id',
    'imageId',
    'name',
    'priceTenths',
    'version',
  ]);
  expect(created.body).toMatchObject({
    name: 'Café americano',
    description: 'Café filtrado de la casa.',
    priceTenths: 105,
    categoryId,
    imageId: null,
    active: true,
    version: 1,
  });
  expect(created.body.id).toMatch(/^[a-f0-9]{24}$/);
  expect(created.headers['cache-control']).toBe('no-store');
  expect((await list().expect(200)).body).toEqual({ items: [created.body] });
  const read = await request(app)
    .get(`/api/products/${created.body.id as string}`)
    .set(headers)
    .expect(200);
  expect(read.body).toEqual(created.body);
  const stored = await productsCollection(connection.db).findOne({
    _id: new ObjectId(created.body.id as string),
  });
  expect(stored).toMatchObject({
    nameKey: 'café americano',
    categoryId: new ObjectId(categoryId),
    imageId: null,
    active: true,
  });
  expect(await categoryCounter(categoryId)).toBe(1);
});

test('CA-01/CA-02 a missing or empty required field produces no product', async () => {
  for (const field of ['name', 'description', 'priceTenths', 'categoryId']) {
    const body = productInput();
    delete body[field];
    const rejected = await request(app)
      .post('/api/products')
      .set(headers)
      .send(body);
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.code).toBe('VALIDATION_ERROR');
    expect(fieldsOf(rejected)).toEqual([{ field, code: 'INVALID_FORMAT' }]);
  }
  for (const [field, value] of [
    ['name', '   '],
    ['description', ''],
  ] as const) {
    const rejected = await create({ [field]: value }).expect(400);
    expect(fieldsOf(rejected)).toEqual([{ field, code: 'TOO_SHORT' }]);
  }
  expect(await productCount()).toBe(0);
  expect(await categoryCounter(categoryId)).toBe(0);
});

test('CA-01 the category must exist; a malformed one is a format error', async () => {
  const unknown = await create({ categoryId: new ObjectId().toHexString() });
  expect(unknown.status).toBe(400);
  expect(fieldsOf(unknown)).toEqual([
    { field: 'categoryId', code: 'NOT_ALLOWED' },
  ]);
  const malformed = await create({ categoryId: 'bebidas' }).expect(400);
  expect(fieldsOf(malformed)).toEqual([
    { field: 'categoryId', code: 'INVALID_FORMAT' },
  ]);
  expect(await productCount()).toBe(0);
});

test('CA-02 duplicates ignore case and edge spaces, keep accents, and include inactive products', async () => {
  await create({ name: 'Café' }).expect(201);
  for (const name of [' café ', 'CAFÉ', 'Café', '\tcAfÉ\n', 'Café']) {
    const duplicate = await create({ name });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({
      error: { code: 'DUPLICATE_NAME', message: expect.any(String) },
    });
  }
  await create({ name: 'Cafe' }).expect(201);
  const other = await createCategory('Postres');
  const inactive = await create({ name: 'Brownie', categoryId: other }).expect(
    201,
  );
  await productsCollection(connection.db).updateOne(
    { _id: new ObjectId(inactive.body.id as string) },
    { $set: { active: false } },
  );
  await create({ name: '  BROWNIE ' }).expect(409);
  expect(await productCount()).toBe(3);
  // Rejected attempts left no counter behind.
  expect(await categoryCounter(categoryId)).toBe(2);
  expect(await categoryCounter(other)).toBe(1);
});

test('CA-02 ten simultaneous creations of the same compared name admit exactly one', async () => {
  const other = await createCategory('Bebidas frías');
  const names = ['Té verde', ' té verde', 'TÉ VERDE', 'Té verde ', 'té VERDE'];
  const results = await Promise.all(
    [...names, ...names].map((name, index) =>
      create({ name, categoryId: index % 2 ? other : categoryId }),
    ),
  );
  const statuses = results.map((result) => result.status).sort();
  expect(statuses).toEqual([201, 409, 409, 409, 409, 409, 409, 409, 409, 409]);
  expect(await productCount()).toBe(1);
  const counters =
    ((await categoryCounter(categoryId)) ?? 0) +
    ((await categoryCounter(other)) ?? 0);
  expect(counters).toBe(1);
}, 60_000);

test('CA-03 price: positive integer tenths accepted, zero/negative/fractional/unsafe rejected', async () => {
  const accepted = [1, 100, Number.MAX_SAFE_INTEGER];
  for (const [index, priceTenths] of accepted.entries())
    expect(
      (await create({ name: `Precio ${index}`, priceTenths }).expect(201)).body
        .priceTenths,
    ).toBe(priceTenths);
  for (const [priceTenths, code] of [
    [0, 'OUT_OF_RANGE'],
    [-10, 'OUT_OF_RANGE'],
    [10.5, 'INVALID_FORMAT'],
    [Number.MAX_SAFE_INTEGER + 1, 'OUT_OF_RANGE'],
    ['105', 'INVALID_FORMAT'],
  ] as const) {
    const rejected = await create({ name: 'Rechazado', priceTenths });
    expect(rejected.status).toBe(400);
    expect(fieldsOf(rejected)).toEqual([{ field: 'priceTenths', code }]);
  }
  expect(await productCount()).toBe(3);
});

test('CA-07 name and description limits in visible characters', async () => {
  await create({ name: ` ${'ñ'.repeat(100)} ` }).expect(201);
  await create({ name: '👨‍👩‍👧'.repeat(100) }).expect(201);
  await create({ name: 'Largo', description: 'ñ'.repeat(1000) }).expect(201);
  for (const [field, value, code] of [
    ['name', 'a'.repeat(101), 'TOO_LONG'],
    ['name', 'ñ'.repeat(101), 'TOO_LONG'],
    ['description', 'ñ'.repeat(1001), 'TOO_LONG'],
    ['description', ' \n\t ', 'TOO_SHORT'],
  ] as const) {
    const rejected = await create({ name: 'Otro', [field]: value });
    expect(rejected.status).toBe(400);
    expect(fieldsOf(rejected)).toEqual([{ field, code }]);
  }
  expect(await productCount()).toBe(3);
});

test('CA-01 vs US-008 deletion: concurrent assignment and deletion never leave an orphan', async () => {
  for (let round = 0; round < 20; round++) {
    const target = await createCategory(`Temporal ${round}`);
    const id = new ObjectId(target);
    // The deletion contract of TASK-020: only with a zero counter, in a transaction.
    const remove = async () => {
      const session = connection.client.startSession();
      try {
        let deleted = 0;
        await session.withTransaction(async () => {
          deleted = (
            await categoriesCollection(connection.db).deleteOne(
              { _id: id, productCount: 0 },
              { session },
            )
          ).deletedCount;
        });
        return deleted;
      } finally {
        await session.endSession();
      }
    };
    const [created, deleted] = await Promise.all([
      create({ name: `Producto ${round}`, categoryId: target }),
      remove(),
    ]);
    const category = await categoriesCollection(connection.db).findOne({
      _id: id,
    });
    if (created.status === 201) {
      expect(deleted).toBe(0);
      expect(category?.productCount).toBe(1);
    } else {
      expect(created.status).toBe(400);
      expect(fieldsOf(created)).toEqual([
        { field: 'categoryId', code: 'NOT_ALLOWED' },
      ]);
      expect(deleted).toBe(1);
      expect(category).toBeNull();
    }
  }
  // Every product references an existing category with a matching counter.
  const products = await productsCollection(connection.db).find().toArray();
  for (const product of products) {
    const category = await categoriesCollection(connection.db).findOne({
      _id: product.categoryId,
    });
    expect(category).not.toBeNull();
    expect(category?.productCount).toBe(
      await productsCollection(connection.db).countDocuments({
        categoryId: product.categoryId,
      }),
    );
  }
}, 120_000);

test('CA-01 a category deleted before the creation rejects it without a product', async () => {
  await categoriesCollection(connection.db).deleteOne({
    _id: new ObjectId(categoryId),
    productCount: 0,
  });
  const rejected = await create();
  expect(rejected.status).toBe(400);
  expect(fieldsOf(rejected)).toEqual([
    { field: 'categoryId', code: 'NOT_ALLOWED' },
  ]);
  expect(await productCount()).toBe(0);
});

test('CA-04 a product without image is listed with imageId null', async () => {
  const created = await create().expect(201);
  expect(created.body.imageId).toBeNull();
  expect((await list().expect(200)).body.items[0].imageId).toBeNull();
});

test('CA-05 an uploaded image is associated on creation and served only then', async () => {
  const bytes = png({ width: 3, height: 2 });
  const uploaded = await upload(bytes).expect(201);
  expect(uploaded.body).toEqual({
    id: expect.stringMatching(/^[a-f0-9]{24}$/),
    width: 3,
    height: 2,
  });
  const imageId = uploaded.body.id as string;
  const path = `/api/product-images/${imageId}`;
  // Not associated yet: not readable.
  await request(app).get(path).set(headers).expect(404);
  const created = await create({ imageId }).expect(201);
  expect(created.body.imageId).toBe(imageId);
  // Supertest buffers image/* bodies as a Buffer.
  const served = await request(app).get(path).set(headers).expect(200);
  expect(Buffer.isBuffer(served.body)).toBe(true);
  expect(Buffer.compare(served.body as Buffer, bytes)).toBe(0);
  expect(served.headers['content-type']).toBe('image/png');
  expect(served.headers['x-content-type-options']).toBe('nosniff');
  expect(served.headers['content-security-policy']).toBe(
    "default-src 'none'; sandbox",
  );
  expect(served.headers['cache-control']).toBe('no-store');
  expect(await readdir(imagesDir)).toEqual([imageId]);
  // An image belongs to one product only.
  const reused = await create({ name: 'Otro', imageId });
  expect(reused.status).toBe(400);
  expect(fieldsOf(reused)).toEqual([{ field: 'imageId', code: 'NOT_ALLOWED' }]);
  const missing = await create({
    name: 'Sin imagen real',
    imageId: new ObjectId().toHexString(),
  });
  expect(fieldsOf(missing)).toEqual([
    { field: 'imageId', code: 'NOT_ALLOWED' },
  ]);
  expect(await productCount()).toBe(1);
  expect(await categoryCounter(categoryId)).toBe(1);
  await request(app)
    .get(`/api/product-images/${new ObjectId().toHexString()}`)
    .set(headers)
    .expect(404);
  await request(app).get('/api/product-images/x').set(headers).expect(404);
});

test('CA-05 a duplicate name releases the image claim (transaction rollback)', async () => {
  await create({ name: 'Té' }).expect(201);
  const imageId = (await upload(jpeg()).expect(201)).body.id as string;
  await create({ name: 'TÉ', imageId }).expect(409);
  const image = await productImagesCollection(connection.db).findOne({
    _id: new ObjectId(imageId),
  });
  expect(image?.productId).toBeNull();
  await create({ name: 'Té rojo', imageId }).expect(201);
});

test('CA-07 images accepted and rejected by real content, animation, dimensions and size', async () => {
  for (const bytes of [
    jpeg({ width: 4096, height: 4096 }),
    png({ width: 4096, height: 1 }),
    webpLossless({ width: 1, height: 4096 }),
    webpLossy(),
  ])
    await upload(bytes).expect(201);
  for (const [bytes, code] of [
    [svg(), 'INVALID_FORMAT'],
    [gif(), 'INVALID_FORMAT'],
    [apng(), 'INVALID_FORMAT'],
    [webpAnimated(), 'INVALID_FORMAT'],
    [png().subarray(0, 40), 'INVALID_FORMAT'],
    [png({ width: 4097, height: 1 }), 'OUT_OF_RANGE'],
    [jpeg({ width: 1, height: 4097 }), 'OUT_OF_RANGE'],
    [Buffer.alloc(0), 'REQUIRED'],
  ] as const) {
    const rejected = await upload(Buffer.from(bytes));
    expect(rejected.status).toBe(400);
    expect(fieldsOf(rejected)).toEqual([{ field: 'image', code }]);
  }
  // The declared type is not trusted: only application/octet-stream travels.
  const declared = await upload(png(), 'image/png');
  expect(declared.status).toBe(415);
  expect(declared.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  expect(await productImagesCollection(connection.db).countDocuments()).toBe(4);
  expect((await readdir(imagesDir)).length).toBe(4);
});

test('CA-07 size frontier: 5.242.880 bytes accepted, 5.242.881 rejected with 413', async () => {
  await upload(pngOfSize(5_242_880)).expect(201);
  const tooLarge = await upload(Buffer.alloc(5_242_881, 1));
  expect(tooLarge.status).toBe(413);
  expect(tooLarge.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  expect(await productImagesCollection(connection.db).countDocuments()).toBe(1);
}, 30_000);

test('orphan images older than 24 h are removed on upload; associated ones are kept', async () => {
  const kept = (await upload(png()).expect(201)).body.id as string;
  await create({ imageId: kept }).expect(201);
  const orphan = (await upload(png()).expect(201)).body.id as string;
  const recent = (await upload(png()).expect(201)).body.id as string;
  time += ORPHAN_IMAGE_TTL_MS - 1000;
  await productImagesCollection(connection.db).updateOne(
    { _id: new ObjectId(recent) },
    { $set: { createdAt: clock() } },
  );
  time += 1001;
  // Sessions expire after 120 s; the 24 h jump needs a fresh one.
  headers = await newSession();
  const trigger = (await upload(png()).expect(201)).body.id as string;
  const remaining = (
    await productImagesCollection(connection.db).find().toArray()
  )
    .map((image) => image._id.toHexString())
    .sort();
  expect(remaining).toEqual([kept, recent, trigger].sort());
  expect((await readdir(imagesDir)).sort()).toEqual(remaining);
  expect(remaining).not.toContain(orphan);
});

test('startup cleanup removes old files without metadata and interrupted uploads only', async () => {
  const kept = (await upload(png()).expect(201)).body.id as string;
  await create({ imageId: kept }).expect(201);
  const stray = new ObjectId().toHexString();
  const recentStray = new ObjectId().toHexString();
  await writeFile(join(imagesDir, stray), png());
  await writeFile(join(imagesDir, `${stray}.tmp`), png());
  await writeFile(join(imagesDir, recentStray), png());
  await writeFile(join(imagesDir, 'notes.txt'), 'not managed');
  const old = new Date(time - ORPHAN_IMAGE_TTL_MS - 60_000);
  for (const name of [stray, `${stray}.tmp`, kept, 'notes.txt'])
    await utimes(join(imagesDir, name), old, old);
  const recent = new Date(time);
  await utimes(join(imagesDir, recentStray), recent, recent);
  await createProductsService(connection.db, images, clock).cleanupOrphanImages(
    { scanFiles: true },
  );
  expect((await readdir(imagesDir)).sort()).toEqual(
    [kept, recentStray, 'notes.txt'].sort(),
  );
});

test('CA-08 list: active first, then inactive; Spanish alphabetical order inside each state', async () => {
  const other = await createCategory('Postres');
  const inactive: ObjectId[] = [];
  for (const [name, category, active] of [
    ['Zumo', categoryId, true],
    ['Ñoqui', other, true],
    ['nata', other, false],
    ['Agua', categoryId, false],
    ['Brownie', other, true],
    ['Café', categoryId, true],
  ] as const) {
    const created = await create({ name, categoryId: category }).expect(201);
    if (!active) inactive.push(new ObjectId(created.body.id as string));
  }
  await productsCollection(connection.db).updateMany(
    { _id: { $in: inactive } },
    { $set: { active: false } },
  );
  const items = (await list().expect(200)).body.items as {
    name: string;
    active: boolean;
    categoryId: string;
  }[];
  expect(items.map((item) => [item.name, item.active])).toEqual([
    ['Brownie', true],
    ['Café', true],
    ['Ñoqui', true],
    ['Zumo', true],
    ['Agua', false],
    ['nata', false],
  ]);
  expect(new Set(items.map((item) => item.categoryId))).toEqual(
    new Set([categoryId, other]),
  );
});

test('CA-11 (server) an empty catalog is an empty list; a read failure is a sanitized 500', async () => {
  expect((await list().expect(200)).body).toEqual({ items: [] });
  const db = {
    collection: (name: string) =>
      name === 'products'
        ? {
            find: () => ({
              toArray: async () => {
                throw new Error('secret-db-diagnostic');
              },
            }),
          }
        : connection.db.collection(name),
  } as unknown as Db;
  const failing = await request(createApp({ db, clock, productImages: images }))
    .get('/api/products')
    .set(headers);
  expect(failing.status).toBe(500);
  expect(failing.body.error.code).toBe('INTERNAL_ERROR');
  expect(failing.body).not.toHaveProperty('items');
  expect(JSON.stringify(failing.body)).not.toContain('secret-db-diagnostic');
});

test('US-001 every product endpoint requires a valid session of the same tab', async () => {
  const id = new ObjectId().toHexString();
  const other = randomBytes(32).toString('base64url');
  for (const set of [
    {},
    { Authorization: headers.Authorization! },
    { ...headers, 'X-Tab-Authorization': other },
  ]) {
    const attempts = [
      await request(app).get('/api/products').set(set),
      await request(app).get(`/api/products/${id}`).set(set),
      await request(app).post('/api/products').set(set).send(productInput()),
      await request(app)
        .post('/api/product-images')
        .set(set)
        .set('Content-Type', 'application/octet-stream')
        .send(png()),
      await request(app).get(`/api/product-images/${id}`).set(set),
    ];
    for (const result of attempts) {
      expect(result.status).toBe(401);
      expect(result.body.error.code).toBe('UNAUTHORIZED');
    }
  }
  expect(await productCount()).toBe(0);
  expect(await productImagesCollection(connection.db).countDocuments()).toBe(0);
});

test('error envelope: media type, query, unknown fields, unknown ids and methods', async () => {
  const cases = [
    await request(app)
      .post('/api/products')
      .set(headers)
      .type('text')
      .send('{}'),
    await request(app).get('/api/products?search=cafe').set(headers),
    await create({ stock: 3 }),
    await request(app).get('/api/products/zzz').set(headers),
    await request(app)
      .get(`/api/products/${new ObjectId().toHexString()}`)
      .set(headers),
    await request(app).delete('/api/products').set(headers),
    await request(app).get('/api/products/').set(headers),
  ];
  expect(
    cases.map((result) => [result.status, result.body.error.code]),
  ).toEqual([
    [415, 'UNSUPPORTED_MEDIA_TYPE'],
    [400, 'VALIDATION_ERROR'],
    [400, 'VALIDATION_ERROR'],
    [404, 'NOT_FOUND'],
    [404, 'NOT_FOUND'],
    [404, 'NOT_FOUND'],
    [404, 'NOT_FOUND'],
  ]);
  expect(fieldsOf(cases[2]!)).toContainEqual({
    field: '',
    code: 'NOT_ALLOWED',
  });
  expect(await productCount()).toBe(0);
});
