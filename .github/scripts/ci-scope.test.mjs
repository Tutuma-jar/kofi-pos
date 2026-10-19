import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { determineScope, selectChecks } from './ci-scope.mjs';

const base = 'a'.repeat(40);
const full = { application: true, format: true };

test('documentación pura no instala dependencias ni selecciona pruebas/build', () => {
  assert.deepEqual(selectChecks(['docs/specs/us-001.md', 'AGENTS.md', 'PRODUCT.md', 'DESIGN.md']),
    { application: false, format: false });
  assert.deepEqual(selectChecks([]), { application: false, format: false });
});

test('README raíz solo selecciona su formato', () => {
  assert.deepEqual(selectChecks(['README.md']), { application: false, format: true });
});

test('código, dependencias, configuración y archivos desconocidos seleccionan la base completa', () => {
  for (const file of ['frontend/src/App.tsx', 'backend/src/app.ts', 'frontend/package.json',
    'package.json', 'package-lock.json', '.node-version', '.npmrc', 'eslint.config.mjs',
    '.prettierrc.json', '.prettierignore', '.github/workflows/ci.yml', '.github/scripts/ci-scope.mjs',
    '.github/README.md', 'future-config.toml', 'frontend/README.md', 'backend/docs/notes.md',
    'frontend/src/fixtures/content.md']) {
    assert.deepEqual(selectChecks([file]), full, file);
  }
});

test('cambios mixtos y ambos destinos de renombrados no ocultan código', () => {
  assert.deepEqual(selectChecks(['docs/note.md', 'frontend/src/old.ts', 'docs/old.ts']), full);
  assert.deepEqual(selectChecks(['README.md', 'backend/src/deleted.ts']), full);
});

test('PR compara la base validada con el checkout actual, sin usar títulos, nombres o cabeceras como shell', () => {
  let compared;
  const scope = determineScope('pull_request', { pull_request: { base: { sha: base }, title: '$(arbitrary)' } }, (sha) => {
    compared = sha;
    return ['docs/story.md'];
  });
  assert.equal(compared, base);
  assert.equal(scope.application, false);
});

test('push usa before; primer push, datos desconocidos y errores de diff verifican todo', () => {
  const scope = determineScope('push', { before: base }, (sha) => {
    assert.equal(sha, base);
    return ['README.md'];
  });
  assert.equal(scope.application, false);
  assert.equal(scope.format, true);
  for (const event of [{}, { before: '0'.repeat(40) }, { before: 'HEAD; arbitrary' }]) {
    assert.equal(determineScope('push', event, () => { throw new Error('No debe llamarse'); }).application, true);
  }
  assert.equal(determineScope('push', { before: base }, () => { throw new Error('Sin objetos Git'); }).application, true);
  assert.equal(determineScope('unknown', {}).application, true);
});

test('ejecución manual fuerza verificaciones aun con solo documentación', () => {
  assert.equal(determineScope('workflow_dispatch', {}, () => ['docs/story.md']).application, true);
});

test('CLI comunica selección y resumen mediante archivos de GitHub sin ejecutar comandos de aplicación', (t) => {
  const temporary = path.join(os.tmpdir(), 'opencode');
  mkdirSync(temporary, { recursive: true });
  const directory = mkdtempSync(path.join(temporary, 'kofi-ci-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const eventPath = path.join(directory, 'event.json');
  const outputPath = path.join(directory, 'output');
  const summaryPath = path.join(directory, 'summary');
  writeFileSync(eventPath, '{}');
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./ci-scope.mjs', import.meta.url))], {
    encoding: 'utf8', timeout: 10_000,
    env: { ...process.env, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_EVENT_PATH: eventPath,
      GITHUB_OUTPUT: outputPath, GITHUB_STEP_SUMMARY: summaryPath },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(outputPath, 'utf8'), 'application=true\nformat=true\n');
  assert.match(readFileSync(summaryPath, 'utf8'), /no acredita resultados/);
});

test('workflow con check estable, mínimos permisos y pasos condicionados, sin despliegues o filtros que dejen pending', () => {
  const yaml = readFileSync(new URL('../workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(yaml, /name: technical-checks/);
  assert.match(yaml, /contents: read/);
  assert.match(yaml, /persist-credentials: false/);
  assert.match(yaml, /cancel-in-progress: true/);
  assert.doesNotMatch(yaml, /pull_request_target|paths-ignore:|\n\s+paths:|continue-on-error|secrets\./);
  for (const action of ['checkout', 'setup-node']) {
    assert.match(yaml, new RegExp(`uses: actions/${action}@[a-f0-9]{40}`));
  }
  for (const command of ['npm run typecheck', 'npm run lint', 'npm run format:check', 'npm test', 'npm run build']) {
    assert.ok(yaml.includes(`run: ${command}`));
  }
  assert.match(yaml, /npm ci --ignore-scripts --no-audit --no-fund/);
  assert.ok(yaml.includes('[[ "$(npm --version)" == "$npm_version" ]]'));
  assert.match(yaml, /if: steps\.scope\.outputs\.application == 'true'\n\s+run: npm run build/);
});
