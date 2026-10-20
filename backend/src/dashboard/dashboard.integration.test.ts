import { Long, ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { createApp } from '../app.js';
import { createDashboardService } from './dashboard.service.js';
import {
  isolatedDashboardDatabase,
  testNow,
  testSale,
  testSession,
  testSource,
} from './dashboard.test-support.js';

let database: Awaited<ReturnType<typeof isolatedDashboardDatabase>>;
const a = new ObjectId('000000000000000000000001');
const b = new ObjectId('000000000000000000000002');
let session: Awaited<ReturnType<typeof testSession>>;
let app: ReturnType<typeof createApp>;
beforeAll(async () => {
  database = await isolatedDashboardDatabase();
}, 30_000);
beforeEach(async () => {
  await database.db.collection(testSource.salesCollection).deleteMany({});
  await database.db.collection(testSource.productsCollection).deleteMany({});
  await database.db.collection(testSource.productsCollection).insertMany([
    { _id: a, name: 'Current A', active: false },
    { _id: b, name: 'Current B', active: true },
  ]);
  session = await testSession(database.db);
  app = createApp({
    db: database.db,
    dashboardSource: testSource,
    clock: () => testNow,
  });
});
afterAll(async () => {
  await database?.cleanup();
});
const get = (period = 'today') =>
  request(app).get(`/api/dashboard-periods/${period}`).set(session.headers);

test('HTTP empty today/month, no-store and exact 24 zeros', async () => {
  for (const period of ['today', 'month']) {
    const response = await get(period);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers.etag).toBeUndefined();
    expect(response.body.products).toEqual([]);
    expect(response.body.summary).toEqual({
      salesCount: 0,
      revenueTenths: 0,
      cashSalesCount: 0,
      qrSalesCount: 0,
    });
    expect(response.body.hourlySales).toEqual(
      Array.from({ length: 24 }, (_, hour) => ({ hour, salesCount: 0 })),
    );
  }
});
test('one snapshot: cash/QR, exact tenths, repeated/inactive/renamed products, UTC hour boundaries and future exclusion', async () => {
  await database.db
    .collection(testSource.salesCollection)
    .insertMany([
      testSale(a, '2026-10-19T03:59:59.999Z', 'cash', 50),
      testSale(a, '2026-10-19T04:00:00.000Z', 'cash', 101, 2),
      testSale(b, '2026-10-19T14:59:59.999Z', 'qr', 202),
      testSale(a, '2026-10-19T15:00:00.000Z', 'qr', 303),
      testSale(b, '2026-10-19T16:30:00.001Z'),
      testSale(a, '2026-09-30T23:00:00.000Z'),
      { ...testSale(a, '2026-10-19T15:00:00.000Z'), registered: false },
    ]);
  const today = await get();
  expect(today.status).toBe(200);
  expect(today.body.summary).toEqual({
    salesCount: 3,
    revenueTenths: 606,
    cashSalesCount: 1,
    qrSalesCount: 2,
  });
  expect(today.body.products).toEqual([
    {
      productId: a.toHexString(),
      currentName: 'Current A',
      unitsSold: 3,
      revenueTenths: 404,
    },
    {
      productId: b.toHexString(),
      currentName: 'Current B',
      unitsSold: 1,
      revenueTenths: 202,
    },
  ]);
  expect(today.body.hourlySales[0].salesCount).toBe(1);
  expect(today.body.hourlySales[10].salesCount).toBe(1);
  expect(today.body.hourlySales[11].salesCount).toBe(1);
  const month = await get('month');
  expect(month.body.summary.salesCount).toBe(4);
  expect(month.body.hourlySales[23].salesCount).toBe(1);
  await database.db
    .collection(testSource.productsCollection)
    .updateOne({ _id: a }, { $set: { name: 'Renamed', priceTenths: 99999 } });
  expect((await get()).body.products[0]).toEqual({
    ...today.body.products[0],
    currentName: 'Renamed',
  });
});
test('multi-line sale counts once; recent sale beats quantity and ties use productId', async () => {
  const sale = testSale(a, '2026-10-19T15:00:00.000Z');
  sale.lines.push({
    productId: b,
    quantity: Long.fromNumber(100),
    revenueTenths: Long.fromNumber(202),
  });
  sale.totalTenths = Long.fromNumber(303);
  await database.db.collection(testSource.salesCollection).insertOne(sale);
  const response = await get();
  expect(response.body.summary.salesCount).toBe(1);
  expect(
    response.body.products.map((p: { productId: string }) => p.productId),
  ).toEqual([a.toHexString(), b.toHexString()]);
  await database.db
    .collection(testSource.salesCollection)
    .insertOne(testSale(a, '2026-10-19T16:00:00.000Z'));
  expect((await get()).body.products[0].productId).toBe(a.toHexString());
});
test('month sums the same hour over different days, without averaging', async () => {
  await database.db
    .collection(testSource.salesCollection)
    .insertMany([
      testSale(a, '2026-10-02T14:00:00.000Z'),
      testSale(a, '2026-10-19T14:00:00.000Z'),
    ]);
  expect((await get('month')).body.hourlySales[10].salesCount).toBe(2);
  expect((await get()).body.hourlySales[10].salesCount).toBe(1);
});
test.each([
  'unknown-method',
  'broken-reference',
  'line-total',
  'double',
  'overflow',
  'quantity',
])('controlled integrity error: %s', async (mode) => {
  const sale = testSale(a, '2026-10-19T15:00:00.000Z');
  if (mode === 'unknown-method') sale.paymentMethod = 'card';
  if (mode === 'broken-reference') sale.lines[0]!.productId = new ObjectId();
  if (mode === 'line-total') sale.totalTenths = Long.fromNumber(102);
  if (mode === 'quantity') sale.lines[0]!.quantity = Long.ZERO;
  if (mode === 'overflow') {
    sale.totalTenths = Long.fromString('9007199254740992');
    sale.lines[0]!.revenueTenths = sale.totalTenths;
  }
  await database.db.collection(testSource.salesCollection).insertOne(sale);
  if (mode === 'double')
    await database.db
      .collection(testSource.salesCollection)
      .updateMany({}, { $set: { totalTenths: 1.1 } });
  const response = await get();
  expect(response.status).toBe(500);
  expect(response.body.error.code).toBe('INTERNAL_ERROR');
});
test('MAX_SAFE_INTEGER exact, aggregate overflow rejected without rounded result', async () => {
  await database.db
    .collection(testSource.salesCollection)
    .insertOne(
      testSale(a, '2026-10-19T15:00:00.000Z', 'cash', Number.MAX_SAFE_INTEGER),
    );
  expect((await get()).body.summary.revenueTenths).toBe(
    Number.MAX_SAFE_INTEGER,
  );
  await database.db
    .collection(testSource.salesCollection)
    .insertOne(testSale(a, '2026-10-19T15:01:00.000Z', 'qr', 1));
  expect((await get()).status).toBe(500);
});
test('snapshot remains internally coherent during concurrent writes', async () => {
  const service = createDashboardService(
    database.db,
    testSource,
    () => testNow,
  );
  const write = (async () => {
    for (let i = 0; i < 25; i++)
      await database.db
        .collection(testSource.salesCollection)
        .insertOne(testSale(a, '2026-10-19T15:00:00.000Z'));
  })();
  for (let i = 0; i < 10; i++) {
    const result = await service.read('today');
    expect(result.summary.revenueTenths).toBe(result.summary.salesCount * 101);
    expect(
      result.products.reduce((sum, row) => sum + row.revenueTenths, 0),
    ).toBe(result.summary.revenueTenths);
    expect(
      result.hourlySales.reduce((sum, row) => sum + row.salesCount, 0),
    ).toBe(result.summary.salesCount);
  }
  await write;
});
test('strict HTTP errors and real session authorization', async () => {
  expect((await get('year')).status).toBe(400);
  expect((await get().query({ period: 'month' })).status).toBe(400);
  expect((await get().send({})).status).toBe(400);
  expect((await request(app).get('/api/dashboard-periods/today')).status).toBe(
    401,
  );
  expect(
    (
      await request(app)
        .post('/api/dashboard-periods/today')
        .set(session.headers)
    ).status,
  ).toBe(404);
  expect((await get().set('X-Tab-Authorization', 'bad')).status).toBe(401);
  await request(app).delete('/api/sessions/current').set(session.headers);
  expect((await get()).status).toBe(401);
});
test('expired session rejected; missing producer is error, never fabricated empty', async () => {
  const expired = createApp({
    db: database.db,
    dashboardSource: testSource,
    clock: () => new Date(testNow.getTime() + 120_000),
  });
  expect(
    (
      await request(expired)
        .get('/api/dashboard-periods/today')
        .set(session.headers)
    ).status,
  ).toBe(401);
  const unconnected = createApp({ db: database.db, clock: () => testNow });
  expect(
    (
      await request(unconnected)
        .get('/api/dashboard-periods/today')
        .set(session.headers)
    ).status,
  ).toBe(500);
});

