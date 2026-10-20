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
  PRODUCT_VERSION_CONFLICT_MESSAGE,
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

// --- US-007 (TASK-018): edition -------------------------------------------

const patch = (id: string, body: Body, set: Record<string, string> = headers) =>
  request(app).patch(`/api/products/${id}`).set(set).send(body);
// US-009 (TASK-022): activation shares the version of the edition.
const activation = (
  id: string,
  body: Body,
  set: Record<string, string> = headers,
) => request(app).patch(`/api/products/${id}/activation`).set(set).send(body);
const readImage = (id: string) =>
  request(app).get(`/api/product-images/${id}`).set(headers);
const stored = (id: string) =>
  productsCollection(connection.db).findOne({ _id: new ObjectId(id) });
const createdId = async (overrides: Body = {}) =>
  (await create(overrides).expect(201)).body.id as string;
// The deletion contract of TASK-020: only with a zero counter, in a transaction.
async function removeCategoryIfEmpty(id: string) {
  const session = connection.client.startSession();
  try {
    let deleted = 0;
    await session.withTransaction(async () => {
      deleted = (
        await categoriesCollection(connection.db).deleteOne(
          { _id: new ObjectId(id), productCount: 0 },
          { session },
        )
      ).deletedCount;
    });
    return deleted;
  } finally {
    await session.endSession();
  }
}
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

test('US-007 CA-01 edits every field under the same identity and shows the saved data', async () => {
  const id = await createdId();
  const other = await createCategory('Postres');
  const before = await stored(id);
  const updated = await patch(id, {
    version: 1,
    name: '  Café de olla ',
    description: 'Con canela y piloncillo.',
    priceTenths: 125,
    categoryId: other,
  });
  expect(updated.status).toBe(200);
  expect(updated.body).toEqual({
    id,
    name: 'Café de olla',
    description: 'Con canela y piloncillo.',
    priceTenths: 125,
    categoryId: other,
    imageId: null,
    active: true,
    version: 2,
  });
  const read = await request(app).get(`/api/products/${id}`).set(headers);
  expect(read.body).toEqual(updated.body);
  expect((await list().expect(200)).body.items).toEqual([updated.body]);
  const after = await stored(id);
  expect(after).toMatchObject({
    _id: before?._id,
    nameKey: 'café de olla',
    createdAt: before?.createdAt,
  });
  expect(after?.updatedAt).toEqual(clock());
  // Reassignment moves the reference without editing either category.
  expect(await categoryCounter(categoryId)).toBe(0);
  expect(await categoryCounter(other)).toBe(1);
  const categories = await categoriesCollection(connection.db).find().toArray();
  expect(categories.map((category) => category.version)).toEqual([1, 1]);
  // A save without effective changes is still a save: the version advances.
  const same = await patch(id, { version: 2, name: 'Café de olla' }).expect(
    200,
  );
  expect(same.body.version).toBe(3);
});

test('US-007 CA-02 the own name is no duplicate; another product name is, active or inactive', async () => {
  const id = await createdId({ name: 'Café' });
  const other = await createdId({ name: 'Brownie' });
  await productsCollection(connection.db).updateOne(
    { _id: new ObjectId(other) },
    { $set: { active: false } },
  );
  await patch(id, { version: 1, name: '  CAFÉ ' }).expect(200);
  expect((await stored(id))?.name).toBe('CAFÉ');
  const before = await stored(id);
  for (const name of ['Brownie', ' brownie ', 'BROWNIE']) {
    const duplicate = await patch(id, { version: 2, name });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({
      error: { code: 'DUPLICATE_NAME', message: expect.any(String) },
    });
  }
  expect(await stored(id)).toEqual(before);
  // Accents are kept: a different compared name.
  await patch(id, { version: 2, name: 'Cafe' }).expect(200);
});

