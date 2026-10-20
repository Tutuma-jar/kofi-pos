import { z } from 'zod';

export const CATEGORY_NAME_MAX = 80;
const graphemes = new Intl.Segmenter('es', { granularity: 'grapheme' });

// Shared unit with the client (US-006): visible characters, i.e. graphemes.
export const visibleLength = (text: string) =>
  Array.from(graphemes.segment(text)).length;
export const normalizeCategoryName = (name: string) =>
  name.trim().normalize('NFC');
// Ignores case and edge spaces, never accents (US-008 CA-02).
export const categoryNameKey = (name: string) =>
  normalizeCategoryName(name).toLowerCase();

export const categoryNameSchema = z
  .string()
  .transform(normalizeCategoryName)
  .superRefine((value, ctx) => {
    const length = visibleLength(value);
    // Native size codes, so the error handler reports TOO_SHORT / TOO_LONG.
    if (length < 1)
      ctx.addIssue({
        code: 'too_small',
        origin: 'string',
        minimum: 1,
        inclusive: true,
        input: value,
      });
    else if (length > CATEGORY_NAME_MAX)
      ctx.addIssue({
        code: 'too_big',
        origin: 'string',
        maximum: CATEGORY_NAME_MAX,
        inclusive: true,
        input: value,
      });
  });
export const createCategorySchema = z.strictObject({
  name: categoryNameSchema,
});
