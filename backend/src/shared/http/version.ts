import { z } from 'zod';

/**
 * Optimistic version shared by every versioned resource: products (edition
 * TASK-018, activation TASK-022) and categories (TASK-020). A positive safe
 * integer; anything else is INVALID_FORMAT.
 */
export const versionSchema = z.number().superRefine((value, ctx) => {
  if (!Number.isSafeInteger(value) || value < 1)
    ctx.addIssue({
      code: 'custom',
      params: { fieldCode: 'INVALID_FORMAT' },
      input: value,
    });
});