test('explicit demonstration uses real authorized routes without writing sales; real source takes priority', async () => {
  const demoApp = createApp({
    db: database.db,
    dashboardDemo: true,
    clock: () => testNow,
  });
  try {
    const before = await database.db
      .collection(testSource.salesCollection)
      .countDocuments();
    const today = await request(demoApp)
      .get('/api/dashboard-periods/today')
      .set(session.headers);
    const month = await request(demoApp)
      .get('/api/dashboard-periods/month')
      .set(session.headers);
    expect(today.status).toBe(200);
    expect(today.headers['x-kofi-dashboard-mode']).toBe('demo');
    expect(today.body.summary.salesCount).toBe(8);
    expect(month.body.summary.salesCount).toBeGreaterThan(
      today.body.summary.salesCount,
    );
    expect(
      await database.db.collection(testSource.salesCollection).countDocuments(),
    ).toBe(before);
    expect(
      (await request(demoApp).get('/api/dashboard-periods/today')).status,
    ).toBe(401);
    const realApp = createApp({
      db: database.db,
      dashboardSource: testSource,
      dashboardDemo: true,
      clock: () => testNow,
    });
    const real = await request(realApp)
      .get('/api/dashboard-periods/today')
      .set(session.headers);
    expect(real.headers['x-kofi-dashboard-mode']).toBeUndefined();
    expect(real.body.summary.salesCount).toBe(0);
  } finally {
    demoApp.locals.dashboardEvents.close();
  }
});
