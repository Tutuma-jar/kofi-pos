import { createApp } from './app.js';
import { ensureAccountIndexes } from './auth/account.model.js';
import { ensureSessionIndexes } from './auth/session.model.js';
import { ensureCategoryIndexes } from './categories/categories.model.js';
import { createImageStore } from './products/image-store.js';
import { ensureProductIndexes } from './products/products.model.js';
import { createProductsService } from './products/products.service.js';
import { parseEnv } from './shared/config/env.js';
import { connectDatabase } from './shared/database/connect-database.js';

const env = parseEnv(process.env);
const productImages = createImageStore(env.PRODUCT_IMAGES_DIR);

let database;
try {
  database = await connectDatabase(env.MONGODB_URI);
  await ensureAccountIndexes(database.db);
  await ensureSessionIndexes(database.db);
  await ensureCategoryIndexes(database.db);
  await ensureProductIndexes(database.db);
  await productImages.prepare();
} catch (error) {
  if (database) await database.client.close();
  console.error(
    'No se pudo conectar con MongoDB:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}

const { client } = database;

// Startup cleanup of orphan images (>24 h); a failure does not stop the server.
try {
  await createProductsService(database.db, productImages).cleanupOrphanImages({
    scanFiles: true,
  });
} catch (error) {
  console.error(
    'No se pudieron limpiar imágenes huérfanas:',
    error instanceof Error ? error.message : error,
  );
}

// Temporary explicit demo injection, until Gestión de ventas supplies DashboardSource.
const app = createApp({
  db: database.db,
  dashboardDemo: true,
  productImages,
  trustProxy: env.TRUST_PROXY,
  frontendDir: env.FRONTEND_DIST_DIR,
});
const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`Kofi: Express en http://${env.HOST}:${env.PORT}`);
});

server.on('error', (error) => {
  console.error('No se pudo iniciar Express:', error.message);
  process.exitCode = 1;
  void client.close();
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.locals.dashboardEvents.close();
    server.close(() => {
      void client.close();
    });
  });
}
