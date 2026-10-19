import { z } from 'zod';

const envSchema = z.object({
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
});

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