test('US-007 CA-02 renaming against a simultaneous creation of the same name admits exactly one', async () => {
  for (let round = 0; round < 10; round++) {
    const id = await createdId({ name: `Mocha ${round}` });
    const [renamed, created] = await Promise.all([
      patch(id, { version: 1, name: `Latte ${round}` }),
      create({ name: ` LATTE ${round} ` }),
    ]);
    const statuses = [renamed.status, created.status];
    expect(statuses.filter((status) => status < 300)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(1);
    expect(
      await productsCollection(connection.db).countDocuments({
        nameKey: `latte ${round}`,
      }),
    ).toBe(1);
    if (renamed.status === 409) expect((await stored(id))?.version).toBe(1);
  }
  await expectCountersMatchProducts();
}, 120_000);

test('US-007 CA-02 invalid edits are rejected with the US-006 rules and change nothing', async () => {
  const id = await createdId();
  const before = await stored(id);
  const invalid: [Body, string, string][] = [
    [{ version: 1, name: '   ' }, 'name', 'TOO_SHORT'],
    [{ version: 1, name: 'ñ'.repeat(101) }, 'name', 'TOO_LONG'],
    [{ version: 1, description: '' }, 'description', 'TOO_SHORT'],
    [{ version: 1, priceTenths: 0 }, 'priceTenths', 'OUT_OF_RANGE'],
    [{ version: 1, priceTenths: 10.5 }, 'priceTenths', 'INVALID_FORMAT'],
    [{ version: 1, categoryId: null }, 'categoryId', 'INVALID_FORMAT'],
    [
      { version: 1, categoryId: new ObjectId().toHexString() },
      'categoryId',
      'NOT_ALLOWED',
    ],
    [{ name: 'Sin versión' }, 'version', 'INVALID_FORMAT'],
    [{ version: 1 }, '', 'REQUIRED'],
  ];
  for (const [body, field, code] of invalid) {
    const rejected = await patch(id, body);
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.code).toBe('VALIDATION_ERROR');
    expect(fieldsOf(rejected)).toEqual([{ field, code }]);
  }
  // Activation belongs to TASK-022: not editable here.
  const active = await patch(id, { version: 1, active: false });
  expect(active.status).toBe(400);
  expect(fieldsOf(active)).toContainEqual({ field: '', code: 'NOT_ALLOWED' });
  expect(await stored(id)).toEqual(before);
  expect(await categoryCounter(categoryId)).toBe(1);
});

test('US-007 CA-03 two sessions saving the same version: only the first valid save applies', async () => {
  const id = await createdId();
  const second = await newSession();
  const [left, right] = await Promise.all([
    patch(id, { version: 1, name: 'Café de olla' }),
    patch(id, { version: 1, name: 'Café tostado', priceTenths: 120 }, second),
  ]);
  expect([left.status, right.status].sort()).toEqual([200, 409]);
  const winner = left.status === 200 ? left : right;
  const loser = left.status === 200 ? right : left;
  expect(winner.body.version).toBe(2);
  expect(loser.body).toEqual({
    error: {
      code: 'VERSION_CONFLICT',
      message: PRODUCT_VERSION_CONFLICT_MESSAGE,
      details: { current: winner.body },
    },
  });
  expect(PRODUCT_VERSION_CONFLICT_MESSAGE).toBe(
    'Este producto cambió mientras lo editabas. Revisa la versión actual y vuelve a aplicar tus cambios.',
  );
  // A stale save made later is rejected too, without overwriting.
  const before = await stored(id);
  const stale = await patch(id, { version: 1, description: 'Pisado' });
  expect(stale.status).toBe(409);
  expect(stale.body.error.details.current).toEqual(winner.body);
  expect(await stored(id)).toEqual(before);
  // Reloading the current version allows applying the changes again.
  await patch(id, { version: 2, description: 'Reaplicado' }).expect(200);
}, 30_000);

test('US-007 CA-03 / US-009 CA-05 edition and activation share the version of the product', async () => {
  const id = await createdId();
  await activation(id, { version: 1, active: false }).expect(200);
  // An edition of the old version cannot overwrite the deactivation.
  const edit = await patch(id, { version: 1, name: 'Renombrado' });
  expect(edit.status).toBe(409);
  expect(edit.body).toEqual({
    error: {
      code: 'VERSION_CONFLICT',
      message: PRODUCT_VERSION_CONFLICT_MESSAGE,
      details: { current: expect.any(Object) },
    },
  });
  expect(edit.body.error.details.current).toMatchObject({
    active: false,
    version: 2,
    name: 'Café americano',
  });
  // Nor can a stale activation overwrite an edition.
  await patch(id, { version: 2, name: 'Renombrado' }).expect(200);
  const stale = await activation(id, { version: 2, active: true });
  expect(stale.status).toBe(409);
  expect(stale.body.error).toMatchObject({
    code: 'VERSION_CONFLICT',
    message: PRODUCT_VERSION_CONFLICT_MESSAGE,
    details: {
      current: { name: 'Renombrado', active: false, version: 3 },
    },
  });
  expect(await stored(id)).toMatchObject({
    name: 'Renombrado',
    active: false,
    version: 3,
  });
});

