import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const PARAMETERS = {
  N: 131072,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024,
} as const;
const PREFIX = 'kofi-scrypt$v1$131072$8$1$';
const HASH_PATTERN =
  /^kofi-scrypt\$v1\$131072\$8\$1\$([0-9a-f]{32})\$([0-9a-f]{128})$/;
const HASH_LENGTH = PREFIX.length + SALT_BYTES * 2 + 1 + KEY_BYTES * 2;

// Public, non-secret dummy record: executes exactly the same KDF as a real account.
export const DUMMY_PASSWORD_HASH = `${PREFIX}${'00'.repeat(SALT_BYTES)}$${'00'.repeat(KEY_BYTES)}`;

export class PasswordCapacityError extends Error {
  constructor() {
    super('Password verification capacity reached');
    this.name = 'PasswordCapacityError';
  }
}

function parseHash(value: unknown): { salt: Buffer; digest: Buffer } | null {
  // Bound work before regex, buffer allocations or KDF; no DB-controlled options.
  if (typeof value !== 'string' || value.length !== HASH_LENGTH) return null;
  const match = HASH_PATTERN.exec(value);
  if (!match?.[1] || !match[2]) return null;
  return {
    salt: Buffer.from(match[1], 'hex'),
    digest: Buffer.from(match[2], 'hex'),
  };
}

function checkPassword(password: string): void {
  if (
    typeof password !== 'string' ||
    password.length < 1 ||
    password.length > 1024
  ) {
    throw new RangeError(
      'Password must contain between 1 and 1024 UTF-16 code units',
    );
  }
}

// A single shared instance below bounds KDF memory and pending work process-wide.
// Factory limits can only be lowered for isolated tests, not enlarged by callers.
export function createPasswordHasher(
  limits: { concurrency?: number; queueSize?: number } = {},
) {
  const concurrency = limits.concurrency ?? 1;
  const queueSize = limits.queueSize ?? 4;
  if (
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > 1 ||
    !Number.isInteger(queueSize) ||
    queueSize < 0 ||
    queueSize > 4
  ) {
    throw new RangeError('Invalid password work limits');
  }
  let active = 0;
  const waiting: Array<() => void> = [];

  async function derive(password: string, salt: Buffer): Promise<Buffer> {
    if (active >= concurrency) {
      if (waiting.length >= queueSize) throw new PasswordCapacityError();
      await new Promise<void>((resolve) => waiting.push(resolve));
    } else {
      active += 1;
    }
    try {
      return await new Promise<Buffer>((resolve, reject) => {
        scrypt(password, salt, KEY_BYTES, PARAMETERS, (error, key) => {
          if (error) reject(error);
          else resolve(key);
        });
      });
    } finally {
      const next = waiting.shift();
      if (next)
        next(); // Transfer the active slot without allowing a new arrival to steal it.
      else active -= 1;
    }
  }

  return {
    async hash(password: string): Promise<string> {
      checkPassword(password);
      const salt = randomBytes(SALT_BYTES);
      const digest = await derive(password, salt);
      return `${PREFIX}${salt.toString('hex')}$${digest.toString('hex')}`;
    },
    async verify(password: string, storedHash: string): Promise<boolean> {
      checkPassword(password);
      const parsed = parseHash(storedHash);
      const record = parsed ?? parseHash(DUMMY_PASSWORD_HASH)!;
      const digest = await derive(password, record.salt);
      const matches = timingSafeEqual(digest, record.digest);
      return parsed !== null && matches;
    },
  };
}

const passwordHasher = createPasswordHasher();
export const hashPassword = passwordHasher.hash;
export const verifyPassword = passwordHasher.verify;
