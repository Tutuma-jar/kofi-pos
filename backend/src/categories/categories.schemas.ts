import { z } from 'zod';
import { versionSchema } from '../shared/http/version.js';
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

export const categoryParamsSchema = z.strictObject({
  id: z.string().regex(/^[a-f0-9]{24}$/),
});

/**
 * Renaming (TASK-020): the same name rules as the creation plus the optimistic
 * version, both mandatory. The own name is accepted (same document).
 */
export const updateCategorySchema = z.strictObject({
  version: versionSchema,
  name: categoryNameSchema,
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// Deletion (TASK-020): only the version the operator saw; nothing else.
export const deleteCategorySchema = z.strictObject({
  version: versionSchema,
});
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
