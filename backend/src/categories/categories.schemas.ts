import { z } from 'zod';
import {
  boundedTextSchema,
  catalogNameKey,
  normalizeCatalogText,
  visibleLength,
} from '../shared/text/catalog-text.js';

export const CATEGORY_NAME_MAX = 80;

// Shared unit with the client (US-006): visible characters, i.e. graphemes.
export { visibleLength };
export const normalizeCategoryName = normalizeCatalogText;
// Ignores case and edge spaces, never accents (US-008 CA-02).
export const categoryNameKey = catalogNameKey;

export const categoryNameSchema = boundedTextSchema(CATEGORY_NAME_MAX);
export const createCategorySchema = z.strictObject({
  name: categoryNameSchema,
});
