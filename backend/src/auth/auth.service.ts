import type { Db, ObjectId } from 'mongodb';
import { accountsCollection } from './account.model.js';
import { credentialsSchema } from './auth.schemas.js';
import {
  DUMMY_PASSWORD_HASH,
  PasswordCapacityError,
  verifyPassword,
} from './password.js';

export type CredentialResult =
  | { status: 'credentials-verified'; accountId: ObjectId }
  | { status: 'incorrect' }
  | { status: 'rate-limited'; retryAfterSeconds: number };

interface RateLimitOptions {
  windowMs?: number;
  maxAttempts?: number;
  maxEntries?: number;
  now?: () => number;
}

// Fixed windows never extend on rejected attempts; expiry is cleaned on every check.
export function createCredentialRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const maxAttempts = options.maxAttempts ?? 5;
  const maxEntries = options.maxEntries ?? 1024;
  const now = options.now ?? Date.now;
  for (const value of [windowMs, maxAttempts, maxEntries]) {
    if (!Number.isSafeInteger(value) || value < 1)
      throw new RangeError('Invalid rate limits');
  }
  const windows = new Map<string, { attempts: number; expiresAt: number }>();

  return {
    check(trustedIp: string): number | null {
      // Only a server-resolved req.ip may be supplied; never a body/header value.
      if (
        typeof trustedIp !== 'string' ||
        trustedIp.length < 1 ||
        trustedIp.length > 256
      ) {
        throw new RangeError('A trusted client IP is required');
      }
      const currentTime = now();
      let earliestExpiry = Infinity;
      for (const [key, window] of windows) {
        if (window.expiresAt <= currentTime) windows.delete(key);
        else earliestExpiry = Math.min(earliestExpiry, window.expiresAt);
      }
      const retryAfter = (expiresAt: number) =>
        Math.max(1, Math.ceil((expiresAt - currentTime) / 1000));
      const existing = windows.get(trustedIp);
      if (existing) {
        if (existing.attempts >= maxAttempts)
          return retryAfter(existing.expiresAt);
        existing.attempts += 1;
      } else {
        // Do not evict live windows: rotating IPs must not reset existing limits.
        if (windows.size >= maxEntries) return retryAfter(earliestExpiry);
        windows.set(trustedIp, {
          attempts: 1,
          expiresAt: currentTime + windowMs,
        });
      }
      return null;
    },
    get size(): number {
      return windows.size;
    },
  };
}

export function createAuthService(
  db: Db,
  options: {
    rateLimiter?: ReturnType<typeof createCredentialRateLimiter>;
    verifyPassword?: typeof verifyPassword;
  } = {},
) {
  const accounts = accountsCollection(db);
  const rateLimiter = options.rateLimiter ?? createCredentialRateLimiter();
  const verify = options.verifyPassword ?? verifyPassword;

  return {
    // Does not emit a session or grant authorization. TASK-002 consumes accountId
    // only after separately validating the future route's tab binding.
    async verifyCredentials(
      input: unknown,
      trustedIp: string,
    ): Promise<CredentialResult> {
      const credentials = credentialsSchema.parse(input);
      const retryAfterSeconds = rateLimiter.check(trustedIp);
      if (retryAfterSeconds !== null)
        return { status: 'rate-limited', retryAfterSeconds };

      // Explicit simple collation preserves exact username matching even when the
      // external collection has a case-insensitive default collation.
      const account = await accounts.findOne(
        { username: credentials.username },
        { collation: { locale: 'simple' } },
      );
      try {
        const matches = await verify(
          credentials.password,
          account?.passwordHash ?? DUMMY_PASSWORD_HASH,
        );
        if (!account || !matches) return { status: 'incorrect' };
        return { status: 'credentials-verified', accountId: account._id };
      } catch (error) {
        if (error instanceof PasswordCapacityError) {
          return { status: 'rate-limited', retryAfterSeconds: 1 };
        }
        throw error;
      }
    },
  };
}
