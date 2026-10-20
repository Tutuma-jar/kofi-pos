import { ObjectId, type Db } from 'mongodb';
import { expect, test, vi } from 'vitest';
import {
  createAuthService,
  createCredentialRateLimiter,
} from './auth.service.js';
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  PasswordCapacityError,
  verifyPassword,
} from './password.js';

function databaseDouble() {
  const findOne = vi.fn();
  const collection = vi.fn(() => ({ findOne }));
  return { db: { collection } as unknown as Db, collection, findOne };
}

test('reads exact account and returns only identity, without creating authorization or writes', async () => {
  const { db, findOne, collection } = databaseDouble();
  const accountId = new ObjectId();
  findOne.mockResolvedValue({ _id: accountId, passwordHash: 'stored' });
  const verify = vi.fn().mockResolvedValue(true);
  const service = createAuthService(db, { verifyPassword: verify });
  expect(
    await service.verifyCredentials(
      { username: ' User ', password: ' secret ' },
      '127.0.0.1',
    ),
  ).toEqual({ status: 'credentials-verified', accountId });
  expect(collection).toHaveBeenCalledWith('accounts');
  expect(findOne).toHaveBeenCalledExactlyOnceWith(
    { username: ' User ' },
    { collation: { locale: 'simple' } },
  );
  expect(verify).toHaveBeenCalledExactlyOnceWith(' secret ', 'stored');
});

test('wrong password and absent user have identical rejection; dummy executes the real verifier', async () => {
  const { db, findOne } = databaseDouble();
  const stored = await hashPassword('test-only correct');
  const verify = vi.fn(verifyPassword);
  const service = createAuthService(db, { verifyPassword: verify });
  findOne
    .mockResolvedValueOnce({ _id: new ObjectId(), passwordHash: stored })
    .mockResolvedValueOnce(null);
  const input = { username: 'u', password: 'test-only wrong' };
  const wrong = await service.verifyCredentials(input, 'a');
  const unknown = await service.verifyCredentials(input, 'a');
  expect(wrong).toEqual({ status: 'incorrect' });
  expect(unknown).toEqual(wrong);
  expect(verify).toHaveBeenNthCalledWith(
    2,
    input.password,
    DUMMY_PASSWORD_HASH,
  );
  expect(stored.split('$').slice(0, 5)).toEqual(
    DUMMY_PASSWORD_HASH.split('$').slice(0, 5),
  );
}, 30_000);

test('Mongo failure propagates rather than being disguised as incorrect credentials', async () => {
  const { db, findOne } = databaseDouble();
  const failure = new Error('database unavailable');
  findOne.mockRejectedValue(failure);
  const verify = vi.fn();
  const service = createAuthService(db, { verifyPassword: verify });
  await expect(
    service.verifyCredentials({ username: 'u', password: 'p' }, 'a'),
  ).rejects.toBe(failure);
  expect(verify).not.toHaveBeenCalled();
});

test('KDF saturation yields finite rate-limit semantics; other KDF failures propagate', async () => {
  const { db, findOne } = databaseDouble();
  findOne.mockResolvedValue(null);
  const failure = new Error('crypto unavailable');
  const verify = vi
    .fn()
    .mockRejectedValueOnce(new PasswordCapacityError())
    .mockRejectedValueOnce(failure);
  const service = createAuthService(db, { verifyPassword: verify });
  const input = { username: 'u', password: 'p' };
  expect(await service.verifyCredentials(input, 'a')).toEqual({
    status: 'rate-limited',
    retryAfterSeconds: 1,
  });
  await expect(service.verifyCredentials(input, 'a')).rejects.toBe(failure);
});

test('rate-limited requests do not reach Mongo or KDF; strict invalid input does not reach Mongo', async () => {
  const { db, findOne } = databaseDouble();
  findOne.mockResolvedValue(null);
  const verify = vi.fn().mockResolvedValue(false);
  const rateLimiter = createCredentialRateLimiter({ maxAttempts: 1 });
  const service = createAuthService(db, {
    verifyPassword: verify,
    rateLimiter,
  });
  const input = { username: 'u', password: 'p' };
  await service.verifyCredentials(input, 'a');
  expect(await service.verifyCredentials(input, 'a')).toMatchObject({
    status: 'rate-limited',
  });
  await expect(
    service.verifyCredentials({ ...input, tabBinding: 'unknown' }, 'b'),
  ).rejects.toThrow();
  expect(findOne).toHaveBeenCalledTimes(1);
  expect(verify).toHaveBeenCalledTimes(1);
});

test('fixed windows reset without extending blocks, preserve IP isolation and bound map size', () => {
  let time = 0;
  const limiter = createCredentialRateLimiter({
    windowMs: 2000,
    maxAttempts: 1,
    maxEntries: 2,
    now: () => time,
  });
  expect(limiter.check('a')).toBeNull();
  expect(limiter.check('a')).toBe(2);
  time = 999;
  expect(limiter.check('b')).toBeNull();
  expect(limiter.check('c')).toBe(2);
  expect(limiter.size).toBe(2);
  time = 1999;
  expect(limiter.check('a')).toBe(1);
  expect(limiter.check('b')).toBe(1);
  time = 2000;
  expect(limiter.check('a')).toBeNull();
  expect(limiter.size).toBe(2);
  time = 5000;
  expect(limiter.check('c')).toBeNull();
  expect(limiter.size).toBe(1);
  expect(() => limiter.check('')).toThrow(RangeError);
  expect(() => createCredentialRateLimiter({ maxEntries: 0 })).toThrow(
    RangeError,
  );
});
