import { expect, test, vi } from 'vitest';
import type { HttpResult } from '../../auth/api/contract.provisional';
import {
  createRealMenuClient,
  dataUrlBytes,
  menuMessages,
  productMessages,
  validCategoryList,
  type ProductDto,
} from './real-menu-client';
import type { Category, Product, ProductInput } from './contract.provisional';

const category: Category = {
  id: '0123456789abcdef01234567',
  name: 'Café',
  version: 1,
};
const product: ProductDto = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  version: 1,
  name: 'Café americano',
  description: 'Café filtrado de la casa.',
  priceTenths: 105,
  categoryId: category.id,
  imageId: null,
  active: true,
};
const imageId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
// 'PNG' bytes are irrelevant here: the backend validates the content.
const dataUrl = `data:image/png;base64,${btoa('\x89PNG-bytes')}`;
const input: ProductInput = {
  name: ' Café americano ',
  description: 'Café filtrado de la casa.',
  priceTenths: 105,
  categoryId: category.id,
  image: null,
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
  const auth = transport(
    ok({ items: [] }),
    ok({ items: [category] }),
    ok({ items: [] }),
    ok({ items: [] }),
  );
  const client = createRealMenuClient(auth);
  await expect(client.list()).resolves.toEqual({
    categories: [category],
    products: [],
  });
  await expect(client.list()).resolves.toEqual({
    categories: [],
    products: [],
  });
  expect(auth.request.mock.calls.map(([path]) => path)).toEqual([
    '/api/products',
    '/api/categories',
    '/api/products',
    '/api/categories',
  ]);
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

test('CA-03 renames with an exact JSON PATCH carrying the version', async () => {
  const current = { ...category, version: 3 };
  const auth = transport(ok({ ...current, name: 'Bebidas', version: 4 }));
  const client = createRealMenuClient(auth);
  await expect(client.saveCategory(' Bebidas ', current)).resolves.toBe(
    undefined,
  );
  expect(auth.request).toHaveBeenCalledTimes(1);
  const [path, init] = auth.request.mock.calls[0]!;
  expect(path).toBe(`/api/categories/${category.id}`);
  expect(init).toMatchObject({
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: 3, name: ' Bebidas ' }),
  });
});

test('CA-04 deletes with an exact JSON DELETE carrying the version; 204 is a success', async () => {
  const auth = transport(ok(undefined));
  const client = createRealMenuClient(auth);
  await expect(
    client.deleteCategory({ ...category, version: 2 }),
  ).resolves.toBeUndefined();
  expect(auth.request).toHaveBeenCalledTimes(1);
  const [path, init] = auth.request.mock.calls[0]!;
  expect(path).toBe(`/api/categories/${category.id}`);
  expect(init).toMatchObject({
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: 2 }),
  });
});

const unauthorized: HttpResult<unknown> = { kind: 'unauthorized' };
const offline: HttpResult<unknown> = { kind: 'connection' };

test.each([
  [error(409, 'DUPLICATE_NAME'), 'VALIDATION_ERROR', menuMessages.duplicate],
  [
    error(400, 'VALIDATION_ERROR', {
      fields: [{ field: 'name', code: 'TOO_SHORT' }],
    }),
    'VALIDATION_ERROR',
    menuMessages.length,
  ],
  [
    error(400, 'VALIDATION_ERROR', {
      fields: [{ field: 'name', code: 'TOO_LONG' }],
    }),
    'VALIDATION_ERROR',
    menuMessages.length,
  ],
  [error(409, 'VERSION_CONFLICT'), 'CONFLICT', menuMessages.conflict],
  [error(404, 'NOT_FOUND'), 'CONNECTION_ERROR', menuMessages.missing],
  [unauthorized, 'CONNECTION_ERROR', menuMessages.session],
  [offline, 'CONNECTION_ERROR', menuMessages.connection],
  [error(500, 'INTERNAL_ERROR'), 'CONNECTION_ERROR', menuMessages.connection],
  [
    error(400, 'VALIDATION_ERROR', {
      fields: [{ field: 'version', code: 'INVALID_FORMAT' }],
    }),
    'CONNECTION_ERROR',
    menuMessages.connection,
  ],
  [new Error('network'), 'CONNECTION_ERROR', menuMessages.connection],
  [ok(null), 'CONNECTION_ERROR', menuMessages.connection],
  // Only the same category is a success.
  [
    ok({ ...category, id: 'cccccccccccccccccccccccc' }),
    'CONNECTION_ERROR',
    menuMessages.connection,
  ],
])(
  'CA-02/CA-05/CA-06 renaming failure %# is communicated as a rejection',
  async (result, code, message) => {
    const client = createRealMenuClient(transport(result));
    await expect(
      client.saveCategory('Bebidas', category),
    ).rejects.toMatchObject({ code, message });
  },
);

