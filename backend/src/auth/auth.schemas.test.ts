import { expect, test } from 'vitest';
import { credentialsSchema } from './auth.schemas.js';

test('preserves exact Unicode, whitespace and boundary lengths', () => {
  const credentials = { username: ' Café ', password: '  🔐e\u0301  ' };
  expect(credentialsSchema.parse(credentials)).toEqual(credentials);
  expect(
    credentialsSchema.safeParse({
      username: 'u'.repeat(128),
      password: 'p'.repeat(1024),
    }).success,
  ).toBe(true);
  expect(
    credentialsSchema.safeParse({ username: ' ', password: ' ' }).success,
  ).toBe(true);
});

test.each([
  null,
  {},
  [],
  { username: '', password: 'p' },
  { username: 'u', password: '' },
  { username: 'u'.repeat(129), password: 'p' },
  { username: 'u', password: 'p'.repeat(1025) },
  { username: 1, password: 'p' },
  { username: 'u', password: 1 },
  { username: 'u', password: 'p', tabBinding: 'not-an-internal-credential' },
  { username: 'u', password: 'p', role: 'admin' },
])('rejects invalid or unknown internal input %#', (input) => {
  expect(credentialsSchema.safeParse(input).success).toBe(false);
});
