import { scrypt } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  createPasswordHasher,
  DUMMY_PASSWORD_HASH,
  hashPassword,
  PasswordCapacityError,
  verifyPassword,
} from './password.js';

test('real async scrypt round trip, individual salts and exact Unicode/whitespace', async () => {
  const password = '  Café e\u0301 🔐  ';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  expect(first).toMatch(
    /^kofi-scrypt\$v1\$131072\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/,
  );
  expect(first.split('$')[5]).not.toBe(second.split('$')[5]);
  expect(await verifyPassword(password, first)).toBe(true);
  expect(await verifyPassword(password, second)).toBe(true);
  expect(await verifyPassword(password.trim(), first)).toBe(false);
  expect(await verifyPassword(password.normalize('NFC'), first)).toBe(false);
  expect(await verifyPassword('wrong', first)).toBe(false);
  const last = first.endsWith('0') ? '1' : '0';
  expect(await verifyPassword(password, first.slice(0, -1) + last)).toBe(false);
}, 60_000);

test('external provisioning is compatible with fixed cost, key length and salt encoding', async () => {
  const salt = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
  const password = 'external test only';
  const digest = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
  expect(
    await verifyPassword(
      password,
      `kofi-scrypt$v1$131072$8$1$${salt.toString('hex')}$${digest.toString('hex')}`,
    ),
  ).toBe(true);
}, 30_000);

test('refuses malformed, noncanonical, version and parameter changes without accepting DB options', async () => {
  const invalid = [
    '',
    'x'.repeat(10_000),
    DUMMY_PASSWORD_HASH.replace('$v1$', '$v2$'),
    DUMMY_PASSWORD_HASH.replace('$131072$', '$262144$'),
    DUMMY_PASSWORD_HASH.replace('$8$', '$16$'),
    DUMMY_PASSWORD_HASH.replace('$1$00', '$2$00'),
    DUMMY_PASSWORD_HASH.replace('$131072$', '$0131072$'),
    DUMMY_PASSWORD_HASH.replace('$0000', '$ABCD'),
    DUMMY_PASSWORD_HASH + '\n',
    DUMMY_PASSWORD_HASH.slice(0, -2),
  ];
  for (const stored of invalid)
    expect(await verifyPassword('test', stored)).toBe(false);
  expect(await verifyPassword('test', DUMMY_PASSWORD_HASH)).toBe(false);
}, 60_000);

test('bounds running work and pending queue, then releases capacity', async () => {
  const hasher = createPasswordHasher({ queueSize: 1 });
  const first = hasher.hash('first');
  const queued = hasher.hash('second');
  await expect(hasher.hash('overflow')).rejects.toBeInstanceOf(
    PasswordCapacityError,
  );
  const [firstHash, secondHash] = await Promise.all([first, queued]);
  expect(await hasher.verify('first', firstHash)).toBe(true);
  expect(await hasher.verify('second', secondHash)).toBe(true);
  expect(() => createPasswordHasher({ concurrency: 2 })).toThrow(RangeError);
  expect(() => createPasswordHasher({ queueSize: 5 })).toThrow(RangeError);
}, 30_000);

test('rejects oversized passwords before KDF and contains no synchronous scrypt call', async () => {
  await expect(hashPassword('')).rejects.toThrow(RangeError);
  await expect(hashPassword('p'.repeat(1025))).rejects.toThrow(RangeError);
  const source = await readFile(
    new URL('./password.ts', import.meta.url),
    'utf8',
  );
  expect(source).not.toContain('scryptSync');
});
