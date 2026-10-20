import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// backend/var/product-images, from both src/ and dist/ (same depth).
export const DEFAULT_PRODUCT_IMAGES_DIR = fileURLToPath(
  new URL('../../../var/product-images', import.meta.url),
);

const envSchema = z
  .object({
    PORT: z
      .string()
      .regex(/^\d+$/, 'PORT debe ser un entero entre 1 y 65535.')
      .default('3000')
      .transform(Number)
      .pipe(z.number().int().min(1).max(65535)),
    MONGODB_URI: z
      .string()
      .regex(
        /^mongodb(\+srv)?:\/\//,
        'MONGODB_URI debe ser una cadena de conexión MongoDB.',
      ),
    NODE_ENV: z.string().optional(),
    PRODUCT_IMAGES_DIR: z
      .string()
      .trim()
      .min(1, 'PRODUCT_IMAGES_DIR no puede estar vacía.')
      .optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.PRODUCT_IMAGES_DIR === undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['PRODUCT_IMAGES_DIR'],
        message: 'PRODUCT_IMAGES_DIR es obligatoria en producción.',
      });
  })
  .transform(({ PORT, MONGODB_URI, PRODUCT_IMAGES_DIR }) => ({
    PORT,
    MONGODB_URI,
    // Persistent volume for product images (architecture §7).
    PRODUCT_IMAGES_DIR: resolve(
      PRODUCT_IMAGES_DIR ?? DEFAULT_PRODUCT_IMAGES_DIR,
    ),
  }));

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const messages = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Configuración de entorno inválida. ${messages.join(' ')}`);
  }

  return result.data;
}
