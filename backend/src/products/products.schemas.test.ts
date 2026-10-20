import { expect, test } from 'vitest';
import { ApiError } from '../shared/http/api-error.js';
import {
  parseCreateProduct,
  parseProductActivation,
  parseUpdateProduct,
} from './products.schemas.js';

const valid = {
  name: 'Café americano',
  description: 'Café filtrado de la casa.',
  priceTenths: 105,
  categoryId: '0123456789abcdef01234567',
  imageId: null,
};
function rejection(
  input: unknown,
  parse: (body: unknown) => unknown = parseCreateProduct,
) {
  try {
    parse(input);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    expect(error.code).toBe('VALIDATION_ERROR');
    return (error.details as { fields: { field: string; code: string }[] })
      .fields;
  }
  throw new Error('Expected a rejection');
}

test('CA-01 normalizes edge spaces and NFC, keeps the rest of the input', () => {
  expect(
    parseCreateProduct({
      ...valid,
      name: '  Café americano ',
      description: '\tCafé filtrado de la casa.\n',
    }),
  ).toEqual(valid);
  expect(
    parseCreateProduct({ ...valid, imageId: 'abcdefabcdefabcdefabcdef' })
      .imageId,
  ).toBe('abcdefabcdefabcdefabcdef');
});

test.each(['name', 'description', 'priceTenths', 'categoryId', 'imageId'])(
  'CA-01 rejects a request without %s (omitted stays INVALID_FORMAT)',
  (field) => {
    const input: Record<string, unknown> = { ...valid };
    delete input[field];
    expect(rejection(input)).toEqual([{ field, code: 'INVALID_FORMAT' }]);
  },
);

test.each([
  ['name', '', 'TOO_SHORT'],
  ['name', '   ', 'TOO_SHORT'],
  ['name', 'a'.repeat(101), 'TOO_LONG'],
  ['name', 'ñ'.repeat(101), 'TOO_LONG'],
  ['description', ' \n ', 'TOO_SHORT'],
  ['description', 'a'.repeat(1001), 'TOO_LONG'],
  ['description', '👨‍👩‍👧'.repeat(1001), 'TOO_LONG'],
])('CA-07 %s %#: rejected as %s', (field, value, code) => {
  expect(rejection({ ...valid, [field]: value })).toEqual([{ field, code }]);
});

test.each([
  ['name', 'a'],
  ['name', ` ${'a'.repeat(100)} `],
  ['name', 'ñ'.repeat(100)],
  ['name', '👨‍👩‍👧'.repeat(100)],
  ['description', 'x'],
  ['description', 'ñ'.repeat(1000)],
  ['description', '👨‍👩‍👧'.repeat(1000)],
])('CA-07 %s %#: boundary accepted', (field, value) => {
  expect(() => parseCreateProduct({ ...valid, [field]: value })).not.toThrow();
});

test.each([[1], [10], [105], [Number.MAX_SAFE_INTEGER]])(
  'CA-03 accepts a positive integer of tenths: %d',
  (priceTenths) => {
    expect(parseCreateProduct({ ...valid, priceTenths }).priceTenths).toBe(
      priceTenths,
    );
  },
);

test.each([
  [0, 'OUT_OF_RANGE'],
  [-1, 'OUT_OF_RANGE'],
  [-0.5, 'INVALID_FORMAT'],
  [10.5, 'INVALID_FORMAT'],
  [Number.MAX_SAFE_INTEGER + 1, 'OUT_OF_RANGE'],
  [1e300, 'OUT_OF_RANGE'],
  ['105', 'INVALID_FORMAT'],
  [null, 'INVALID_FORMAT'],
])('CA-03 rejects priceTenths %j as %s', (priceTenths, code) => {
  expect(rejection({ ...valid, priceTenths })).toEqual([
    { field: 'priceTenths', code },
  ]);
});

test.each([
  ['categoryId', 'abc'],
  ['categoryId', '0123456789ABCDEF01234567'],
  ['categoryId', null],
  ['imageId', 'x'],
  ['imageId', 1],
])('CA-01 rejects malformed %s %#', (field, value) => {
  expect(rejection({ ...valid, [field]: value })).toEqual([
    { field, code: 'INVALID_FORMAT' },
  ]);
});

