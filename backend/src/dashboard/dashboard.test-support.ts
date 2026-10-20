import { randomBytes, randomUUID } from 'node:crypto';
import { Long, ObjectId, type Db } from 'mongodb';
import { connectDatabase } from '../shared/database/connect-database.js';
import { createSessionsService } from '../auth/sessions.service.js';
import type { DashboardSource } from './dashboard.contract.js';

/** Test-only physical schema; never installed or seeded in the principal DB. */
export const testSource: DashboardSource = {
  salesCollection: 'fixture_sales',
  productsCollection: 'fixture_products',
  salesProjection: [
    { $match: { registered: true } },
    {
      $project: { registeredAt: 1, paymentMethod: 1, totalTenths: 1, lines: 1 },
    },
  ],
  productProjection: [{ $project: { currentName: '$name' } }],
};
export async function isolatedDashboardDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Explicit local MONGODB_URI required');
  const target = new URL(uri);
  if (
    target.protocol !== 'mongodb:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
    target.username ||
    target.password
  )
    throw new Error('Local MongoDB only');
  const name = `kofi_dashboard_test_${randomUUID().replaceAll('-', '')}`;
  const connection = await connectDatabase(uri, name);
  await connection.db.createCollection(testSource.salesCollection);
  await connection.db.createCollection(testSource.productsCollection);
  await connection.db
    .collection(testSource.salesCollection)
    .createIndex({ registeredAt: 1 });
  return {
    ...connection,
    async cleanup() {
      try {
        if (
          connection.db.databaseName !== name ||
          !/^kofi_dashboard_test_[a-f0-9]{32}$/.test(name)
        )
          throw new Error('Unsafe cleanup');
        await connection.db.dropDatabase();
      } finally {
        await connection.client.close();
      }
    },
  };
}
export const testNow = new Date('2026-10-19T16:30:00.000Z');
export async function testSession(db: Db, clock = () => testNow) {
  const binding = randomBytes(32).toString('base64url');
  const result = await createSessionsService(db, clock).create(
    new ObjectId(),
    'Isolated test',
    binding,
  );
  return {
    headers: {
      Authorization: `Bearer ${result.sessionToken}`,
      'X-Tab-Authorization': binding,
    },
    auth: { token: result.sessionToken, binding },
    id: result.session.id,
  };
}
export function testSale(
  productId: ObjectId,
  registeredAt: string,
  paymentMethod = 'cash',
  tenths = 101,
  quantity = 1,
) {
  return {
    registered: true,
    registeredAt: new Date(registeredAt),
    paymentMethod,
    totalTenths: Long.fromNumber(tenths),
    lines: [
      {
        productId,
        quantity: Long.fromNumber(quantity),
        revenueTenths: Long.fromNumber(tenths),
      },
    ],
  };
}
