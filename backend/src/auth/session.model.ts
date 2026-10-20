import type { Collection, Db, ObjectId } from 'mongodb';

export interface Session {
  _id: ObjectId;
  accountId: ObjectId;
  label: string;
  tokenHash: string;
  bindingHash: string;
  createdAt: Date;
  lastPresenceAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  endReason: 'manual' | null;
}
export function sessionsCollection(db: Db): Collection<Session> {
  return db.collection<Session>('sessions');
}
export async function ensureSessionIndexes(db: Db): Promise<void> {
  await sessionsCollection(db).createIndex(
    { tokenHash: 1 },
    { unique: true, name: 'sessions_token_hash_unique' },
  );
}
export function sessionDto(session: Session) {
  return {
    id: session._id.toHexString(),
    label: session.label,
    createdAt: session.createdAt.toISOString(),
    lastPresenceAt: session.lastPresenceAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}
