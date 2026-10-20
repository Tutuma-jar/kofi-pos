import { expect, test, vi } from 'vitest';
import { createAuthorizedHttpClient, createHttpClient } from './http-client';
import type { HttpTransport } from './contract.provisional';

test('incomplete error envelope cannot exempt a 401 from unauthorized handling', async () => {
  const unauthorized = vi.fn();
  const request = createHttpClient(
    async () =>
      new Response(JSON.stringify({ error: { code: 'INVALID_CREDENTIALS' } }), {
        status: 401,
      }),
    unauthorized,
  );
  expect(await request('/api/sessions')).toEqual({ kind: 'unauthorized' });
  expect(unauthorized).toHaveBeenCalledOnce();
});

test('unexpected 2xx is not confirmation when the endpoint requires an exact status', async () => {
  const request = createHttpClient(
    async () => new Response('{}', { status: 200 }),
    vi.fn(),
  );
  expect(
    await request('/api/sessions/current', { method: 'DELETE' }, 204),
  ).toEqual({ kind: 'error', status: 200 });
});

test('authorized HTTP rejects external origins and URL credentials before invoking transport', async () => {
  const transport = vi.fn<HttpTransport>(async () => new Response('{}'));
  const request = createAuthorizedHttpClient({
    transport,
    origin: 'https://kofi.example',
    authorization: () => ({
      token: 'T'.repeat(43),
      binding: 'B'.repeat(43),
      generation: 1,
    }),
    unauthorized: vi.fn(),
  });
  for (const target of [
    'https://evil.example/api/sessions/current',
    '//evil.example/api/sessions/current',
    'https://user:password@kofi.example/api/sessions/current',
    '/api/sessions/current?token=secret',
    '/api/sessions/current#secret',
    '/other',
  ]) {
    expect(
      await request(target, {
        headers: { Authorization: 'injected' },
        credentials: 'include',
        redirect: 'follow',
      }),
    ).toEqual({ kind: 'error', status: 0 });
  }
  expect(transport).not.toHaveBeenCalled();
});

test('authorized HTTP merges Request/init headers but overrides credential and redirect options', async () => {
  const transport = vi.fn<HttpTransport>(async () => new Response('{}'));
  const request = createAuthorizedHttpClient({
    transport,
    origin: 'https://kofi.example',
    authorization: () => ({
      token: 'T'.repeat(43),
      binding: 'B'.repeat(43),
      generation: 1,
    }),
    unauthorized: vi.fn(),
  });
  const input = new Request('https://kofi.example/api/sessions/current', {
    headers: { Accept: 'application/json', 'X-Example': 'original' },
  });
  expect(
    (
      await request(input, {
        headers: new Headers({
          'X-Example': 'override',
          Authorization: 'injected',
          'X-Tab-Authorization': 'injected',
        }),
        credentials: 'include',
        redirect: 'follow',
        cache: 'force-cache',
      })
    ).kind,
  ).toBe('ok');
  const init = transport.mock.calls[0]?.[1];
  expect(new Headers(init?.headers).get('Accept')).toBe('application/json');
  expect(new Headers(init?.headers).get('X-Example')).toBe('override');
  expect(new Headers(init?.headers).get('Authorization')).toBe(
    `Bearer ${'T'.repeat(43)}`,
  );
  expect(new Headers(init?.headers).get('X-Tab-Authorization')).toBe(
    'B'.repeat(43),
  );
  expect(init).toMatchObject({
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
  });
});

test('structured INVALID_CREDENTIALS is exposed but does not expire a session', async () => {
  const unauthorized = vi.fn();
  const request = createHttpClient(
    async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'test',
            details: { fields: [] },
          },
        }),
        { status: 401 },
      ),
    unauthorized,
  );
  expect(await request('/api/sessions')).toEqual({
    kind: 'error',
    status: 401,
    code: 'INVALID_CREDENTIALS',
    details: { fields: [] },
  });
  expect(unauthorized).not.toHaveBeenCalled();
});

test('204 succeeds without attempting JSON parsing', async () => {
  const response = new Response(null, { status: 204 });
  const parse = vi.spyOn(response, 'json');
  const request = createHttpClient(async () => response, vi.fn());
  expect(await request('/api/sessions/current')).toEqual({
    kind: 'ok',
    data: undefined,
  });
  expect(parse).not.toHaveBeenCalled();
});

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
