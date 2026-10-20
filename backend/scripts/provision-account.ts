// Explicit offline provisioner. Run with tsx; feed one JSON object via stdin.
// Never pass credentials on argv or put them in a URL/source/log.
import { ObjectId } from 'mongodb';
import {
  accountsCollection,
  ensureAccountIndexes,
} from '../src/auth/account.model.js';
import { credentialsSchema } from '../src/auth/auth.schemas.js';
import { hashPassword } from '../src/auth/password.js';
import { connectDatabase } from '../src/shared/database/connect-database.js';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI required');
  let input = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    input += String(chunk);
    if (Buffer.byteLength(input) > 16_384) throw new Error('Input too large');
  }
  const credentials = credentialsSchema.parse(JSON.parse(input));
  const connection = await connectDatabase(uri);
  try {
    await ensureAccountIndexes(connection.db);
    const existing = await accountsCollection(connection.db).findOne(
      { username: credentials.username },
      { projection: { _id: 1 } },
    );
    if (existing) {
      console.error('El usuario ya existe; no se modificó la cuenta.');
      process.exitCode = 1;
      return;
    }
    // The unique index also rejects concurrent provisioning of the same username.
    const passwordHash = await hashPassword(credentials.password);
    credentials.password = '';
    const now = new Date();
    await accountsCollection(connection.db).insertOne({
      _id: new ObjectId(),
      username: credentials.username,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    console.log('Cuenta creada.');
  } finally {
    await connection.client.close();
  }
}
void main().catch(() => {
  console.error('No se pudo crear la cuenta.');
  process.exitCode = 1;
});
