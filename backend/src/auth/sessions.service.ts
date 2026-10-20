import { createHash, randomBytes } from 'node:crypto';
import { ObjectId, type Db } from 'mongodb';
import { ApiError } from '../shared/http/api-error.js';
import {
  sessionDto,
  sessionsCollection,
  type Session,
} from './session.model.js';

export const SESSION_LIFETIME_MS = 120_000;
export const hashSessionSecret = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export type SessionAuthorization = { token: string; binding: string };
export function createSessionsService(
  db: Db,
  clock: () => Date = () => new Date(),
  onRevoked?: (sessionId: string) => void,
) {
  const sessions = sessionsCollection(db);
  const filter = (auth: SessionAuthorization, now: Date) => ({
    tokenHash: hashSessionSecret(auth.token),
    bindingHash: hashSessionSecret(auth.binding),
    revokedAt: null,
    expiresAt: { $gt: now },
  });
  const requireFound = (session: Session | null) => {
    if (!session) throw new ApiError('UNAUTHORIZED', 'Autorización requerida.');
    return session;
  };
  return {
    async create(accountId: ObjectId, label: string, binding: string) {
      const now = clock();
      const token = randomBytes(32).toString('base64url');
      const session: Session = {
        _id: new ObjectId(),
        accountId,
        label,
        tokenHash: hashSessionSecret(token),
        bindingHash: hashSessionSecret(binding),
        createdAt: now,
        lastPresenceAt: now,
        expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS),
        revokedAt: null,
        endReason: null,
      };
      await sessions.insertOne(session);
      return { session: sessionDto(session), sessionToken: token };
    },
    async current(auth: SessionAuthorization) {
      return requireFound(await sessions.findOne(filter(auth, clock())));
    },
    async presence(auth: SessionAuthorization) {
      const now = clock();
      // The predicate and monotonic update are one MongoDB operation: never revive.
      const session = requireFound(
        await sessions.findOneAndUpdate(
          filter(auth, now),
          {
            $max: {
              lastPresenceAt: now,
              expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS),
            },
          },
          { returnDocument: 'after' },
        ),
      );
      return {
        lastPresenceAt: session.lastPresenceAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      };
    },
    async revoke(auth: SessionAuthorization) {
      const now = clock();
      const session = requireFound(
        await sessions.findOneAndUpdate(
          filter(auth, now),
          {
            $set: { revokedAt: now, endReason: 'manual' },
          },
          { returnDocument: 'after' },
        ),
      );
      onRevoked?.(session._id.toHexString());
    },
  };
}