test('CA-05 a renaming conflict carries the exact category message', async () => {
  const client = createRealMenuClient(
    transport(
      error(409, 'VERSION_CONFLICT', {
        current: { ...category, name: 'Otro', version: 2 },
      }),
    ),
  );
  await expect(client.saveCategory('Té', category)).rejects.toMatchObject({
    code: 'CONFLICT',
    message:
      'Esta categoría cambió mientras la editabas. Revisa la versión actual y vuelve a aplicar tus cambios.',
  });
});

test.each([
  [
    error(409, 'CATEGORY_NOT_EMPTY'),
    'CATEGORY_NOT_EMPTY',
    menuMessages.notEmpty,
  ],
  [error(409, 'VERSION_CONFLICT'), 'CONFLICT', menuMessages.conflict],
  [error(404, 'NOT_FOUND'), 'CONNECTION_ERROR', menuMessages.missing],
  [unauthorized, 'CONNECTION_ERROR', menuMessages.session],
  [offline, 'CONNECTION_ERROR', menuMessages.connection],
  [error(500, 'INTERNAL_ERROR'), 'CONNECTION_ERROR', menuMessages.connection],
  [
    error(415, 'UNSUPPORTED_MEDIA_TYPE'),
    'CONNECTION_ERROR',
    menuMessages.connection,
  ],
  [new Error('network'), 'CONNECTION_ERROR', menuMessages.connection],
])(
  'CA-04/CA-05 deletion failure %# is communicated as a rejection',
  async (result, code, message) => {
    const client = createRealMenuClient(transport(result));
    await expect(client.deleteCategory(category)).rejects.toMatchObject({
      code,
      message,
    });
  },
);

test('malformed identities are rejected without requests', async () => {
  const auth = transport();
  const client = createRealMenuClient(auth);
  const missing = {
    code: 'CONNECTION_ERROR',
    message: menuMessages.missing,
  };
  await expect(
    client.saveCategory('Otro', { ...category, id: 'x' }),
  ).rejects.toMatchObject(missing);
  await expect(
    client.deleteCategory({ ...category, id: 'x' }),
  ).rejects.toMatchObject(missing);
  // A malformed identity cannot exist: no request.
  await expect(client.getProduct('x')).rejects.toMatchObject({
    code: 'CONNECTION_ERROR',
    message: productMessages.missing,
  });
  await expect(client.setActive({ id: 'x' } as Product)).rejects.toMatchObject({
    code: 'CONNECTION_ERROR',
    message: productMessages.missing,
  });
  client.setScenario('connection');
  expect(auth.request).not.toHaveBeenCalled();
});

const shown: Product = {
  id: product.id,
  version: 1,
  name: product.name,
  description: product.description,
  priceTenths: 105,
  categoryId: category.id,
  image: null,
  active: true,
};

test('US-009 CA-01/CA-03 setActive sends the target state with the version', async () => {
  const off = { ...product, active: false, version: 2 };
  const auth = transport(ok(off), ok({ ...off, active: true, version: 3 }));
  const client = createRealMenuClient(auth);
  await expect(client.setActive(shown)).resolves.toBeUndefined();
  await expect(
    client.setActive({ ...shown, active: false, version: 2 }),
  ).resolves.toBeUndefined();
  expect(
    auth.request.mock.calls.map(([path, init]) => [
      path,
      init?.method,
      init?.body,
    ]),
  ).toEqual([
    [
      `/api/products/${product.id}/activation`,
      'PATCH',
      JSON.stringify({ version: 1, active: false }),
    ],
    [
      `/api/products/${product.id}/activation`,
      'PATCH',
      JSON.stringify({ version: 2, active: true }),
    ],
  ]);
});

