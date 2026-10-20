import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { createApp } from '../../app.js';

let distDir: string;

beforeAll(async () => {
  distDir = await mkdtemp(join(tmpdir(), 'kofi-dist-'));
  await mkdir(join(distDir, 'assets'));
  await writeFile(join(distDir, 'index.html'), '<!doctype html><p>Kofi</p>');
  await writeFile(join(distDir, 'assets', 'app-abc123.js'), 'console.log(1);');
  await writeFile(join(distDir, 'favicon.svg'), '<svg/>');
});

afterAll(async () => {
  await rm(distDir, { recursive: true, force: true });
});

const app = () => createApp({ frontendDir: distDir });

test('sirve index.html en la raíz y en rutas de la SPA', async () => {
  for (const path of ['/', '/menu', '/menu/productos']) {
    const response = await request(app()).get(path).expect(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.headers['cache-control']).toBe('no-cache');
    expect(response.text).toContain('Kofi');
  }
});

test('los assets con huella se cachean como inmutables', async () => {
  const response = await request(app())
    .get('/assets/app-abc123.js')
    .expect(200);
  expect(response.headers['cache-control']).toContain('immutable');
  const favicon = await request(app()).get('/favicon.svg').expect(200);
  expect(favicon.headers['cache-control']).toBe('no-cache');
});

test('/api nunca devuelve HTML de la SPA', async () => {
  for (const path of ['/api', '/api/', '/api/no-existe']) {
    const response = await request(app()).get(path).expect(404);
    expect(response.headers['content-type']).toContain('application/json');
  }
});

test('métodos distintos de GET/HEAD fuera de /api responden 404', async () => {
  await request(app()).post('/menu').expect(404);
});

test('sin frontendDir no se sirve la SPA', async () => {
  await request(createApp()).get('/').expect(404);
});

test('trustProxy usa la IP del cliente que informa el proxy', async () => {
  const probe = (trustProxy: number) =>
    createApp({ trustProxy }).get('trust proxy fn')('127.0.0.1', 0) as boolean;
  expect(probe(0)).toBe(false);
  expect(probe(1)).toBe(true);
});
