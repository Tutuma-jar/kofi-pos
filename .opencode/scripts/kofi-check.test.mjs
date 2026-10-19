import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { documentation, matches, relativePath, requirements, run, start, validateContext, verify } from './kofi-check.mjs';

const project = fileURLToPath(new URL('../../', import.meta.url));
const runner = fileURLToPath(new URL('./kofi-check.mjs', import.meta.url));

function git(root, ...args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10_000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout;
}

function write(root, name, text) {
  const target = path.join(root, name);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, text);
}

function fixture(t) {
  const base = path.join(os.tmpdir(), 'opencode');
  mkdirSync(base, { recursive: true });
  const root = mkdtempSync(path.join(base, 'kofi-controls-'));
  // Solo se elimina el directorio temporal creado por este test, nunca el repositorio.
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '--quiet');
  git(root, 'config', 'core.autocrlf', 'false');
  write(root, '.gitignore', '.opencode/.cache/\n.opencode/task.local.json\n');
  return root;
}

function context(overrides = {}) {
  return {
    taskKey: 'safe-fixture', kind: 'maintenance', approval: 'Fixture autorizada de configuración 2026-10-18',
    requiresSpec: false, reason: 'Mantenimiento aislado, sin funcionalidad del POS.',
    spec: null, taskId: null, scope: ['docs/**'], related: [], checks: ['links'], inputs: [], manual: [],
    documentation: { required: [], reason: 'El cambio documental no exige otro registro en esta fixture.' },
    ...overrides,
  };
}

const spec = `# US-001 — Fixture
## Criterios de aceptación
- El valor inválido muestra un error observable.
## Aprobación
Responsable: fixture explícita del 2026-10-18, no aprobación real de producto.
## Tareas técnicas asociadas
### TASK-001 — Validación
- Historia relacionada: US-001
`;
const closedTracker = '- [x] US-001 — Fixture — Completado — [Especificación](../specs/us-001-fixture.md)\n  - [x] TASK-001 — Validación — Completado\n';
const evidence = '\n## TASK-001 — Validación: registro de ejecución\n- Verificaciones ejecutadas y resultados: node fixture-test.mjs; criterio 1; herramienta local; pasó; revisión fixture-123.\n';

test('contexto obligatorio, rutas seguras y comandos de checks cerrados', () => {
  assert.throws(() => validateContext(context({ scope: [] })), /alcance/);
  assert.throws(() => validateContext(context({ kind: 'feature' })), /especificación/);
  assert.throws(() => validateContext(context({ reason: 'Sustituir por un motivo' })), /exención/);
  assert.throws(() => validateContext(context({ checks: ['node arbitrary.js'] })), /checks/);
  for (const name of ['../escape', 'C:\\escape', '/escape', '\\\\server\\share', 'x/../escape']) {
    assert.throws(() => relativePath(name));
  }
  assert.equal(matches('docs/specs/file.md', 'docs/**'), true);
  assert.equal(matches('docs/specs/file.md', 'docs/*.md'), false);
  assert.equal(matches('docs/file.md', 'docs/*.md'), true);
});

test('mantenimiento justificado no exige historia; feature requiere criterios, aprobación y tareas', (t) => {
  const root = fixture(t);
  assert.match(requirements(root, context())[0], /exención/);
  const feature = context({ kind: 'feature', requiresSpec: true, spec: 'docs/specs/us-001-fixture.md', taskId: 'TASK-001' });
  write(root, feature.spec, spec);
  write(root, 'docs/progress/tracker.md', '- [ ] US-001\n  - [ ] TASK-001\n');
  assert.match(requirements(root, feature)[0], /referencias presentes/);
  write(root, feature.spec, spec.replace('- El valor inválido muestra un error observable.', '- [...]'));
  assert.throws(() => requirements(root, feature), /criterios/);
  write(root, feature.spec, spec.replace('Responsable: fixture explícita del 2026-10-18, no aprobación real de producto.', 'Pendiente de aprobación.'));
  assert.throws(() => requirements(root, feature), /aprobación/);
  write(root, feature.spec, spec.replace('TASK-001', 'Tarea pendiente'));
  assert.throws(() => requirements(root, feature), /tareas técnicas/);
  write(root, feature.spec, spec);
  write(root, 'docs/progress/tracker.md', 'Sin tareas registradas.');
  assert.throws(() => requirements(root, feature), /tracker/);
});

