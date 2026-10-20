import type { Collection, Db, ObjectId } from 'mongodb';

// External provisioners must use the canonical hash produced by password.ts.
export interface Account {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export function accountsCollection(db: Db): Collection<Account> {
  return db.collection<Account>('accounts');
}

// Explicit setup only: neither service construction nor authentication writes data.
export async function ensureAccountIndexes(db: Db): Promise<void> {
  await accountsCollection(db).createIndex(
    { username: 1 },
    {
      unique: true,
      name: 'accounts_username_unique',
      collation: { locale: 'simple' },
    },
  );
}
