import { createApp } from './app.js';
import { parseEnv } from './shared/config/env.js';
import { connectDatabase } from './shared/database/connect-database.js';

const env = parseEnv(process.env);

let database;
try {
  database = await connectDatabase(env.MONGODB_URI);
} catch (error) {
  console.error(
    'No se pudo conectar con MongoDB:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}

const { client } = database;

const server = createApp().listen(env.PORT, '127.0.0.1', () => {
  console.log(`Kofi: Express técnico en http://127.0.0.1:${env.PORT}`);
});

server.on('error', (error) => {
  console.error('No se pudo iniciar Express:', error.message);
  process.exitCode = 1;
  void client.close();
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => {
      void client.close();
    });
  });
}
