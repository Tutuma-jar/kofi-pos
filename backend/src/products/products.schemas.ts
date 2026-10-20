import { z, type ZodError } from 'zod';
import { ApiError } from '../shared/http/api-error.js';
import { boundedTextSchema } from '../shared/text/catalog-text.js';

export const PRODUCT_NAME_MAX = 100;
export const PRODUCT_DESCRIPTION_MAX = 1000;
export const objectIdHex = /^[a-f0-9]{24}$/;

// Shared with renaming (TASK-018): same normalization and length rule.
export const productNameSchema = boundedTextSchema(PRODUCT_NAME_MAX);
export const productDescriptionSchema = boundedTextSchema(
  PRODUCT_DESCRIPTION_MAX,
);
// Integer tenths of BOB: at most one decimal by construction. No commercial
// maximum; the technical limit is a safe integer (US-011 CA-07).
export const priceTenthsSchema = z.number().superRefine((value, ctx) => {
  if (!Number.isInteger(value))
    ctx.addIssue({
      code: 'custom',
      params: { fieldCode: 'INVALID_FORMAT' },
      input: value,
    });
  else if (value < 1 || value > Number.MAX_SAFE_INTEGER)
    ctx.addIssue({
      code: 'custom',
      params: { fieldCode: 'OUT_OF_RANGE' },
      input: value,
    });
});
const idSchema = z.string().regex(objectIdHex);

export const createProductSchema = z.strictObject({
  name: productNameSchema,
  description: productDescriptionSchema,
  priceTenths: priceTenthsSchema,
  categoryId: idSchema,
  imageId: idSchema.nullable(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;
export const productParamsSchema = z.strictObject({ id: idSchema });

type Issue = ZodError['issues'][number];
function fieldCode(issue: Issue): string {
  if (issue.code === 'custom') {
    const code: unknown = issue.params?.fieldCode;
    return typeof code === 'string' ? code : 'INVALID_FORMAT';
  }
  if (issue.code === 'unrecognized_keys') return 'NOT_ALLOWED';
  if (issue.code === 'too_small') return 'TOO_SHORT';
  if (issue.code === 'too_big') return 'TOO_LONG';
  // Omitted fields stay INVALID_FORMAT, as in the shared error handler.
  return 'INVALID_FORMAT';
}

// Same envelope as the shared handler, plus OUT_OF_RANGE for the price.
export function parseCreateProduct(body: unknown): CreateProductInput {
  const result = createProductSchema.safeParse(body);
  if (!result.success)
    throw new ApiError('VALIDATION_ERROR', 'Solicitud inválida.', {
      fields: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        code: fieldCode(issue),
      })),
    });
  return result.data;
}