test('US-007 CA-04 the control is per product: distinct products save in parallel', async () => {
  const ids: string[] = [];
  for (let index = 0; index < 8; index++)
    ids.push(await createdId({ name: `Producto ${index}` }));
  const results = await Promise.all(
    ids.map((id, index) => patch(id, { version: 1, priceTenths: 200 + index })),
  );
  expect(results.map((result) => result.status)).toEqual(ids.map(() => 200));
  for (const [index, id] of ids.entries())
    expect(await stored(id)).toMatchObject({
      priceTenths: 200 + index,
      version: 2,
    });
}, 30_000);

test('US-007 reassignment against a concurrent category deletion never leaves an orphan', async () => {
  for (let round = 0; round < 15; round++) {
    const target = await createCategory(`Destino ${round}`);
    const id = await createdId({ name: `Producto ${round}` });
    const [edited, deleted] = await Promise.all([
      patch(id, { version: 1, categoryId: target }),
      removeCategoryIfEmpty(target),
    ]);
    if (edited.status === 200) {
      expect(deleted).toBe(0);
      expect(await categoryCounter(target)).toBe(1);
      expect((await stored(id))?.categoryId.toHexString()).toBe(target);
    } else {
      expect(edited.status).toBe(400);
      expect(fieldsOf(edited)).toEqual([
        { field: 'categoryId', code: 'NOT_ALLOWED' },
      ]);
      expect(deleted).toBe(1);
      const unchanged = await stored(id);
      expect(unchanged?.categoryId.toHexString()).toBe(categoryId);
      expect(unchanged?.version).toBe(1);
    }
  }
  await expectCountersMatchProducts();
}, 120_000);

test('US-007 CA-06 a failed new image keeps the previous image and data; a retry succeeds', async () => {
  const first = (await upload(png()).expect(201)).body.id as string;
  const id = await createdId({ imageId: first });
  const taken = (await upload(jpeg()).expect(201)).body.id as string;
  await createdId({ name: 'Otro', imageId: taken });
  const before = await stored(id);
  for (const imageId of [new ObjectId().toHexString(), taken]) {
    const failed = await patch(id, {
      version: 1,
      name: 'Nuevo nombre',
      imageId,
    });
    expect(failed.status).toBe(400);
    expect(fieldsOf(failed)).toEqual([
      { field: 'imageId', code: 'NOT_ALLOWED' },
    ]);
    expect(await stored(id)).toEqual(before);
    await readImage(first).expect(200);
  }
  // Retry with a fresh upload: replaces the image, the old one is removed.
  const second = (await upload(webpLossy()).expect(201)).body.id as string;
  const replaced = await patch(id, {
    version: 1,
    name: 'Nuevo nombre',
    imageId: second,
  }).expect(200);
  expect(replaced.body).toMatchObject({ imageId: second, version: 2 });
  await readImage(first).expect(404);
  await readImage(second).expect(200);
  expect(await readdir(imagesDir)).not.toContain(first);
  // Omitted image: kept.
  await patch(id, { version: 2, priceTenths: 99 }).expect(200);
  expect((await stored(id))?.imageId?.toHexString()).toBe(second);
  // CA-01 removing the image returns to the neutral marker.
  const removed = await patch(id, { version: 3, imageId: null }).expect(200);
  expect(removed.body.imageId).toBeNull();
  await readImage(second).expect(404);
  expect(await readdir(imagesDir)).not.toContain(second);
  expect(
    await productImagesCollection(connection.db).countDocuments({
      productId: new ObjectId(id),
    }),
  ).toBe(0);
});

test('US-007 CA-05 (catalog contribution) editing keeps the identity and never writes past sales', async () => {
  const sales = connection.db.collection('fixture_sales');
  await sales.deleteMany({});
  try {
    const id = await createdId();
    await sales.insertOne({
      productId: new ObjectId(id),
      name: 'Café americano',
      unitPriceTenths: 105,
      quantity: 2,
      amountTenths: 210,
    });
    const before = await sales.find().toArray();
    await patch(id, {
      version: 1,
      name: 'Café de especialidad',
      priceTenths: 150,
    }).expect(200);
    expect(await sales.find().toArray()).toEqual(before);
    const items = (await list().expect(200)).body.items as Body[];
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id, name: 'Café de especialidad' });
  } finally {
    await sales.deleteMany({});
  }
});

