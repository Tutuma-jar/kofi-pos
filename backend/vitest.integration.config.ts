import { defineConfig } from 'vitest/config';

// Pruebas contra MongoDB real local (compose.yaml); no forman parte de `npm test`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    clearMocks: true,
    fileParallelism: false,
    env: {
      // Por defecto, el replica set de compose.yaml; cada prueba usa su propia base.
      MONGODB_URI:
        process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/?replicaSet=rs0',
    },
  },
});
