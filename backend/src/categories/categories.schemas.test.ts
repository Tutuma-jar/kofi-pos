import { expect, test } from 'vitest';
import {
  categoryNameKey,
  categoryParamsSchema,
  createCategorySchema,
  deleteCategorySchema,
  updateCategorySchema,
  visibleLength,
} from './categories.schemas.js';

const issues = (input: unknown) => {
  const result = createCategorySchema.safeParse(input);
  if (result.success) throw new Error('Expected a rejection');
  return result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
  }));
};

test('CA-06 trims edge spaces and counts graphemes, composed characters included', () => {
  expect(createCategorySchema.parse({ name: '  Café  ' })).toEqual({
    name: 'Café',
  });
  expect(visibleLength('ñ')).toBe(1);
  expect(visibleLength('ñ')).toBe(1);
  expect(visibleLength('👨‍👩‍👧')).toBe(1);
  expect(visibleLength('a'.repeat(80))).toBe(80);
});

test.each([
  ['a'],
  [' a '],
  ['a'.repeat(80)],
  [` ${'a'.repeat(80)} `],
  ['ñ'.repeat(80)],
  ['ñ'.repeat(80)],
  ['👨‍👩‍👧'.repeat(80)],
])('CA-06 accepts boundary length %#', (name) => {
  expect(createCategorySchema.safeParse({ name }).success).toBe(true);
});

test.each([[''], [' '], ['   \t\n ']])(
  'CA-06 rejects empty or only spaces as too_small %#',
  (name) => {
    expect(issues({ name })).toEqual([{ path: 'name', code: 'too_small' }]);
  },
);

test.each([
  ['a'.repeat(81)],
  [` ${'a'.repeat(81)} `],
  ['ñ'.repeat(81)],
  ['👨‍👩‍👧'.repeat(81)],
])('CA-06 rejects 81 visible characters as too_big %#', (name) => {
  expect(issues({ name })).toEqual([{ path: 'name', code: 'too_big' }]);
});

test('CA-06 stores NFC so composed and decomposed forms are the same name', () => {
  expect(createCategorySchema.parse({ name: 'Baño' }).name).toBe('Baño');
});

test('CA-02 key ignores case and edge spaces but keeps accents', () => {
  expect(categoryNameKey('  CAFÉ ')).toBe('café');
  expect(categoryNameKey('Café')).toBe(categoryNameKey(' café'));
  expect(categoryNameKey('Café')).toBe(categoryNameKey('Café'));
  expect(categoryNameKey('Cafe')).not.toBe(categoryNameKey('Café'));
});

test.each([
  [null],
  [{}],
  [[]],
  [{ name: 1 }],
  [{ name: null }],
  [{ name: 'Café', extra: true }],
  [{ name: 'Café', version: 1 }],
])('rejects missing, mistyped or unknown input %#', (input) => {
  expect(createCategorySchema.safeParse(input).success).toBe(false);
});

// --- TASK-020: renaming and deletion ----------------------------------------

const updateIssues = (input: unknown) => {
  const result = updateCategorySchema.safeParse(input);
  if (result.success) throw new Error('Expected a rejection');
  return result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
  }));
};

test('CA-06 renaming applies the creation rules: trimmed, NFC, graphemes', () => {
  expect(updateCategorySchema.parse({ version: 3, name: '  Baño  ' })).toEqual({
    version: 3,
    name: 'Baño',
  });
  for (const name of ['a', 'ñ'.repeat(80), '👨‍👩‍👧'.repeat(80)])
    expect(updateCategorySchema.safeParse({ version: 1, name }).success).toBe(
      true,
    );
});

test.each([
  ['', 'too_small'],
  ['  \t ', 'too_small'],
  ['a'.repeat(81), 'too_big'],
  ['ñ'.repeat(81), 'too_big'],
  ['👨‍👩‍👧'.repeat(81), 'too_big'],
])('CA-06 renaming rejects %#', (name, code) => {
  expect(updateIssues({ version: 1, name })).toEqual([{ path: 'name', code }]);
});

test.each([
  [{ name: 'Café' }],
  [{ version: 0, name: 'Café' }],
  [{ version: -1, name: 'Café' }],
  [{ version: 1.5, name: 'Café' }],
  [{ version: '1', name: 'Café' }],
  [{ version: Number.MAX_SAFE_INTEGER + 1, name: 'Café' }],
  [{ version: 1 }],
  [{ version: 1, name: 'Café', productCount: 0 }],
  [null],
])('renaming requires a valid version and name, nothing else %#', (input) => {
  expect(updateCategorySchema.safeParse(input).success).toBe(false);
});

test('deletion accepts only the version', () => {
  expect(deleteCategorySchema.parse({ version: 2 })).toEqual({ version: 2 });
  for (const input of [
    {},
    null,
    { version: 0 },
    { version: 1.5 },
    { version: '2' },
    { version: 2, name: 'Café' },
  ])
    expect(deleteCategorySchema.safeParse(input).success).toBe(false);
});

test('identity is a 24-character lower-case hexadecimal id', () => {
  expect(
    categoryParamsSchema.safeParse({ id: '0123456789abcdef01234567' }).success,
  ).toBe(true);
  for (const id of ['x', '0123456789ABCDEF01234567', '0123456789abcdef0123456'])
    expect(categoryParamsSchema.safeParse({ id }).success).toBe(false);
});