test('no presume finalización sin inicio ni ejecuta selección ausente', (t) => {
  const root = fixture(t);
  assert.equal(verify(root, context()).code, 2);
  assert.throws(() => run(root, ['verify']), /ENOENT/);
  assert.throws(() => run(root, ['verify', ';', 'arbitrary']), /Uso/);
});

test('base preservada con Git sin HEAD y trabajo previo no seguido', (t) => {
  const root = fixture(t);
  write(root, 'outside.txt', 'trabajo previo');
  const plan = context();
  start(root, plan);
  assert.doesNotMatch(verify(root, plan).messages.join('\n'), /ADVERTENCIA alcance/);
  write(root, 'outside.txt', 'trabajo previo modificado');
  assert.match(start(root, plan).messages.join('\n'), /conserva la base/);
  assert.match(verify(root, plan).messages.join('\n'), /ADVERTENCIA alcance: outside.txt/);
});

test('rutas relacionadas justificadas no se bloquean; desconocidas advierten', (t) => {
  const root = fixture(t);
  const plan = context({ related: [{ path: 'related.txt', reason: 'Referencia necesaria autorizada en la fixture.' }] });
  start(root, plan);
  write(root, 'related.txt', 'relación');
  write(root, 'unexpected.txt', 'otra tarea');
  const result = verify(root, plan);
  assert.equal(result.code, 0);
  assert.match(result.messages.join('\n'), /RELACIONADO: related.txt/);
  assert.match(result.messages.join('\n'), /ADVERTENCIA alcance: unexpected.txt/);
});

test('JSON y sintaxis: éxitos reutilizados, entradas invalidan y fallos no se cachean', (t) => {
  const root = fixture(t);
  const plan = context({ scope: ['data.json', 'code.mjs'], checks: ['json', 'syntax'], inputs: ['dependency.txt'] });
  write(root, 'data.json', '{}');
  write(root, 'code.mjs', 'export const value = 1;');
  write(root, 'dependency.txt', 'v1');
  start(root, plan);
  const first = verify(root, plan);
  assert.equal(first.code, 0);
  assert.match(first.messages.join('\n'), /OK syntax: 1/);
  assert.match(verify(root, plan).messages.join('\n'), /REUTILIZADO json/);
  write(root, 'dependency.txt', 'v2');
  assert.doesNotMatch(verify(root, plan).messages.join('\n'), /REUTILIZADO/);
  write(root, 'data.json', '{broken');
  assert.equal(verify(root, plan).code, 1);
  assert.match(verify(root, plan).messages.join('\n'), /FALLO json/);
  write(root, 'data.json', '{}');
  write(root, 'code.mjs', 'export const = ;');
  assert.match(verify(root, plan).messages.join('\n'), /FALLO syntax/);
});

test('links invalida resultado al desaparecer el destino y omite código/URLs/anchors', (t) => {
  const root = fixture(t);
  write(root, 'docs/page.md', '[local](target.txt) [web](https://example.com) [anchor](#section)\n```md\n[example](not-real.md)\n```\n');
  write(root, 'docs/target.txt', 'referencia');
  start(root, context());
  assert.equal(verify(root, context()).code, 0);
  assert.match(verify(root, context()).messages.join('\n'), /REUTILIZADO links/);
  rmSync(path.join(root, 'docs/target.txt'));
  assert.match(verify(root, context()).messages.join('\n'), /FALLO links/);
});

test('cambio solo documental no invalida sintaxis y sí vuelve a comprobar sus enlaces', (t) => {
  const root = fixture(t);
  const plan = context({ scope: ['docs/**', 'code.mjs'], checks: ['links', 'syntax'] });
  write(root, 'code.mjs', 'export const value = 1;');
  write(root, 'docs/page.md', '# Primera revisión\n');
  start(root, plan);
  assert.equal(verify(root, plan).code, 0);
  write(root, 'docs/page.md', '# Segunda revisión\n');
  const result = verify(root, plan);
  assert.match(result.messages.join('\n'), /REUTILIZADO syntax/);
  assert.match(result.messages.join('\n'), /OK links/);
});

test('verificaciones manuales y aplicación sin comandos quedan pendientes, no exitosas', (t) => {
  const root = fixture(t);
  const manualPlan = context({ manual: ['Comprobar navegación de teclado en interfaz autorizada.'] });
  start(root, manualPlan);
  assert.equal(verify(root, manualPlan).code, 2);
  write(root, 'backend/example.js', 'export const example = 1;');
  const appPlan = context({ taskKey: 'app-fixture', scope: ['backend/**'], checks: ['syntax'] });
  start(root, appPlan);
  const result = verify(root, appPlan);
  assert.equal(result.code, 2);
  assert.match(result.messages.join('\n'), /PENDIENTE aplicación/);
});

