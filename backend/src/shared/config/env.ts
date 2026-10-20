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
    // Loopback by default; a hosted deployment sets 0.0.0.0.
    HOST: z
      .string()
      .trim()
      .min(1, 'HOST no puede estar vacía.')
      .default('127.0.0.1'),
    // Reverse proxy hops in front of Express, so req.ip is the client's address.
    TRUST_PROXY: z
      .string()
      .regex(/^\d+$/, 'TRUST_PROXY debe ser un entero entre 0 y 10.')
      .default('0')
      .transform(Number)
      .pipe(z.number().int().min(0).max(10)),
    NODE_ENV: z.string().optional(),
    PRODUCT_IMAGES_DIR: z
      .string()
      .trim()
      .min(1, 'PRODUCT_IMAGES_DIR no puede estar vacía.')
      .optional(),
    // Built SPA served by Express under the same origin; absent in development (Vite).
    FRONTEND_DIST_DIR: z
      .string()
      .trim()
      .min(1, 'FRONTEND_DIST_DIR no puede estar vacía.')
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
  .transform(
    ({
      PORT,
      HOST,
      TRUST_PROXY,
      MONGODB_URI,
      PRODUCT_IMAGES_DIR,
      FRONTEND_DIST_DIR,
    }) => ({
      PORT,
      HOST,
      TRUST_PROXY,
      MONGODB_URI,
      // Persistent volume for product images (architecture §7).
      PRODUCT_IMAGES_DIR: resolve(
        PRODUCT_IMAGES_DIR ?? DEFAULT_PRODUCT_IMAGES_DIR,
      ),
      FRONTEND_DIST_DIR:
        FRONTEND_DIST_DIR === undefined
          ? undefined
          : resolve(FRONTEND_DIST_DIR),
    }),
  );

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
