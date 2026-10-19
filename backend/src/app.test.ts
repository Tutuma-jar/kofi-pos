import request from 'supertest';
import { expect, test } from 'vitest';
import { createApp } from './app.js';

test('Express responde sin exponer rutas de producto', async () => {
  const response = await request(createApp()).get('/api').expect(404);

  expect(response.headers['x-powered-by']).toBeUndefined();
});
