import { expect, test } from 'vitest';
import {
  categoryNameKey,
  createCategorySchema,
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
