import { expect, test } from 'vitest';
import { parseEnv } from './env.js';

const mongodbUri = 'mongodb://127.0.0.1:27017/kofi?replicaSet=rs0';

test('usa el puerto 3000 cuando PORT no está definido', () => {
  expect(parseEnv({ MONGODB_URI: mongodbUri })).toEqual({
    PORT: 3000,
    MONGODB_URI: mongodbUri,
  });
});

test.each(['0', '65536', '3000a', ''])('rechaza PORT=%j', (port) => {
  expect(() => parseEnv({ PORT: port, MONGODB_URI: mongodbUri })).toThrow(
    'PORT',
  );
});

test('exige MONGODB_URI con esquema MongoDB', () => {
  expect(() => parseEnv({})).toThrow('MONGODB_URI');
  expect(() => parseEnv({ MONGODB_URI: 'http://127.0.0.1' })).toThrow(
    'MONGODB_URI',
  );
});
