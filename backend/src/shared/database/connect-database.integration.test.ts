import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { parseEnv } from '../config/env.js';
import {
  connectDatabase,
  type DatabaseConnection,
} from './connect-database.js';

let connection: DatabaseConnection;

beforeAll(async () => {
  const { MONGODB_URI } = parseEnv(process.env);
  connection = await connectDatabase(
    MONGODB_URI,
    `kofi_test_${randomUUID().replaceAll('-', '')}`,
  );
});

afterAll(async () => {
  await connection.db.dropDatabase();
  await connection.client.close();
});

test('confirma una transacción en el replica set', async () => {
  const items = connection.db.collection('smoke_items');
  await connection.db.createCollection('smoke_items');

  await connection.client.withSession((session) =>
    session.withTransaction(async () => {
      await items.insertOne({ key: 'a' }, { session });
      await items.insertOne({ key: 'b' }, { session });
    }),
  );

  expect(await items.countDocuments()).toBe(2);
});

test('revierte la transacción completa ante un fallo', async () => {
  const items = connection.db.collection('smoke_rollback');
  await connection.db.createCollection('smoke_rollback');

  await expect(
    connection.client.withSession((session) =>
      session.withTransaction(async () => {
        await items.insertOne({ key: 'a' }, { session });
        throw new Error('fallo simulado');
      }),
    ),
  ).rejects.toThrow('fallo simulado');

  expect(await items.countDocuments()).toBe(0);
});
