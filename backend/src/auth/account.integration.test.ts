import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { afterAll, beforeAll, expect, test } from 'vitest';
import {
  connectDatabase,
  type DatabaseConnection,
} from '../shared/database/connect-database.js';
import { accountsCollection, ensureAccountIndexes } from './account.model.js';
import { createAuthService } from './auth.service.js';
import { hashPassword } from './password.js';

// Opt-in runner only: npm test excludes this file. Never targets an existing DB.
const databaseName = `kofi_auth_test_${randomUUID().replaceAll('-', '')}`;
let connection: DatabaseConnection | undefined;
let passwordHash: string;

beforeAll(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Explicit local MONGODB_URI required');
  const target = new URL(uri);
  if (
    target.protocol !== 'mongodb:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
    target.username ||
    target.password
  ) {
    throw new Error(
      'Authentication integration tests accept only unauthenticated local MongoDB',
    );
  }
  connection = await connectDatabase(uri, databaseName);
  // Case-insensitive default deliberately exercises the explicit simple collation.
  await connection.db.createCollection('accounts', {
    collation: { locale: 'en', strength: 2 },
  });
  await ensureAccountIndexes(connection.db);
  passwordHash = await hashPassword('test-only password');
}, 30_000);

afterAll(async () => {
  if (!connection) return;
  try {
    if (
      connection.db.databaseName !== databaseName ||
      !/^kofi_auth_test_[a-f0-9]{32}$/.test(databaseName)
    ) {
      throw new Error(
        'Refusing cleanup outside the exact generated test database',
      );
    }
    await connection.db.dropDatabase();
  } finally {
    await connection.client.close();
  }
});

test('reads externally inserted account exactly and never updates its contents', async () => {
  if (!connection) throw new Error('Test MongoDB unavailable');
  const accounts = accountsCollection(connection.db);
  const account = {
    _id: new ObjectId(),
    username: 'External User',
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await accounts.insertOne(account);
  const service = createAuthService(connection.db);
  expect(
    await service.verifyCredentials(
      { username: account.username, password: 'test-only password' },
      '127.0.0.1',
    ),
  ).toEqual({ status: 'credentials-verified', accountId: account._id });
  expect(
    await service.verifyCredentials(
      { username: 'external user', password: 'test-only password' },
      '127.0.0.1',
    ),
  ).toEqual({ status: 'incorrect' });
  expect(
    await service.verifyCredentials(
      { username: account.username, password: 'wrong' },
      '127.0.0.1',
    ),
  ).toEqual({ status: 'incorrect' });
  expect(await accounts.findOne({ _id: account._id })).toEqual(account);
}, 30_000);

test('explicit unique index rejects duplicate exact usernames but preserves case distinctions', async () => {
  if (!connection) throw new Error('Test MongoDB unavailable');
  const accounts = accountsCollection(connection.db);
  const external = {
    username: 'Unique',
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await accounts.insertOne({ ...external, _id: new ObjectId() });
  await expect(
    accounts.insertOne({ ...external, _id: new ObjectId() }),
  ).rejects.toMatchObject({ code: 11000 });
  await accounts.insertOne({
    ...external,
    _id: new ObjectId(),
    username: 'unique',
  });
  const indexes = await accounts.indexes();
  expect(
    indexes.find((index) => index.name === 'accounts_username_unique'),
  ).toMatchObject({ unique: true });
});