test.each([
  [
    error(409, 'VERSION_CONFLICT', { current: { ...product, version: 2 } }),
    'CONFLICT',
    productMessages.conflict,
  ],
  [error(404, 'NOT_FOUND'), 'CONNECTION_ERROR', productMessages.missing],
  [
    { kind: 'unauthorized' } as HttpResult<unknown>,
    'CONNECTION_ERROR',
    menuMessages.session,
  ],
  [
    error(400, 'VALIDATION_ERROR', {
      fields: [{ field: 'active', code: 'INVALID_FORMAT' }],
    }),
    'CONNECTION_ERROR',
    menuMessages.connection,
  ],
  [error(500, 'INTERNAL_ERROR'), 'CONNECTION_ERROR', menuMessages.connection],
  [
    { kind: 'connection' } as HttpResult<unknown>,
    'CONNECTION_ERROR',
    menuMessages.connection,
  ],
  [ok(null), 'CONNECTION_ERROR', menuMessages.connection],
  [ok({ ...product, version: 2 }), 'CONNECTION_ERROR', menuMessages.connection],
  [
    ok({ ...product, id: 'c'.repeat(24), active: false, version: 2 }),
    'CONNECTION_ERROR',
    menuMessages.connection,
  ],
])(
  'US-009 CA-05 setActive failure %# is reported, never as success',
  async (result, code, message) => {
    await expect(
      createRealMenuClient(transport(result)).setActive(shown),
    ).rejects.toMatchObject({ code, message });
  },
);

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

// --- TASK-016: products and images -------------------------------------

