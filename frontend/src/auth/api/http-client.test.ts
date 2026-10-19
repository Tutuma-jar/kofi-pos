import { expect, test, vi } from 'vitest';
import { createHttpClient } from './http-client';

test('401 genérico notifica al consumidor sin exigir cuerpo JSON', async () => {
  const unauthorized = vi.fn();
  const request = createHttpClient(
    async () => new Response(null, { status: 401 }),
    unauthorized,
  );
  expect(await request('/fixture')).toEqual({ kind: 'unauthorized' });
  expect(unauthorized).toHaveBeenCalledTimes(1);
});

test('fallo de conexión no equivale a 401 ni elimina autorización', async () => {
  const unauthorized = vi.fn();
  const request = createHttpClient(async () => {
    throw new TypeError('fixture sin red');
  }, unauthorized);
  expect(await request('/fixture')).toEqual({ kind: 'connection' });
  expect(unauthorized).not.toHaveBeenCalled();
});

test('entrega JSON, init y errores HTTP sin reglas de endpoints', async () => {
  const transport = vi.fn(
    async () => new Response('{"fixture":true}', { status: 200 }),
  );
  const unauthorized = vi.fn();
  const request = createHttpClient(transport, unauthorized);
  expect(await request('/fixture', { method: 'POST' })).toEqual({
    kind: 'ok',
    data: { fixture: true },
  });
  expect(transport).toHaveBeenCalledWith('/fixture', { method: 'POST' });
  const failure = createHttpClient(
    async () => new Response(null, { status: 503 }),
    unauthorized,
  );
  expect(await failure('/fixture')).toEqual({ kind: 'error', status: 503 });
  const malformed = createHttpClient(
    async () => new Response('no-json'),
    unauthorized,
  );
  expect(await malformed('/fixture')).toEqual({ kind: 'error', status: 200 });
});