test('unknown fields and non-objects are rejected', () => {
  expect(rejection({ ...valid, active: false })).toContainEqual({
    field: '',
    code: 'NOT_ALLOWED',
  });
  expect(rejection({ ...valid, stock: 3 })).toContainEqual({
    field: '',
    code: 'NOT_ALLOWED',
  });
  expect(rejection(null)).toEqual([{ field: '', code: 'INVALID_FORMAT' }]);
  expect(rejection([])).toEqual([{ field: '', code: 'INVALID_FORMAT' }]);
});

// US-007 (TASK-018): edition reuses the same field rules, all optional.
const rejectUpdate = (input: unknown) => rejection(input, parseUpdateProduct);

test('US-007 CA-01/CA-02 edition: normalizes like creation; omitted means unchanged', () => {
  expect(parseUpdateProduct({ version: 3, name: '  Café americano ' })).toEqual(
    { version: 3, name: 'Café americano' },
  );
  expect(parseUpdateProduct({ ...valid, version: 1 })).toEqual({
    ...valid,
    version: 1,
  });
  expect(parseUpdateProduct({ version: 2, imageId: null })).toEqual({
    version: 2,
    imageId: null,
  });
});

test.each([
  [{ name: 'x' }],
  [{ version: 0, name: 'x' }],
  [{ version: -1, name: 'x' }],
  [{ version: 1.5, name: 'x' }],
  [{ version: '1', name: 'x' }],
  [{ version: null, name: 'x' }],
  [{ version: Number.MAX_SAFE_INTEGER + 1, name: 'x' }],
])('US-007 CA-03 edition requires a valid version %#', (input) => {
  expect(rejectUpdate(input)).toEqual([
    { field: 'version', code: 'INVALID_FORMAT' },
  ]);
});

test('US-007 edition: only a version is not an edit', () => {
  expect(rejectUpdate({ version: 1 })).toEqual([
    { field: '', code: 'REQUIRED' },
  ]);
});

test.each([
  ['name', '   ', 'TOO_SHORT'],
  ['name', 'ñ'.repeat(101), 'TOO_LONG'],
  ['description', '', 'TOO_SHORT'],
  ['description', 'a'.repeat(1001), 'TOO_LONG'],
  ['priceTenths', 0, 'OUT_OF_RANGE'],
  ['priceTenths', 10.5, 'INVALID_FORMAT'],
  ['categoryId', null, 'INVALID_FORMAT'],
  ['categoryId', 'abc', 'INVALID_FORMAT'],
  ['imageId', 'x', 'INVALID_FORMAT'],
])(
  'US-007 CA-02 edition rejects %s %# as %s (US-006 rules)',
  (field, value, code) => {
    expect(rejectUpdate({ version: 1, [field]: value })).toEqual([
      { field, code },
    ]);
  },
);

test('US-007 edition: activation and unknown fields are not editable here', () => {
  for (const extra of [{ active: false }, { id: 'x' }, { stock: 3 }])
    expect(rejectUpdate({ version: 1, name: 'x', ...extra })).toContainEqual({
      field: '',
      code: 'NOT_ALLOWED',
    });
  expect(rejectUpdate(null)).toEqual([{ field: '', code: 'INVALID_FORMAT' }]);
});

// US-009 (TASK-022): activation carries only the target state and the version.
const rejectActivation = (input: unknown) =>
  rejection(input, parseProductActivation);

test('US-009 CA-01/CA-03 activation accepts an explicit target state with its version', () => {
  expect(parseProductActivation({ version: 1, active: false })).toEqual({
    version: 1,
    active: false,
  });
  expect(parseProductActivation({ version: 7, active: true })).toEqual({
    version: 7,
    active: true,
  });
});

test.each([
  [{ active: false }, 'version'],
  [{ version: 0, active: false }, 'version'],
  [{ version: 1.5, active: false }, 'version'],
  [{ version: '1', active: false }, 'version'],
  [{ version: 1 }, 'active'],
  [{ version: 1, active: 'false' }, 'active'],
  [{ version: 1, active: 0 }, 'active'],
  [{ version: 1, active: null }, 'active'],
])('US-009 activation rejects %j at %s', (input, field) => {
  expect(rejectActivation(input)).toEqual([{ field, code: 'INVALID_FORMAT' }]);
});

test('US-009 CA-01/CA-02 activation never carries other fields', () => {
  for (const extra of [{ name: 'x' }, { categoryId: 'x' }, { delete: true }])
    expect(
      rejectActivation({ version: 1, active: false, ...extra }),
    ).toContainEqual({ field: '', code: 'NOT_ALLOWED' });
  expect(rejectActivation(null)).toEqual([
    { field: '', code: 'INVALID_FORMAT' },
  ]);
});
