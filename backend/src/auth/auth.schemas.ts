import { z } from 'zod';

// Internal credential input, not the future POST /api/sessions DTO.
// Its route must validate tabBinding separately in a strict outer schema;
// passing the whole HTTP body here intentionally rejects unknown properties.
export const credentialsSchema = z.strictObject({
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(1024),
});

export type Credentials = z.infer<typeof credentialsSchema>;
