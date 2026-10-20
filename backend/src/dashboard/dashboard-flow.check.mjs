// Explicit local integration check, never used by the application or npm test.
// MONGODB_URI must be local. All accounts/catalog/sales live in a disposable DB.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { ObjectId } from 'mongodb';
import { createApp } from '../app.ts';
import { hashPassword } from '../auth/password.ts';
import {
  isolatedDashboardDatabase,
  testSale,
  testSource,
} from './dashboard.test-support.ts';
import {
  createAuthorizedHttpClient,
  createAuthorizedResponseClient,
} from '../../../frontend/src/auth/api/http-client.ts';
import { createRealDashboardClient } from '../../../frontend/src/dashboard/api/real-dashboard-client.ts';

const database = await isolatedDashboardDatabase();
let server;
let stop;
let events;
try {
  const now = new Date();
  const productId = new ObjectId();
  await database.db
    .collection('accounts')
    .insertOne({
      _id: new ObjectId(),
      username: 'isolated-dashboard',
      passwordHash: await hashPassword('isolated-test-only'),
      createdAt: now,
      updatedAt: now,
    });
  await database.db
    .collection(testSource.productsCollection)
    .insertOne({ _id: productId, name: 'Isolated product', active: false });
  await database.db
    .collection(testSource.salesCollection)
    .insertOne(testSale(productId, now.toISOString()));
  const app = createApp({ db: database.db, dashboardSource: testSource });
  events = app.locals.dashboardEvents;
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const binding = randomBytes(32).toString('base64url');
  const login = await fetch(`${origin}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'isolated-dashboard',
      password: 'isolated-test-only',
      tabBinding: binding,
    }),
  });
  assert.equal(login.status, 201);
  const { sessionToken } = await login.json();
  let unauthorized = false;
  const options = {
    origin,
    transport: (path, init) => fetch(new URL(String(path), origin), init),
    authorization: () => ({ token: sessionToken, binding, generation: 1 }),
    unauthorized: () => {
      unauthorized = true;
    },
  };
  const request = createAuthorizedHttpClient(options);
  const client = createRealDashboardClient({
    request,
    openStream: createAuthorizedResponseClient(options),
  });
  stop = client.start();
  async function until(predicate) {
    const deadline = Date.now() + 5000;
    while (!predicate()) {
      assert.ok(Date.now() < deadline, JSON.stringify(client.getSnapshot()));
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  await until(
    () =>
      client.getSnapshot().data?.summary.salesCount === 1 && events.size === 1,
  );
  await database.db
    .collection(testSource.salesCollection)
    .insertOne(testSale(productId, new Date().toISOString(), 'qr', 202));
  await events.publishPersistedSale(); // only after acknowledged persistence
  await until(() => client.getSnapshot().data?.summary.salesCount === 2);
  const snapshot = client.getSnapshot().data;
  assert.equal(snapshot.summary.revenueTenths, 303);
  assert.equal(snapshot.products[0].unitsSold, 2);
  assert.equal(
    snapshot.hourlySales.reduce((sum, entry) => sum + entry.salesCount, 0),
    2,
  );
  client.selectPeriod('month');
  await until(() => client.getSnapshot().data?.period === 'month');
  const logout = await request('/api/sessions/current', { method: 'DELETE' });
  assert.equal(logout.kind, 'ok');
  await until(
    () => unauthorized && client.getSnapshot().phase === 'unauthorized',
  );
  console.log(
    'PASS: isolated MongoDB + real credential login + authorized frontend HTTP/SSE + atomic 3-block update + month switch + logout/401.',
  );
} finally {
  stop?.();
  events?.close();
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await database.cleanup();
}
