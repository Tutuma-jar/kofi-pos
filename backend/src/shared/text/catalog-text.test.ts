import { MongoServerError } from 'mongodb';
import { expect, test } from 'vitest';
import {
  boundedTextSchema,
  catalogNameKey,
  isDuplicateNameKey,
  normalizeCatalogText,
  visibleLength,
} from './catalog-text.js';

test('US-006 units: graphemes after trimming, composed characters count as one', () => {
  expect(visibleLength('ñ')).toBe(1);
  expect(visibleLength('ñ')).toBe(1);
  expect(visibleLength('👨‍👩‍👧')).toBe(1);
  expect(visibleLength(normalizeCatalogText('  Café  '))).toBe(4);
});

test('US-006 CA-02 / US-008 CA-02 key ignores case and edge spaces, keeps accents', () => {
  expect(catalogNameKey('  CAFÉ ')).toBe('café');
  expect(catalogNameKey('\tcAfÉ\n')).toBe(catalogNameKey('Café'));
  expect(catalogNameKey('Café')).toBe(catalogNameKey('Café'));
  expect(catalogNameKey('Cafe')).not.toBe(catalogNameKey('Café'));
  expect(catalogNameKey('Té  verde')).not.toBe(catalogNameKey('Té verde'));
});

test('bounded text accepts 1..max graphemes and reports native size codes', () => {
  const schema = boundedTextSchema(3);
  expect(schema.parse('  ñ̃a ')).toBe(normalizeCatalogText('ñ̃a'));
  expect(schema.safeParse('abc').success).toBe(true);
  expect(schema.safeParse('👨‍👩‍👧👨‍👩‍👧👨‍👩‍👧').success).toBe(true);
  const short = schema.safeParse('   ');
  const long = schema.safeParse('abcd');
  expect(short.success ? null : short.error.issues[0]?.code).toBe('too_small');
  expect(long.success ? null : long.error.issues[0]?.code).toBe('too_big');
});

test('duplicate detection only accepts E11000 on the nameKey index', () => {
  const duplicate = new MongoServerError({ message: 'dup', code: 11000 });
  Object.assign(duplicate, { code: 11000, keyPattern: { nameKey: 1 } });
  const other = new MongoServerError({ message: 'dup', code: 11000 });
  Object.assign(other, { code: 11000, keyPattern: { _id: 1 } });
  expect(isDuplicateNameKey(duplicate)).toBe(true);
  expect(isDuplicateNameKey(other)).toBe(false);
  expect(isDuplicateNameKey(new Error('x'))).toBe(false);
});
