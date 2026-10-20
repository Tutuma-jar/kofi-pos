import { MongoClient, type Db } from 'mongodb';

export interface DatabaseConnection {
  client: MongoClient;
  db: Db;
}

// Las reglas aprobadas dependen de transacciones: un MongoDB standalone no basta.
export async function connectDatabase(
  uri: string,
  dbName?: string,
): Promise<DatabaseConnection> {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    const db = client.db(dbName);
    const hello = await db.admin().command({ hello: 1 });

    if (typeof hello.setName !== 'string') {
      throw new Error(
        'MongoDB debe ejecutarse como replica set para admitir transacciones.',
      );
    }

    return { client, db };
  } catch (error) {
    await client.close();
    throw error;
  }
}
