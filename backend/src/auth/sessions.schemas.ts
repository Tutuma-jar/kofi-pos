import { z } from 'zod';
import { credentialsSchema } from './auth.schemas.js';

export const opaqueSecretSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const loginSchema = credentialsSchema.extend({
  tabBinding: opaqueSecretSchema,
});
export const emptySchema = z.strictObject({});