test('bloqueo de ejecución duplicada no repite verificaciones', (t) => {
  const root = fixture(t);
  start(root, context());
  write(root, '.opencode/.cache/kofi-check/safe-fixture.lock', 'fixture');
  const result = verify(root, context());
  assert.equal(result.code, 2);
  assert.match(result.messages.join('\n'), /no se duplica/);
});

test('documentación: índice vacío y cambio trivial pasan sin exigir historia o changelog', (t) => {
  const root = fixture(t);
  assert.equal(documentation(root).code, 0);
  write(root, 'readme.md', '# Ajuste editorial\n');
  git(root, 'add', '--', 'readme.md');
  const before = git(root, 'ls-files', '--stage');
  assert.equal(documentation(root).code, 0);
  assert.equal(git(root, 'ls-files', '--stage'), before);
});

test('documentación técnica sin contexto advierte, sin bloqueo semántico ciego', (t) => {
  const root = fixture(t);
  write(root, '.opencode/commands/example.md', 'Cambio relevante o trivial por revisar.');
  git(root, 'add', '--', '.opencode/commands/example.md');
  const result = documentation(root);
  assert.equal(result.code, 0);
  assert.match(result.messages.join('\n'), /ADVERTENCIA documentación/);
});

test('documentación obligatoria fuera del índice no satisface el pre-commit', (t) => {
  const root = fixture(t);
  write(root, 'code.mjs', 'export const example = 1;');
  write(root, 'docs/change.md', 'Cambio y verificación reales de la fixture.');
  const plan = context({ scope: ['code.mjs'], documentation: { required: ['docs/change.md'], reason: 'Registrar el comportamiento cambiado.' } });
  git(root, 'add', '--', 'code.mjs');
  assert.equal(documentation(root, plan).code, 1);
  git(root, 'add', '--', 'docs/change.md');
  assert.equal(documentation(root, plan).code, 0);
  write(root, 'docs/change.md', '');
  assert.equal(documentation(root, plan).code, 0, 'Se usa el contenido preparado, no el vaciado de working tree.');
});

test('cierres de tracker exigen registros concretos preparados, no placeholders', (t) => {
  const root = fixture(t);
  write(root, 'docs/progress/tracker.md', closedTracker);
  git(root, 'add', '--', 'docs/progress/tracker.md');
  assert.equal(documentation(root).code, 1);
  write(root, 'docs/specs/us-001-fixture.md', spec + evidence.replace('node fixture-test.mjs; criterio 1; herramienta local; pasó; revisión fixture-123.', '[...]'));
  git(root, 'add', '--', 'docs/specs/us-001-fixture.md');
  assert.equal(documentation(root).code, 1);
  write(root, 'docs/specs/us-001-fixture.md', spec + evidence);
  assert.equal(documentation(root).code, 1, 'La evidencia no preparada todavía no cuenta.');
  git(root, 'add', '--', 'docs/specs/us-001-fixture.md');
  assert.equal(documentation(root).code, 0);
});

test('índice alternativo respetado sin modificar índice normal ni crear commits', (t) => {
  const root = fixture(t);
  write(root, '.opencode/commands/example.md', 'Fixture técnica.');
  git(root, 'add', '--', '.opencode/commands/example.md');
  const before = git(root, 'ls-files', '--stage');
  const previous = process.env.GIT_INDEX_FILE;
  try {
    process.env.GIT_INDEX_FILE = path.join(root, '.git', 'fixture-index');
    git(root, 'read-tree', '--empty');
    assert.match(documentation(root).messages.join('\n'), /índice sin cambios/);
  } finally {
    if (previous === undefined) delete process.env.GIT_INDEX_FILE;
    else process.env.GIT_INDEX_FILE = previous;
  }
  assert.equal(git(root, 'ls-files', '--stage'), before);
  assert.equal(existsSync(path.join(root, '.git', 'refs', 'heads', 'master')), false);
});

