import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { DEFAULT_PRODUCT_IMAGES_DIR, parseEnv } from './env.js';

const mongodbUri = 'mongodb://127.0.0.1:27017/kofi?replicaSet=rs0';

test('usa el puerto 3000 cuando PORT no está definido', () => {
  expect(parseEnv({ MONGODB_URI: mongodbUri })).toEqual({
    PORT: 3000,
    HOST: '127.0.0.1',
    TRUST_PROXY: 0,
    MONGODB_URI: mongodbUri,
    PRODUCT_IMAGES_DIR: resolve(DEFAULT_PRODUCT_IMAGES_DIR),
    FRONTEND_DIST_DIR: undefined,
  });
});

test('acepta HOST, TRUST_PROXY y FRONTEND_DIST_DIR de despliegue', () => {
  expect(
    parseEnv({
      MONGODB_URI: mongodbUri,
      HOST: '0.0.0.0',
      TRUST_PROXY: '1',
      FRONTEND_DIST_DIR: '../frontend/dist',
    }),
  ).toMatchObject({
    HOST: '0.0.0.0',
    TRUST_PROXY: 1,
    FRONTEND_DIST_DIR: resolve('../frontend/dist'),
  });
});

test.each([
  { HOST: ' ' },
  { TRUST_PROXY: '-1' },
  { TRUST_PROXY: '11' },
  { TRUST_PROXY: 'true' },
  { FRONTEND_DIST_DIR: '' },
])('rechaza configuración de despliegue inválida %j', (values) => {
  expect(() => parseEnv({ MONGODB_URI: mongodbUri, ...values })).toThrow(
    Object.keys(values)[0],
  );
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

test('fuera de producción, las imágenes van por defecto a backend/var/product-images', () => {
  expect(
    DEFAULT_PRODUCT_IMAGES_DIR.replaceAll('\\', '/').endsWith(
      'backend/var/product-images',
    ),
  ).toBe(true);
  expect(
    parseEnv({ MONGODB_URI: mongodbUri, NODE_ENV: 'development' })
      .PRODUCT_IMAGES_DIR,
  ).toBe(resolve(DEFAULT_PRODUCT_IMAGES_DIR));
});

test('PRODUCT_IMAGES_DIR explícita se resuelve como ruta absoluta', () => {
  expect(
    parseEnv({ MONGODB_URI: mongodbUri, PRODUCT_IMAGES_DIR: 'datos/imagenes' })
      .PRODUCT_IMAGES_DIR,
  ).toBe(resolve('datos/imagenes'));
});

test('PRODUCT_IMAGES_DIR es obligatoria en producción y no admite vacío', () => {
  expect(() =>
    parseEnv({ MONGODB_URI: mongodbUri, NODE_ENV: 'production' }),
  ).toThrow('PRODUCT_IMAGES_DIR');
  expect(() =>
    parseEnv({ MONGODB_URI: mongodbUri, PRODUCT_IMAGES_DIR: '  ' }),
  ).toThrow('PRODUCT_IMAGES_DIR');
  expect(
    parseEnv({
      MONGODB_URI: mongodbUri,
      NODE_ENV: 'production',
      PRODUCT_IMAGES_DIR: '/srv/kofi/imagenes',
    }).PRODUCT_IMAGES_DIR,
  ).toBe(resolve('/srv/kofi/imagenes'));
});