test('US-007 edition errors: unknown product, media type and session', async () => {
  const id = await createdId();
  const unknown = await patch(new ObjectId().toHexString(), {
    version: 1,
    name: 'x',
  });
  expect([unknown.status, unknown.body.error.code]).toEqual([404, 'NOT_FOUND']);
  const malformed = await patch('zzz', { version: 1, name: 'x' });
  expect([malformed.status, malformed.body.error.code]).toEqual([
    404,
    'NOT_FOUND',
  ]);
  const text = await request(app)
    .patch(`/api/products/${id}`)
    .set(headers)
    .type('text')
    .send('{}');
  expect([text.status, text.body.error.code]).toEqual([
    415,
    'UNSUPPORTED_MEDIA_TYPE',
  ]);
  const other = randomBytes(32).toString('base64url');
  for (const set of [
    {},
    { Authorization: headers.Authorization! },
    { ...headers, 'X-Tab-Authorization': other },
  ] as Record<string, string>[]) {
    const result = await patch(id, { version: 1, name: 'x' }, set);
    expect([result.status, result.body.error.code]).toEqual([
      401,
      'UNAUTHORIZED',
    ]);
  }
  expect((await stored(id))?.version).toBe(1);
});

// --- US-009 (TASK-022): activation ------------------------------------------

test('US-009 CA-01/CA-03 deactivating and reactivating changes only the state', async () => {
  const imageId = (await upload(jpeg()).expect(201)).body.id as string;
  const id = await createdId({ imageId });
  const original = await stored(id);
  time += 1000;
  const off = await activation(id, { version: 1, active: false });
  expect(off.status).toBe(200);
  expect(off.body).toEqual({
    id,
    name: 'Café americano',
    description: 'Café filtrado de la casa.',
    priceTenths: 105,
    categoryId,
    imageId,
    active: false,
    version: 2,
  });
  // The saved state is what administration reads back.
  expect(
    (await request(app).get(`/api/products/${id}`).set(headers).expect(200))
      .body,
  ).toEqual(off.body);
  expect((await list().expect(200)).body.items).toEqual([off.body]);
  // Identity, data, category and image are untouched; only the state moves.
  expect(await stored(id)).toEqual({
    ...original,
    active: false,
    version: 2,
    updatedAt: clock(),
  });
  await readImage(imageId).expect(200);
  expect(await categoryCounter(categoryId)).toBe(1);

  time += 1000;
  const on = await activation(id, { version: 2, active: true });
  expect(on.status).toBe(200);
  expect(on.body).toEqual({ ...off.body, active: true, version: 3 });
  expect(
    (await request(app).get(`/api/products/${id}`).set(headers).expect(200))
      .body,
  ).toEqual(on.body);
  expect(await stored(id)).toEqual({
    ...original,
    active: true,
    version: 3,
    updatedAt: clock(),
  });
  // Reactivated, not registered again.
  expect(await productCount()).toBe(1);
  expect(await categoryCounter(categoryId)).toBe(1);
});

test('US-009 asking for the current state on the current version changes nothing', async () => {
  const id = await createdId();
  const before = await stored(id);
  time += 1000;
  const same = await activation(id, { version: 1, active: true });
  expect(same.status).toBe(200);
  expect(same.body).toMatchObject({ id, active: true, version: 1 });
  expect(await stored(id)).toEqual(before);
  // With a stale version it is still a conflict.
  await activation(id, { version: 1, active: false }).expect(200);
  const stale = await activation(id, { version: 1, active: false });
  expect(stale.status).toBe(409);
  expect(stale.body.error).toMatchObject({
    code: 'VERSION_CONFLICT',
    message: PRODUCT_VERSION_CONFLICT_MESSAGE,
    details: { current: { id, active: false, version: 2 } },
  });
  expect((await stored(id))?.version).toBe(2);
});