test('registros separados enlazados desde la especificación cuentan solo desde el índice', (t) => {
  const root = fixture(t);
  write(root, 'docs/progress/tracker.md', closedTracker);
  write(root, 'docs/specs/us-001-fixture.md', spec + '\n[Registro](../progress/completed/task-001-fixture.md)\n');
  write(root, 'docs/progress/completed/task-001-fixture.md', evidence);
  git(root, 'add', '--', 'docs/progress/tracker.md', 'docs/specs/us-001-fixture.md');
  assert.equal(documentation(root).code, 1);
  git(root, 'add', '--', 'docs/progress/completed/task-001-fixture.md');
  assert.equal(documentation(root).code, 0);
});

test('historia no puede cerrarse con tarea pendiente en tracker', (t) => {
  const root = fixture(t);
  write(root, 'docs/progress/tracker.md', closedTracker.replace('[x] TASK', '[ ] TASK'));
  write(root, 'docs/specs/us-001-fixture.md', spec + evidence);
  git(root, 'add', '--', 'docs/progress/tracker.md', 'docs/specs/us-001-fixture.md');
  const result = documentation(root);
  assert.equal(result.code, 1);
  assert.match(result.messages.join('\n'), /todas sus tareas/);
});

test('Git ejecuta el pre-commit real: acepta índice vacío y rechaza omisión declarada sin commit', (t) => {
  const root = fixture(t);
  write(root, '.opencode/scripts/kofi-check.mjs', readFileSync(runner, 'utf8'));
  const hook = readFileSync(path.join(project, '.githooks/pre-commit'), 'utf8');
  write(root, '.githooks/pre-commit', hook);
  chmodSync(path.join(root, '.githooks/pre-commit'), 0o755);
  git(root, 'config', 'core.hooksPath', '.githooks');
  const empty = spawnSync('git', ['hook', 'run', 'pre-commit'], { cwd: root, encoding: 'utf8', timeout: 10_000 });
  assert.equal(empty.status, 0);
  assert.match(empty.stdout + empty.stderr, /índice sin cambios/);
  write(root, '.opencode/task.local.json', JSON.stringify(context({ scope: ['code.mjs'], documentation: { required: ['docs/missing.md'], reason: 'Registro declarado por la fixture.' } })));
  write(root, 'code.mjs', 'export const value = 1;');
  git(root, 'add', '--', 'code.mjs');
  const result = spawnSync('git', ['hook', 'run', 'pre-commit'], { cwd: root, encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 1);
  assert.match(result.stdout + result.stderr, /Falta documentación preparada/);
});

test('CLI retorna 0/1/2 de manera segura, sin shell interpolada', (t) => {
  const root = fixture(t);
  function cli(...args) {
    return spawnSync(process.execPath, [runner, ...args], { cwd: root, encoding: 'utf8', timeout: 10_000 });
  }
  assert.equal(cli('docs').status, 0);
  assert.equal(cli('verify').status, 2);
  write(root, '.opencode/task.local.json', JSON.stringify(context({ scope: ['code.mjs'], documentation: { required: ['docs/missing.md'], reason: 'Registro exigido por esta fixture.' } })));
  write(root, 'code.mjs', 'export const value = 1;');
  git(root, 'add', '--', 'code.mjs');
  assert.equal(cli('docs').status, 1);
  assert.equal(cli('verify', '; arbitrary').status, 2);
});

test('seis perfiles sin modelo fijo, delegación ni herramientas amplias', () => {
  const root = project;
  const agents = readdirSync(path.join(root, '.opencode/agents')).filter((name) => name.endsWith('.md')).sort();
  assert.deepEqual(agents, ['architect.md', 'backend.md', 'database.md', 'documenter.md', 'frontend.md', 'requirements-analyst.md']);
  for (const name of agents) {
    const text = readFileSync(path.join(root, '.opencode/agents', name), 'utf8');
    const frontmatter = text.split('---')[1];
    assert.match(frontmatter, /mode: subagent/);
    assert.match(frontmatter, /action: "\*", resource: "\*", effect: deny/);
    assert.doesNotMatch(frontmatter, /^model:/m);
    assert.doesNotMatch(frontmatter, /action: subagent.*effect: allow/);
    assert.doesNotMatch(frontmatter, /action: shell, resource: "(?:\*|node \*|git \*)".*effect: allow/);
  }
});

test('testing retirado y Frontend con las tres skills pertinentes, sin permisos extra de ejecución', () => {
  assert.equal(existsSync(path.join(project, '.opencode/skills/testing/SKILL.md')), false);
  for (const name of readdirSync(path.join(project, '.opencode/agents'))) {
    const text = readFileSync(path.join(project, '.opencode/agents', name), 'utf8');
    assert.doesNotMatch(text.split('---')[1], /action: skill, resource: testing/);
  }
  const frontend = readFileSync(path.join(project, '.opencode/agents/frontend.md'), 'utf8');
  for (const id of ['impeccable', 'emil-design-eng', 'react-best-practices']) {
    assert.ok(frontend.includes(`action: skill, resource: ${id}, effect: allow`));
  }
  assert.match(frontend, /Impeccable → Emil → react-best-practices/);
  assert.match(frontend, /En prototipos HTML sin React ese último paso no aplica/);
  const command = readFileSync(path.join(project, '.opencode/commands/kofi-verify.md'), 'utf8');
  assert.doesNotMatch(command, /Carga la skill testing/);
  assert.match(command, /principal determina las comprobaciones/);
});

test('React Best Practices conserva los 48 originales verificados y declara su adaptación/licencia real', () => {
  const base = path.join(project, '.opencode/skills/react-best-practices');
  const manifest = JSON.parse(readFileSync(path.join(base, 'UPSTREAM.json'), 'utf8'));
  const names = readdirSync(base, { recursive: true }).filter((name) =>
    name === 'SKILL.md' || name === 'LICENSE-SOURCE.md' || name.replaceAll('\\', '/').startsWith('references/'));
  const verified = [];
  for (const name of names) {
    const target = path.join(base, name);
    if (!name.endsWith('.md')) continue;
    let bytes = readFileSync(target);
    if (name === 'SKILL.md') {
      const text = bytes.toString('utf8');
      assert.match(text, /No adoptar Next\.js/);
      assert.match(text, /no ejecuta ni sustituye pruebas/);
      bytes = Buffer.from(text.replace(/\n<!-- KOFI-ADAPTATION-START -->[\s\S]*?<!-- KOFI-ADAPTATION-END -->\n/, ''), 'utf8');
    }
    const blob = createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
    if (name === 'SKILL.md') assert.equal(blob, manifest.originalSkillBlob);
    if (name === 'LICENSE-SOURCE.md') assert.equal(blob, manifest.licenseSourceBlob);
    verified.push({ path: name.replaceAll('\\', '/'), blob, size: bytes.length });
  }
  verified.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  assert.equal(verified.length, manifest.originalFiles);
  assert.equal(verified.reduce((sum, file) => sum + file.size, 0), manifest.originalBytes);
  assert.equal(createHash('sha256').update(JSON.stringify(verified)).digest('hex'), manifest.originalTreeFingerprint);
  assert.equal(manifest.licenseFilePresentUpstream, false);
  assert.match(readFileSync(path.join(base, 'LICENSE-SOURCE.md'), 'utf8'), /## License\s+MIT/);
});

test('especificaciones sin dependencia operativa de la skill eliminada', () => {
  const specs = path.join(project, 'docs/specs');
  for (const name of readdirSync(specs).filter((file) => /^us-.*\.md$/.test(file))) {
    const text = readFileSync(path.join(specs, name), 'utf8');
    assert.doesNotMatch(text, /con la skill `testing`|concretarán con la skill `testing`/);
  }
  for (const name of ['AGENTS.md', '.opencode/README.md', 'docs/ai-context/documentation.md', 'docs/ai-context/architecture.md']) {
    const text = readFileSync(path.join(project, name), 'utf8');
    assert.doesNotMatch(text, /skills\/testing\/SKILL\.md/);
  }
});

test('self-test invalida caché ante recursos reales aunque estén fuera del scope de la tarea', (t) => {
  const root = fixture(t);
  const plan = context({ checks: ['self-test'] });
  write(root, '.opencode/scripts/kofi-check.test.mjs', "import test from 'node:test'; test('fixture', () => {});\n");
  write(root, '.opencode/skills/react-best-practices/SKILL.md', '# Fixture válida v1\n');
  start(root, plan);
  assert.equal(verify(root, plan).code, 0);
  assert.match(verify(root, plan).messages.join('\n'), /REUTILIZADO self-test/);
  write(root, '.opencode/skills/react-best-practices/SKILL.md', '# Fixture válida v2\n');
  const result = verify(root, plan);
  assert.equal(result.code, 0);
  assert.match(result.messages.join('\n'), /OK self-test/);
  assert.doesNotMatch(result.messages.join('\n'), /REUTILIZADO self-test/);
});
