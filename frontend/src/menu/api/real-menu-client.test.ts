import { expect, test, vi } from 'vitest';
import type { HttpResult } from '../../auth/api/contract.provisional';
import {
  createRealMenuClient,
  menuMessages,
  validCategoryList,
} from './real-menu-client';
import type { Category } from './contract.provisional';

const category: Category = {
  id: '0123456789abcdef01234567',
  name: 'Café',
  version: 1,
};
function transport(...results: (HttpResult<unknown> | Error)[]) {
  const request = vi.fn<
    (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<HttpResult<unknown>>
  >(async () => {
    const next = results.shift();
    if (!next) throw new Error('Unexpected request');
    if (next instanceof Error) throw next;
    return next;
  });
  return { request };
}
const ok = (data: unknown): HttpResult<unknown> => ({ kind: 'ok', data });
const error = (
  status: number,
  code?: string,
  details?: unknown,
): HttpResult<unknown> => ({ kind: 'error', status, code, details });

test('CA-01/CA-07 lists categories through GET /api/categories, never inventing products', async () => {
  const auth = transport(ok({ items: [category] }), ok({ items: [] }));
  const client = createRealMenuClient(auth);
  await expect(client.list()).resolves.toEqual({
    categories: [category],
    products: [],
  });
  await expect(client.list()).resolves.toEqual({
    categories: [],
    products: [],
  });
  expect(auth.request).toHaveBeenCalledWith(
    '/api/categories',
    expect.objectContaining({ signal: expect.anything() }),
  );
});

test.each([
  [{ kind: 'connection' } as HttpResult<unknown>],
  [error(500, 'INTERNAL_ERROR')],
  [error(0, 'REQUEST_SUPERSEDED')],
  [error(502)],
  [new Error('transport failure')],
  [ok(null)],
  [ok([])],
  [ok({})],
  [ok({ items: [{ ...category, id: 'coffee' }] })],
  [ok({ items: [{ ...category, version: 0 }] })],
  [ok({ items: [{ ...category, version: 1.5 }] })],
  [ok({ items: [{ ...category, name: '  ' }] })],
  [ok({ items: [category, category] })],
])(
  'CA-07 a failed or malformed read is an error with retry, not an empty list %#',
  async (result) => {
    const client = createRealMenuClient(transport(result));
    await expect(client.list()).rejects.toMatchObject({
      code: 'CONNECTION_ERROR',
      message: menuMessages.connection,
    });
  },
);

test('US-001 CA-09 an unauthorized answer is reported as a finished session', async () => {
  const client = createRealMenuClient(transport({ kind: 'unauthorized' }));
  await expect(client.list()).rejects.toMatchObject({
    code: 'CONNECTION_ERROR',
    message: menuMessages.session,
  });
  await expect(createRealMenuClient({}).list()).rejects.toMatchObject({
    code: 'CONNECTION_ERROR',
  });
});

test('CA-01 creates with an exact JSON POST and accepts the created category', async () => {
  const auth = transport(ok(category));
  const client = createRealMenuClient(auth);
  await expect(client.saveCategory(' Café ')).resolves.toBeUndefined();
  expect(auth.request).toHaveBeenCalledTimes(1);
  const [path, init] = auth.request.mock.calls[0]!;
  expect(path).toBe('/api/categories');
  expect(init).toMatchObject({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: ' Café ' }),
  });
});

test('CA-02 duplicate name is communicated as a name validation error', async () => {
  const client = createRealMenuClient(transport(error(409, 'DUPLICATE_NAME')));
  await expect(client.saveCategory('CAFÉ')).rejects.toMatchObject({
    code: 'VALIDATION_ERROR',
    message: menuMessages.duplicate,
    fields: { name: menuMessages.duplicate },
  });
});

test.each(['TOO_SHORT', 'TOO_LONG'])(
  'CA-06 authoritative %s rejection is communicated as the length rule',
  async (code) => {
    const client = createRealMenuClient(
      transport(
        error(400, 'VALIDATION_ERROR', { fields: [{ field: 'name', code }] }),
      ),
    );
    await expect(client.saveCategory('x')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: menuMessages.length,
      fields: { name: menuMessages.length },
    });
  },
);

test.each([
  [
    error(400, 'VALIDATION_ERROR', {
      fields: [{ field: '', code: 'NOT_ALLOWED' }],
    }),
  ],
  [error(415, 'UNSUPPORTED_MEDIA_TYPE')],
  [error(500, 'INTERNAL_ERROR')],
  [ok({ id: 'bad' })],
])('other creation failures are connection errors %#', async (result) => {
  const client = createRealMenuClient(transport(result));
  await expect(client.saveCategory('Café')).rejects.toMatchObject({
    code: 'CONNECTION_ERROR',
    message: menuMessages.connection,
  });
});

test('CA-05 a version conflict maps to the exact category message', async () => {
  const client = createRealMenuClient(
    transport(error(409, 'VERSION_CONFLICT')),
  );
  await expect(client.saveCategory('Café')).rejects.toMatchObject({
    code: 'CONFLICT',
    message:
      'Esta categoría cambió mientras la editabas. Revisa la versión actual y vuelve a aplicar tus cambios.',
  });
});

test('rename, delete and product operations are explicitly unavailable without requests', async () => {
  const auth = transport();
  const client = createRealMenuClient(auth);
  const unavailable = {
    code: 'CONNECTION_ERROR',
    message: menuMessages.unavailable,
  };
  await expect(client.saveCategory('Otro', category)).rejects.toMatchObject(
    unavailable,
  );
  await expect(client.deleteCategory(category)).rejects.toMatchObject(
    unavailable,
  );
  await expect(client.getProduct('x')).rejects.toMatchObject(unavailable);
  await expect(client.setActive({} as never)).rejects.toMatchObject(
    unavailable,
  );
  client.setScenario('connection');
  expect(auth.request).not.toHaveBeenCalled();
});

test('a request without answer is aborted and reported as a connection error', async () => {
  vi.useFakeTimers();
  try {
    const client = createRealMenuClient(
      {
        request: (_input, init) =>
          new Promise<HttpResult<unknown>>((resolve) =>
            init?.signal?.addEventListener('abort', () =>
              resolve({ kind: 'connection' }),
            ),
          ),
      },
      1_000,
    );
    const pending = expect(client.list()).rejects.toMatchObject({
      code: 'CONNECTION_ERROR',
    });
    await vi.advanceTimersByTimeAsync(1_000);
    await pending;
  } finally {
    vi.useRealTimers();
  }
});

test('list validation rejects duplicated identities', () => {
  expect(validCategoryList({ items: [category] })).toBe(true);
  expect(validCategoryList({ items: [category, { ...category }] })).toBe(false);
});