function imageResponse(type = 'image/png') {
  return new Response(new Uint8Array([1, 2, 3]), {
    headers: { 'Content-Type': type },
  });
}
function withImages(
  auth: ReturnType<typeof transport>,
  ...results: (HttpResult<Response> | Error)[]
) {
  const openStream = vi.fn<
    (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<HttpResult<Response>>
  >(async () => {
    const next = results.shift();
    if (!next) throw new Error('Unexpected image request');
    if (next instanceof Error) throw next;
    return next;
  });
  return { ...auth, openStream };
}
function objectUrls() {
  let sequence = 0;
  return {
    create: vi.fn(() => `blob:kofi/${++sequence}`),
    revoke: vi.fn(),
  };
}
const okImage = (type?: string): HttpResult<Response> => ({
  kind: 'ok',
  data: imageResponse(type),
});

test('CA-01/CA-04/CA-06/CA-08 list keeps saved data, server order, state and no image as null', async () => {
  const inactive = {
    ...product,
    id: 'cccccccccccccccccccccccc',
    name: 'Agua',
    active: false,
  };
  const client = createRealMenuClient(
    transport(ok({ items: [product, inactive] }), ok({ items: [category] })),
  );
  const saved = {
    id: product.id,
    version: 1,
    name: 'Café americano',
    description: 'Café filtrado de la casa.',
    priceTenths: 105,
    categoryId: category.id,
    image: null,
    active: true,
  };
  await expect(client.list()).resolves.toEqual({
    categories: [category],
    products: [
      saved,
      { ...saved, id: inactive.id, name: 'Agua', active: false },
    ],
  });
});

test('CA-05 an image is read with authorization and shown through one cached object URL', async () => {
  const urls = objectUrls();
  const withImage = { ...product, imageId };
  const auth = withImages(
    transport(
      ok({ items: [withImage] }),
      ok({ items: [category] }),
      ok({ items: [withImage] }),
      ok({ items: [category] }),
      ok({ items: [product] }),
      ok({ items: [category] }),
    ),
    okImage(),
  );
  const client = createRealMenuClient(auth, 15_000, { objectUrls: urls });
  const first = await client.list();
  expect(first.products[0]?.image).toBe('blob:kofi/1');
  expect(auth.openStream).toHaveBeenCalledWith(
    `/api/product-images/${imageId}`,
    expect.objectContaining({ signal: expect.anything() }),
  );
  const second = await client.list();
  expect(second.products[0]?.image).toBe('blob:kofi/1');
  expect(auth.openStream).toHaveBeenCalledTimes(1);
  // The image is no longer listed: its object URL is released.
  const third = await client.list();
  expect(third.products[0]?.image).toBeNull();
  await Promise.resolve();
  expect(urls.revoke).toHaveBeenCalledWith('blob:kofi/1');
});

test.each([
  [{ kind: 'connection' } as HttpResult<Response>, menuMessages.connection],
  [
    { kind: 'error', status: 404, code: 'NOT_FOUND' } as HttpResult<Response>,
    menuMessages.connection,
  ],
  [
    { kind: 'error', status: 500 } as HttpResult<Response>,
    menuMessages.connection,
  ],
  [okImage('text/html'), menuMessages.connection],
  [okImage('image/svg+xml'), menuMessages.connection],
  [new Error('network'), menuMessages.connection],
  [{ kind: 'unauthorized' } as HttpResult<Response>, menuMessages.session],
])(
  'CA-11 an image read failure fails the list instead of showing the neutral marker %#',
  async (result, message) => {
    const client = createRealMenuClient(
      withImages(
        transport(
          ok({ items: [{ ...product, imageId }] }),
          ok({ items: [category] }),
        ),
        result,
      ),
      15_000,
      { objectUrls: objectUrls() },
    );
    await expect(client.list()).rejects.toMatchObject({
      code: 'CONNECTION_ERROR',
      message,
    });
  },
);

test('CA-11 an image cannot be read without the authorized raw client', async () => {
  const client = createRealMenuClient(
    transport(
      ok({ items: [{ ...product, imageId }] }),
      ok({ items: [category] }),
    ),
  );
  await expect(client.list()).rejects.toMatchObject({
    code: 'CONNECTION_ERROR',
  });
});

test.each([
  [{ ...product, priceTenths: 10.5 }],
  [{ ...product, priceTenths: 0 }],
  [{ ...product, name: ' ' }],
  [{ ...product, imageId: 'x' }],
  [{ ...product, active: 'yes' }],
  [{ ...product, categoryId: 'coffee' }],
  [{ ...product, categoryId: 'dddddddddddddddddddddddd' }],
])(
  'CA-11 malformed or inconsistent products are a read error, not data %#',
  async (item) => {
    const client = createRealMenuClient(
      transport(ok({ items: [item] }), ok({ items: [category] })),
    );
    await expect(client.list()).rejects.toMatchObject({
      code: 'CONNECTION_ERROR',
      message: menuMessages.connection,
    });
  },
);

test.each([
  [ok({ items: [product, { ...product }] }), undefined],
  [ok({ items: [] }), error(500, 'INTERNAL_ERROR')],
  [ok({ items: [] }), ok({ items: [{ ...category, version: 0 }] })],
])(
  'CA-11 a failure in either read is never an empty catalog %#',
  async (products, categories) => {
    const client = createRealMenuClient(
      transport(products, ...(categories ? [categories] : [])),
    );
    await expect(client.list()).rejects.toMatchObject({
      code: 'CONNECTION_ERROR',
    });
  },
);

test('CA-01/CA-04/CA-06 creation without image sends the exact JSON and returns the saved product', async () => {
  const auth = transport(ok({ ...product }));
  const client = createRealMenuClient(auth);
  await expect(client.saveProduct(input)).resolves.toEqual({
    id: product.id,
    version: 1,
    name: 'Café americano',
    description: 'Café filtrado de la casa.',
    priceTenths: 105,
    categoryId: category.id,
    image: null,
    active: true,
  });
  expect(auth.request).toHaveBeenCalledTimes(1);
  const [path, init] = auth.request.mock.calls[0]!;
  expect(path).toBe('/api/products');
  expect(init).toMatchObject({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  expect(JSON.parse(String(init?.body))).toEqual({
    name: ' Café americano ',
    description: 'Café filtrado de la casa.',
    priceTenths: 105,
    categoryId: category.id,
    imageId: null,
  });
});

test('CA-05 creation with image uploads the original bytes first, then associates them', async () => {
  const auth = transport(
    ok({ id: imageId, width: 1, height: 1 }),
    ok({ ...product, imageId }),
  );
  const client = createRealMenuClient(auth);
  const saved = await client.saveProduct({ ...input, image: dataUrl });
  expect(saved.image).toBe(dataUrl);
  const [uploadPath, upload] = auth.request.mock.calls[0]!;
  expect(uploadPath).toBe('/api/product-images');
  expect(upload).toMatchObject({
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  expect(Array.from(upload?.body as Uint8Array)).toEqual(
    Array.from(dataUrlBytes(dataUrl)!),
  );
  const [productPath, create] = auth.request.mock.calls[1]!;
  expect(productPath).toBe('/api/products');
  expect(JSON.parse(String(create?.body))).toMatchObject({ imageId });
});

test.each([
  [
    error(400, 'VALIDATION_ERROR', {
      fields: [{ field: 'image', code: 'INVALID_FORMAT' }],
    }),
    productMessages.imageRejected,
  ],
  [
    error(400, 'VALIDATION_ERROR', {
      fields: [{ field: 'image', code: 'OUT_OF_RANGE' }],
    }),
    productMessages.imageRejected,
  ],
  [error(413, 'PAYLOAD_TOO_LARGE'), productMessages.imageRejected],
  [error(500, 'INTERNAL_ERROR'), productMessages.imageFailed],
  [{ kind: 'connection' } as HttpResult<unknown>, productMessages.imageFailed],
  [ok({ id: 'bad' }), productMessages.imageFailed],
])(
  'CA-07 a rejected or failed upload is an image error and creates nothing %#',
  async (result, message) => {
    const auth = transport(result);
    const client = createRealMenuClient(auth);
    await expect(
      client.saveProduct({ ...input, image: dataUrl }),
    ).rejects.toMatchObject({ code: 'IMAGE_ERROR', message });
    expect(auth.request).toHaveBeenCalledTimes(1);
  },
);

test('CA-07 an unreadable local image is not sent', async () => {
  const auth = transport();
  const client = createRealMenuClient(auth);
  for (const image of ['blob:kofi/1', 'data:image/png,raw', 'data:;base64,'])
    await expect(client.saveProduct({ ...input, image })).rejects.toMatchObject(
      { code: 'IMAGE_ERROR' },
    );
  expect(auth.request).not.toHaveBeenCalled();
});

test('CA-02 a duplicated name is shown on the name field', async () => {
  const client = createRealMenuClient(transport(error(409, 'DUPLICATE_NAME')));
  await expect(client.saveProduct(input)).rejects.toMatchObject({
    code: 'VALIDATION_ERROR',
    fields: { name: productMessages.duplicate },
  });
});

test.each([
  ['name', 'TOO_LONG', 'name', productMessages.name],
  ['description', 'TOO_SHORT', 'description', productMessages.description],
  ['priceTenths', 'OUT_OF_RANGE', 'price', productMessages.price],
  ['priceTenths', 'INVALID_FORMAT', 'price', productMessages.price],
  ['categoryId', 'NOT_ALLOWED', 'categoryId', productMessages.category],
])(
  'CA-03/CA-07 authoritative %s %s is shown on its form field',
  async (field, code, formField, message) => {
    const client = createRealMenuClient(
      transport(error(400, 'VALIDATION_ERROR', { fields: [{ field, code }] })),
    );
    await expect(client.saveProduct(input)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: productMessages.fields,
      fields: { [formField]: message },
    });
  },
);

test('CA-05 an image that expired before the creation asks to retry the upload', async () => {
  const client = createRealMenuClient(
    transport(
      ok({ id: imageId, width: 1, height: 1 }),
      error(400, 'VALIDATION_ERROR', {
        fields: [{ field: 'imageId', code: 'NOT_ALLOWED' }],
      }),
    ),
  );
  await expect(
    client.saveProduct({ ...input, image: dataUrl }),
  ).rejects.toMatchObject({
    code: 'IMAGE_ERROR',
    message: productMessages.imageFailed,
  });
});

test.each([
  [
    error(400, 'VALIDATION_ERROR', {
      fields: [{ field: '', code: 'NOT_ALLOWED' }],
    }),
  ],
  [error(400, 'VALIDATION_ERROR')],
  [error(415, 'UNSUPPORTED_MEDIA_TYPE')],
  [error(500, 'INTERNAL_ERROR')],
  [{ kind: 'connection' } as HttpResult<unknown>],
  [new Error('transport failure')],
  [ok({ ...product, id: 'bad' })],
  [ok({ ...product, imageId })],
  [ok(undefined)],
])(
  'CA-07 any other answer is a failure, never a saved product %#',
  async (result) => {
    const client = createRealMenuClient(transport(result));
    await expect(client.saveProduct(input)).rejects.toMatchObject({
      code: 'CONNECTION_ERROR',
      message: menuMessages.connection,
    });
  },
);

test('US-001 CA-09 an unauthorized creation is reported as a finished session', async () => {
  const client = createRealMenuClient(transport({ kind: 'unauthorized' }));
  await expect(client.saveProduct(input)).rejects.toMatchObject({
    code: 'CONNECTION_ERROR',
    message: menuMessages.session,
  });
});

test('getProduct reads one product and reports a missing one', async () => {
  const auth = transport(ok(product), error(404, 'NOT_FOUND'));
  const client = createRealMenuClient(auth);
  await expect(client.getProduct(product.id)).resolves.toMatchObject({
    id: product.id,
    image: null,
  });
  expect(auth.request.mock.calls[0]?.[0]).toBe(`/api/products/${product.id}`);
  await expect(client.getProduct(product.id)).rejects.toMatchObject({
    code: 'CONNECTION_ERROR',
    message: productMessages.missing,
  });
});

test('dataUrlBytes decodes base64 data URLs only', () => {
  expect(Array.from(dataUrlBytes('data:image/png;base64,AQID')!)).toEqual([
    1, 2, 3,
  ]);
  expect(dataUrlBytes('data:image/png,AQID')).toBeNull();
  expect(dataUrlBytes('blob:kofi/1')).toBeNull();
  expect(dataUrlBytes('data:image/png;base64,***')).toBeNull();
});

// US-007 (TASK-018): edition over PATCH /api/products/:id.
const savedImage = 'blob:kofi/saved';
const current: Product = {
  id: product.id,
  version: 3,
  name: product.name,
  description: product.description,
  priceTenths: product.priceTenths,
  categoryId: product.categoryId,
  image: savedImage,
  active: true,
};

test.each([
  ['unchanged image', savedImage, [], undefined],
  ['removed image', null, [], null],
  ['new image', dataUrl, [ok({ id: imageId, width: 1, height: 1 })], imageId],
] as const)(
  'US-007 CA-01 edition with %s sends an exact PATCH with the version and keeps the identity',
  async (_, image, uploads, sentImageId) => {
    const auth = transport(
      ...uploads,
      ok({
        ...product,
        version: 4,
        name: 'Café de olla',
        imageId: sentImageId === undefined ? imageId : sentImageId,
      }),
    );
    const client = createRealMenuClient(auth);
    const saved = await client.saveProduct(
      { ...input, name: 'Café de olla', image },
      current,
    );
    expect(saved).toEqual({
      ...current,
      version: 4,
      name: 'Café de olla',
      image,
    });
    expect(auth.request).toHaveBeenCalledTimes(uploads.length + 1);
    const [path, init] = auth.request.mock.calls[uploads.length]!;
    expect(path).toBe(`/api/products/${product.id}`);
    expect(init).toMatchObject({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      version: 3,
      name: 'Café de olla',
      description: 'Café filtrado de la casa.',
      priceTenths: 105,
      categoryId: category.id,
      ...(sentImageId !== undefined && { imageId: sentImageId }),
    });
  },
);

test('US-007 CA-03 a stale save maps to the exact product conflict message', async () => {
  const client = createRealMenuClient(
    transport(
      error(409, 'VERSION_CONFLICT', { current: { ...product, version: 4 } }),
    ),
  );
  await expect(
    client.saveProduct({ ...input, image: savedImage }, current),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message:
      'Este producto cambió mientras lo editabas. Revisa la versión actual y vuelve a aplicar tus cambios.',
  });
});

test.each([
  [error(409, 'DUPLICATE_NAME'), 'VALIDATION_ERROR', productMessages.duplicate],
  [
    error(400, 'VALIDATION_ERROR', {
      fields: [{ field: 'priceTenths', code: 'OUT_OF_RANGE' }],
    }),
    'VALIDATION_ERROR',
    productMessages.fields,
  ],
  [
    error(400, 'VALIDATION_ERROR', {
      fields: [{ field: 'imageId', code: 'NOT_ALLOWED' }],
    }),
    'IMAGE_ERROR',
    productMessages.imageFailed,
  ],
  [error(404, 'NOT_FOUND'), 'CONNECTION_ERROR', productMessages.missing],
  [
    ok({ ...product, id: 'cccccccccccccccccccccccc' }),
    'CONNECTION_ERROR',
    menuMessages.connection,
  ],
])(
  'US-007 CA-02/CA-06 a rejected edition is communicated and never a saved product %#',
  async (result, code, message) => {
    const client = createRealMenuClient(transport(result));
    await expect(
      client.saveProduct({ ...input, image: savedImage }, current),
    ).rejects.toMatchObject({ code, message });
  },
);

test('US-007 CA-06 a failed upload of the new image sends no PATCH', async () => {
  const auth = transport(error(500, 'INTERNAL_ERROR'));
  const client = createRealMenuClient(auth);
  await expect(
    client.saveProduct({ ...input, image: dataUrl }, current),
  ).rejects.toMatchObject({
    code: 'IMAGE_ERROR',
    message: productMessages.imageFailed,
  });
  expect(auth.request).toHaveBeenCalledTimes(1);
  expect(auth.request.mock.calls[0]?.[0]).toBe('/api/product-images');
});