test('US-009 CA-02 an inactive product stays in administration with its data and category', async () => {
  const other = await createCategory('Postres');
  const ids: Record<string, string> = {};
  for (const [name, category] of [
    ['Zumo', categoryId],
    ['Brownie', other],
    ['Agua', categoryId],
    ['Café', other],
  ] as const)
    ids[name] = await createdId({ name, categoryId: category });
  await activation(ids.Zumo!, { version: 1, active: false }).expect(200);
  await activation(ids.Brownie!, { version: 1, active: false }).expect(200);
  const items = (await list().expect(200)).body.items as Body[];
  // Single list: actives first, then inactives, alphabetical inside each.
  expect(items.map((item) => [item.name, item.active])).toEqual([
    ['Agua', true],
    ['Café', true],
    ['Brownie', false],
    ['Zumo', false],
  ]);
  expect(items.find((item) => item.id === ids.Brownie)).toMatchObject({
    categoryId: other,
    description: 'Café filtrado de la casa.',
    priceTenths: 105,
    version: 2,
  });
  const read = await request(app)
    .get(`/api/products/${ids.Zumo}`)
    .set(headers)
    .expect(200);
  expect(read.body).toMatchObject({
    id: ids.Zumo,
    name: 'Zumo',
    categoryId,
    active: false,
  });
});

test('US-009 CA-04 there is no permanent deletion of products', async () => {
  const id = await createdId();
  await activation(id, { version: 1, active: false }).expect(200);
  const before = await stored(id);
  for (const path of [
    `/api/products/${id}`,
    `/api/products/${id}/activation`,
    '/api/products',
  ]) {
    const result = await request(app).delete(path).set(headers);
    expect([result.status, result.body.error.code]).toEqual([404, 'NOT_FOUND']);
  }
  // Activation cannot be used to delete either.
  const deleting = await activation(id, {
    version: 2,
    active: false,
    deleted: true,
  });
  expect(deleting.status).toBe(400);
  expect(await stored(id)).toEqual(before);
  expect(await productCount()).toBe(1);
});

test('US-009 CA-05 two sessions changing the state of the same version: only the first applies', async () => {
  for (let round = 0; round < 10; round++) {
    const id = await createdId({ name: `Producto ${round}` });
    const second = await newSession();
    // Both sessions read v1 and save a deactivation at the same time.
    const [left, right] = await Promise.all([
      activation(id, { version: 1, active: false }),
      activation(id, { version: 1, active: false }, second),
    ]);
    expect([left.status, right.status].sort()).toEqual([200, 409]);
    const winner = left.status === 200 ? left : right;
    const loser = left.status === 200 ? right : left;
    expect(winner.body).toMatchObject({ active: false, version: 2 });
    expect(loser.body).toEqual({
      error: {
        code: 'VERSION_CONFLICT',
        message: PRODUCT_VERSION_CONFLICT_MESSAGE,
        details: { current: winner.body },
      },
    });
    // A later stale reactivation is rejected without overwriting.
    const before = await stored(id);
    const stale = await activation(id, { version: 1, active: true }, second);
    expect(stale.status).toBe(409);
    expect(stale.body.error.details.current).toEqual(winner.body);
    expect(await stored(id)).toEqual(before);
  }
  // Reloading the current version allows the change.
  const id = await createdId({ name: 'Recargado' });
  await activation(id, { version: 1, active: false }).expect(200);
  await activation(id, { version: 2, active: true }).expect(200);
}, 60_000);

test('US-009 CA-05 edition and deactivation racing on the same version: exactly one applies', async () => {
  for (let round = 0; round < 10; round++) {
    const id = await createdId({ name: `Producto ${round}` });
    const second = await newSession();
    const [edited, deactivated] = await Promise.all([
      patch(id, { version: 1, name: `Renombrado ${round}` }),
      activation(id, { version: 1, active: false }, second),
    ]);
    expect([edited.status, deactivated.status].sort()).toEqual([200, 409]);
    const after = await stored(id);
    expect(after?.version).toBe(2);
    if (edited.status === 200) {
      // The edition won: the deactivation did not apply.
      expect(after).toMatchObject({
        name: `Renombrado ${round}`,
        active: true,
      });
      expect(deactivated.body.error).toMatchObject({
        code: 'VERSION_CONFLICT',
        message: PRODUCT_VERSION_CONFLICT_MESSAGE,
        details: { current: edited.body },
      });
    } else {
      // The deactivation won: the edition did not apply.
      expect(after).toMatchObject({
        name: `Producto ${round}`,
        active: false,
      });
      expect(edited.body.error).toMatchObject({
        code: 'VERSION_CONFLICT',
        message: PRODUCT_VERSION_CONFLICT_MESSAGE,
        details: { current: deactivated.body },
      });
    }
  }
}, 60_000);

