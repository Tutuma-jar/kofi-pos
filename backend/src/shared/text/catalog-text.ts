import { MongoServerError } from 'mongodb';
import { z } from 'zod';

/**
 * Shared catalog text contract (US-006, US-007 and US-008).
 * Length unit: visible characters (graphemes) after trimming edge spaces.
 * Name comparison: ignore case and edge spaces, keep accents. NFC only unifies
 * composed and decomposed forms of the same character; it adds no equivalence.
 */
const graphemes = new Intl.Segmenter('es', { granularity: 'grapheme' });

export const visibleLength = (text: string) =>
  Array.from(graphemes.segment(text)).length;
export const normalizeCatalogText = (text: string) =>
  text.trim().normalize('NFC');
export const catalogNameKey = (name: string) =>
  normalizeCatalogText(name).toLowerCase();

// Native size codes, so the error handler reports TOO_SHORT / TOO_LONG.
export function boundedTextSchema(max: number) {
  return z
    .string()
    .transform(normalizeCatalogText)
    .superRefine((value, ctx) => {
      const length = visibleLength(value);
      if (length < 1)
        ctx.addIssue({
          code: 'too_small',
          origin: 'string',
          minimum: 1,
          inclusive: true,
          input: value,
        });
      else if (length > max)
        ctx.addIssue({
          code: 'too_big',
          origin: 'string',
          maximum: max,
          inclusive: true,
          input: value,
        });
    });
}

// Only a unique index on `nameKey` decides duplicates, also under concurrency.
export function isDuplicateNameKey(error: unknown): boolean {
  if (!(error instanceof MongoServerError) || error.code !== 11000)
    return false;
  const pattern: unknown = (error as { keyPattern?: unknown }).keyPattern;
  return (
    typeof pattern === 'object' && pattern !== null && 'nameKey' in pattern
  );
}