test('US-009 CA-05 the control is per product: distinct products change in parallel', async () => {
  const ids: string[] = [];
  for (let index = 0; index < 8; index++)
    ids.push(await createdId({ name: `Producto ${index}` }));
  const results = await Promise.all(
    ids.map((id) => activation(id, { version: 1, active: false })),
  );
  expect(results.map((result) => result.status)).toEqual(ids.map(() => 200));
  for (const id of ids)
    expect(await stored(id)).toMatchObject({ active: false, version: 2 });
  // Edition of one product and activation of another do not interfere.
  const [edited, activated] = await Promise.all([
    patch(ids[0]!, { version: 2, priceTenths: 300 }),
    activation(ids[1]!, { version: 2, active: true }),
  ]);
  expect([edited.status, activated.status]).toEqual([200, 200]);
  expect(await stored(ids[0]!)).toMatchObject({
    priceTenths: 300,
    active: false,
    version: 3,
  });
  expect(await stored(ids[1]!)).toMatchObject({
    priceTenths: 105,
    active: true,
    version: 3,
  });
}, 30_000);

test('US-009 / US-008 an inactive product still prevents deleting its category', async () => {
  const target = await createCategory('Temporada');
  const id = await createdId({ categoryId: target });
  await activation(id, { version: 1, active: false }).expect(200);
  // Deactivation keeps the reference: TASK-020's deletion contract refuses.
  expect(await categoryCounter(target)).toBe(1);
  expect(await removeCategoryIfEmpty(target)).toBe(0);
  expect(await stored(id)).toMatchObject({
    categoryId: new ObjectId(target),
    active: false,
  });
  await activation(id, { version: 2, active: true }).expect(200);
  expect(await categoryCounter(target)).toBe(1);
  expect(await removeCategoryIfEmpty(target)).toBe(0);
  await expectCountersMatchProducts();
});

test('US-009 (catalog contribution) activation keeps the identity and never writes past sales', async () => {
  const sales = connection.db.collection('fixture_sales');
  await sales.deleteMany({});
  try {
    const id = await createdId();
    await sales.insertOne({
      productId: new ObjectId(id),
      name: 'Café americano',
      unitPriceTenths: 105,
      quantity: 2,
      amountTenths: 210,
    });
    const before = await sales.find().toArray();
    await activation(id, { version: 1, active: false }).expect(200);
    await activation(id, { version: 2, active: true }).expect(200);
    expect(await sales.find().toArray()).toEqual(before);
    expect((await stored(id))?._id.toHexString()).toBe(id);
  } finally {
    await sales.deleteMany({});
  }
});

test('US-009 activation errors: validation, unknown product, media type, query and session', async () => {
  const id = await createdId();
  const before = await stored(id);
  const invalid: [Body, string, string][] = [
    [{ active: false }, 'version', 'INVALID_FORMAT'],
    [{ version: 0, active: false }, 'version', 'INVALID_FORMAT'],
    [{ version: 1 }, 'active', 'INVALID_FORMAT'],
    [{ version: 1, active: 'false' }, 'active', 'INVALID_FORMAT'],
    [{ version: 1, active: false, name: 'x' }, '', 'NOT_ALLOWED'],
  ];
  for (const [body, field, code] of invalid) {
    const rejected = await activation(id, body);
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.code).toBe('VALIDATION_ERROR');
    expect(fieldsOf(rejected)).toEqual([{ field, code }]);
  }
  const query = await request(app)
    .patch(`/api/products/${id}/activation?force=1`)
    .set(headers)
    .send({ version: 1, active: false });
  expect([query.status, query.body.error.code]).toEqual([
    400,
    'VALIDATION_ERROR',
  ]);
  for (const target of [new ObjectId().toHexString(), 'zzz']) {
    const missing = await activation(target, { version: 1, active: false });
    expect([missing.status, missing.body.error.code]).toEqual([
      404,
      'NOT_FOUND',
    ]);
  }
  const text = await request(app)
    .patch(`/api/products/${id}/activation`)
    .set(headers)
    .type('text')
    .send('{}');
  expect([text.status, text.body.error.code]).toEqual([
    415,
    'UNSUPPORTED_MEDIA_TYPE',
  ]);
  const other = randomBytes(32).toString('base64url');
  for (const set of [
    {},
    { Authorization: headers.Authorization! },
    { ...headers, 'X-Tab-Authorization': other },
  ] as Record<string, string>[]) {
    const result = await activation(id, { version: 1, active: false }, set);
    expect([result.status, result.body.error.code]).toEqual([
      401,
      'UNAUTHORIZED',
    ]);
  }
  expect(await stored(id)).toEqual(before);
});
