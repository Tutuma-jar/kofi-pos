import {
  closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync,
  readlinkSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const cacheDirectory = '.opencode/.cache/kofi-check';
const defaultContext = '.opencode/task.local.json';
const checkIds = ['syntax', 'json', 'links', 'self-test'];
const trackerPath = 'docs/progress/tracker.md';
const hash = (value) => createHash('sha256').update(value).digest('hex');
// Marcadores de plantilla sin rellenar. `TODO` distingue mayúsculas para no confundirlo con la palabra «todo».
const placeholder = /sustituir por|describe-the-approved|\[\.\.\.\]/i;
const todoMarker = /\bTODO\b/;
const normalize = (value) => value.replaceAll('\\', '/');

function meaningful(value) {
  return typeof value === 'string' && value.trim().length > 3 && !placeholder.test(value) && !todoMarker.test(value);
}

export function relativePath(value) {
  if (typeof value !== 'string' || !value || /[\x00-\x1f]/.test(value)) {
    throw new Error('Ruta relativa vacía o inválida.');
  }
  const normalized = normalize(value);
  if (path.posix.isAbsolute(normalized) || /^[A-Za-z]:/.test(normalized)
      || normalized.split('/').some((part) => part === '..' || part === '.')) {
    throw new Error(`Ruta fuera del proyecto: ${value}`);
  }
  return normalized;
}

function localPath(root, name) {
  const result = path.join(root, relativePath(name));
  let parent = result;
  while (!existsSync(parent)) parent = path.dirname(parent);
  const relative = path.relative(realpathSync(root), realpathSync(parent));
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`Enlace fuera del proyecto: ${name}`);
  }
  return result;
}

function git(root, args, { optional = false } = {}) {
  const result = spawnSync('git', args, {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 15_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0 && !optional) {
    throw new Error(`Git no pudo realizar ${args[0]}: ${(result.stderr || result.error?.message || '').trim().slice(0, 500)}`);
  }
  return result.status === 0 ? result.stdout : null;
}

function digestFile(root, name) {
  const target = localPath(root, name);
  if (!existsSync(target)) return 'missing';
  if (!lstatSync(target).isFile()) throw new Error(`No es un archivo regular: ${name}`);
  return hash(readFileSync(target));
}

function readLocal(root, name) {
  return readFileSync(localPath(root, name), 'utf8');
}

export function matches(file, pattern) {
  const expression = relativePath(pattern).split(/(\*\*|\*|\?)/).map((part) => {
    if (part === '**') return '.*';
    if (part === '*') return '[^/]*';
    if (part === '?') return '[^/]';
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  return new RegExp(`^${expression}$`, process.platform === 'win32' ? 'i' : '').test(normalize(file));
}

export function validateContext(context) {
  if (!context || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(context.taskKey || '')
      || placeholder.test(context.taskKey)) throw new Error('Falta taskKey local válido.');
  if (!['feature', 'fix', 'docs', 'maintenance'].includes(context.kind)) throw new Error('kind inválido.');
  if (!meaningful(context.approval)) throw new Error('Falta referencia real de aprobación del alcance.');
  if (typeof context.requiresSpec !== 'boolean') throw new Error('Definir requiresSpec explícitamente.');
  if (context.kind === 'feature' && !context.requiresSpec) throw new Error('Una funcionalidad relevante requiere especificación.');
  if (!context.requiresSpec && !meaningful(context.reason)) throw new Error('Justificar la exención de especificación.');
  if (context.requiresSpec && !context.spec) throw new Error('Falta especificación aprobada.');
  if (context.spec) relativePath(context.spec);
  if (context.taskId && !/^TASK-\d{3,}$/.test(context.taskId)) throw new Error('taskId inválido; no inventar IDs.');
  if (!Array.isArray(context.scope) || !context.scope.length) throw new Error('No se conoce el alcance: definir scope.');
  context.scope.forEach(relativePath);
  if (!Array.isArray(context.checks) || !context.checks.length
      || context.checks.some((id) => !checkIds.includes(id))) throw new Error('Falta selección de checks disponibles.');
  if (!Array.isArray(context.inputs) || !Array.isArray(context.manual) || !Array.isArray(context.related)) {
    throw new Error('inputs, manual y related deben ser listas.');
  }
  context.inputs.forEach(relativePath);
  if (context.manual.some((item) => !meaningful(item))) throw new Error('Comprobación manual inválida.');
  for (const item of context.related) {
    relativePath(item.path);
    if (!meaningful(item.reason)) throw new Error('Una ruta relacionada necesita justificación aprobada.');
  }
  if (!context.documentation || !Array.isArray(context.documentation.required)
      || !meaningful(context.documentation.reason)) throw new Error('Definir documentación esperada o justificar exención.');
  context.documentation.required.forEach(relativePath);
  return context;
}

function loadContext(root, name, optional = false) {
  if (optional && !existsSync(localPath(root, name))) return null;
  return validateContext(JSON.parse(readLocal(root, name)));
}

function section(text, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.match(new RegExp(`^## ${escaped}[^\\n]*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'mi'))?.[1]?.trim() || '';
}

export function requirements(root, context) {
  validateContext(context);
  if (!context.requiresSpec) return ['OK requisitos: exención justificada; comprobar aprobación con el responsable.'];
  const spec = readLocal(root, context.spec);
  const approval = section(spec, 'Aprobación');
  const criteria = section(spec, 'Criterios de aceptación');
  // Los pendientes técnicos registrados en la aprobación no equivalen a falta de aprobación.
  if (!meaningful(approval) || /pendiente de aprobaci|no aprobad|por aprobar/i.test(approval)
      || !/20\d{2}-\d{2}-\d{2}/.test(approval)) throw new Error('Especificación sin referencia de aprobación fechada.');
  if (!criteria.split('\n').some((line) => (/^\s*-\s+\S/.test(line) || /^\s*\|\s*CA-\d+\s*\|\s*\S/.test(line))
      && meaningful(line))) {
    throw new Error('Especificación sin criterios de aceptación verificables.');
  }
  // Frontend no recibe tareas (constitución §11): basta una especificación aprobada registrada en el tracker
  // y un alcance limitado a frontend/.
  if (!context.taskId && context.scope.every((item) => normalize(item).startsWith('frontend/'))) {
    const name = normalize(context.spec).split('/').pop();
    if (!readLocal(root, trackerPath).includes(`specs/${name}`)) throw new Error('La historia no está registrada en tracker.');
    return ['OK requisitos: interfaz de Frontend sin tareas; el principal debe contrastar aprobación, criterios y alcance.'];
  }
  const tasks = section(spec, 'Tareas técnicas asociadas');
  if (!/TASK-\d{3,}/.test(tasks)) throw new Error('Identificar tareas técnicas en la especificación.');
  if (!context.taskId || !tasks.includes(context.taskId)) throw new Error('Identificar taskId definido en la especificación.');
  if (!readLocal(root, trackerPath).includes(context.taskId)) throw new Error('La tarea no está registrada en tracker.');
  return ['OK requisitos: referencias presentes; el principal debe contrastar aprobación, criterios y alcance.'];
}

export function snapshot(root) {
  const entries = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).split('\0');
  const files = new Set();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) continue;
    files.add(normalize(entry.slice(3)));
    if (/[RC]/.test(entry.slice(0, 2))) files.add(normalize(entries[++index]));
  }
  const result = {};
  for (const file of [...files].sort()) {
    if (file.startsWith(`${cacheDirectory}/`) || file === defaultContext) continue;
    const target = path.join(root, relativePath(file));
    result[file] = existsSync(target) && lstatSync(target).isSymbolicLink()
      ? hash(readlinkSync(target)) : digestFile(root, file);
  }
  return result;
}

function changedSince(base, current) {
  return [...new Set([...Object.keys(base), ...Object.keys(current)])]
    .filter((name) => base[name] !== current[name]).sort();
}

function atomicJson(root, name, value) {
  const target = localPath(root, name);
  mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, null, 2));
  renameSync(temporary, target);
}

function statePath(context) {
  return `${cacheDirectory}/${context.taskKey}.json`;
}

export function start(root, context) {
  const messages = requirements(root, context);
  const name = statePath(context);
  if (existsSync(localPath(root, name))) {
    messages.push('REUTILIZADO inicio: se conserva la base original de esta clave.');
    return { code: 0, messages };
  }
  const base = snapshot(root);
  atomicJson(root, name, { version: 1, base, checks: {} });
  messages.push(`OK inicio: base de ${Object.keys(base).length} archivos previamente pendientes; no se atribuyen a esta tarea.`);
  return { code: 0, messages };
}

function linkTargets(root, files) {
  const targets = [];
  for (const file of files.filter((name) => name.endsWith('.md') && existsSync(localPath(root, name)))) {
    const text = readLocal(root, file).replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, '');
    for (const match of text.matchAll(/\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/g)) {
      const href = match[1];
      if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(href)) continue;
      const withoutAnchor = decodeURIComponent(href.split(/[?#]/)[0]);
      if (!withoutAnchor) continue;
      const target = relativePath(path.posix.normalize(path.posix.join(path.posix.dirname(file), withoutAnchor)));
      targets.push({ source: file, target, exists: existsSync(localPath(root, target)) });
    }
  }
  return targets;
}

function node(root, args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || result.error?.message || 'Node finalizó sin éxito').slice(-1800).trim());
  }
}

function selfTestInputs(root) {
  const inputs = ['.opencode/scripts/kofi-check.test.mjs', '.opencode/commands/kofi-verify.md',
    'AGENTS.md', '.opencode/README.md', 'docs/ai-context/documentation.md', 'docs/ai-context/architecture.md'];
  for (const directory of ['.opencode/agents', '.opencode/skills/react-best-practices', 'docs/specs']) {
    const target = localPath(root, directory);
    if (!existsSync(target)) continue;
    for (const name of readdirSync(target, { recursive: directory.includes('/skills/') })) {
      const relative = `${directory}/${normalize(name)}`;
      if (directory === 'docs/specs' && !/^us-.*\.md$/.test(name)) continue;
      const file = localPath(root, relative);
      if (lstatSync(file).isFile()) inputs.push(relative);
    }
  }
  return inputs;
}

function fingerprint(root, context, id, files, dependencies) {
  const affected = files.filter((file) => {
    if (id === 'syntax') return /\.(?:mjs|cjs|js)$/.test(file);
    if (id === 'json') return file.endsWith('.json');
    if (id === 'links') return file.endsWith('.md');
    return file.startsWith('.opencode/agents/') || file.startsWith('.opencode/scripts/');
  });
  const inputs = [...new Set([...affected, ...context.inputs, ...dependencies,
    ...(id === 'self-test' ? selfTestInputs(root) : [])])].sort();
  const environment = Object.fromEntries(['NODE_OPTIONS', 'NODE_PATH', 'TZ', 'LANG', 'LC_ALL', 'CI', 'PATH']
    .map((key) => [key, process.env[key] || '']));
  return hash(JSON.stringify({
    id, selection: context.checks, runtime: process.version, platform: process.platform, environment,
    runner: hash(readFileSync(scriptPath)),
    inputs: inputs.map((name) => [name, digestFile(root, name)]),
    targets: id === 'links' ? linkTargets(root, files) : [],
  }));
}

export function verify(root, context) {
  const messages = requirements(root, context);
  const name = statePath(context);
  if (!existsSync(localPath(root, name))) {
    return { code: 2, messages: [...messages, 'PENDIENTE: ejecutar start antes de atribuir cambios a la tarea.'] };
  }
  const state = JSON.parse(readLocal(root, name));
  const current = snapshot(root);
  const changed = changedSince(state.base, current);
  const related = context.related.map((item) => item.path);
  const unexpected = changed.filter((file) => ![...context.scope, ...related].some((pattern) => matches(file, pattern)));
  messages.push(unexpected.length
    ? `ADVERTENCIA alcance: ${unexpected.join(', ')}. Revisar relación y obtener autorización para ampliaciones importantes.`
    : 'OK alcance: no se detectan cambios nuevos fuera de las rutas declaradas.');
  for (const item of context.related.filter((item) => changed.some((file) => matches(file, item.path)))) {
    messages.push(`RELACIONADO: ${item.path}; ${item.reason}`);
  }
  const files = [...new Set([...changed, ...Object.keys(current)])]
    .filter((file) => [...context.scope, ...related].some((pattern) => matches(file, pattern))).sort();
  const dependencies = ['.opencode/opencode.jsonc', '.gitignore'];
  const lock = localPath(root, `${cacheDirectory}/${context.taskKey}.lock`);
  let descriptor;
  try {
    descriptor = openSync(lock, 'wx');
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    return { code: 2, messages: [...messages, 'PENDIENTE: ya hay una verificación de esta tarea; no se duplica.'] };
  }
  let code = 0;
  try {
    for (const id of [...new Set(context.checks)]) {
      try {
        const extra = id === 'self-test' ? ['.opencode/scripts/kofi-check.test.mjs'] : [];
        const digest = fingerprint(root, context, id, files, [...dependencies, ...extra]);
        if (state.checks[id]?.fingerprint === digest) {
          messages.push(`REUTILIZADO ${id}: ${digest.slice(0, 12)}; ejecución original ${state.checks[id].at}.`);
          continue;
        }
        let count = 0;
        if (id === 'syntax') {
          for (const file of files.filter((entry) => /\.(?:mjs|cjs|js)$/.test(entry))) {
            if (existsSync(localPath(root, file))) { node(root, ['--check', localPath(root, file)]); count += 1; }
          }
        } else if (id === 'json') {
          for (const file of files.filter((entry) => entry.endsWith('.json'))) {
            if (existsSync(localPath(root, file))) { JSON.parse(readLocal(root, file)); count += 1; }
          }
        } else if (id === 'links') {
          const targets = linkTargets(root, files);
          const missing = targets.filter((entry) => !entry.exists);
          if (missing.length) throw new Error(missing.map((entry) => `${entry.source} -> ${entry.target}`).join('\n'));
          count = targets.length;
        } else if (id === 'self-test') {
          node(root, ['--test', '.opencode/scripts/kofi-check.test.mjs']); count = 1;
        }
        state.checks[id] = { fingerprint: digest, at: new Date().toISOString(), count };
        messages.push(`OK ${id}: ${count} comprobaciones; fingerprint ${digest.slice(0, 12)}.`);
      } catch (error) {
        delete state.checks[id];
        code = 1;
        messages.push(`FALLO ${id}: ${error.message}`);
      }
    }
    if (files.some((file) => /^(frontend|backend)\//.test(file))) {
      if (!code) code = 2;
      messages.push('PENDIENTE aplicación: aún no hay comandos de pruebas aprobados; estos checks no verifican el POS.');
    }
    if (context.manual.length) {
      if (!code) code = 2;
      messages.push(`PENDIENTE fuera del control rápido: ${context.manual.join('; ')}.`);
    }
    const changedInputs = context.checks.some((id) => state.checks[id]
      && state.checks[id].fingerprint !== fingerprint(root, context, id, files,
        [...dependencies, ...(id === 'self-test' ? ['.opencode/scripts/kofi-check.test.mjs'] : [])]));
    if (changedInputs || JSON.stringify(current) !== JSON.stringify(snapshot(root))) {
      state.checks = {};
      if (!code) code = 2;
      messages.push('PENDIENTE: archivos cambiaron durante la verificación; resultados no reutilizables.');
    }
    atomicJson(root, name, state);
    return { code, messages };
  } finally {
    closeSync(descriptor);
    unlinkSync(lock);
  }
}

function stagedText(root, name) {
  relativePath(name);
  return git(root, ['show', `:${normalize(name)}`], { optional: true });
}

export function documentation(root, context = null) {
  if (context) validateContext(context);
  const files = git(root, ['diff', '--cached', '--no-ext-diff', '--no-textconv', '--name-only', '-z'])
    .split('\0').filter(Boolean).map(normalize);
  const messages = [];
  const errors = [];
  if (!files.length) return { code: 0, messages: ['OK documentación: índice sin cambios.'] };
  const applies = context && files.some((file) => [...context.scope, ...context.related.map((item) => item.path)]
    .some((pattern) => matches(file, pattern)));
  if (applies) {
    for (const required of context.documentation.required) {
      if (!files.includes(required) || !stagedText(root, required)?.trim()) {
        errors.push(`Falta documentación preparada: ${required}`);
      }
    }
  } else if (files.some((file) => /^(frontend\/|backend\/|\.opencode\/|\.githooks\/|docs\/ai-context\/)/.test(file))) {
    messages.push('ADVERTENCIA documentación: cambios técnicos sin contexto aplicable; revisar si requieren registro, sin exigirlo por cambios triviales.');
  }
  if (context?.taskId && !files.includes(trackerPath)) {
    messages.push(`AVISO tracker: actualizarlo si se confirma el cierre de ${context.taskId}; no se presume finalización.`);
  }
  const diff = git(root, ['diff', '--cached', '--no-ext-diff', '--no-textconv', '--unified=0', '--', trackerPath]);
  const completed = [...diff.matchAll(/^\+\s*-\s*\[x\]\s*((?:US|TASK)-\d{3,})\b.*$/gmi)].map((entry) => entry[1]);
  const tracker = stagedText(root, trackerPath) || '';
  for (const id of completed) {
    const lines = tracker.split('\n');
    const lineIndex = lines.findIndex((line) => new RegExp(`\\[x\\]\\s*${id}\\b`, 'i').test(line));
    const parent = lines.slice(0, lineIndex + 1).reverse().find((line) => /US-\d{3,}/.test(line) && /\]\(/.test(line));
    const href = parent?.match(/\]\(([^)]+)\)/)?.[1];
    const specPath = href ? relativePath(path.posix.normalize(path.posix.join('docs/progress', href.split('#')[0]))) : null;
    const spec = specPath ? stagedText(root, specPath) : null;
    if (!specPath || !spec) {
      errors.push(`${id}: falta especificación con registro/evidencia en el índice.`);
      continue;
    }
    const sources = [spec];
    for (const match of spec.matchAll(/\]\(([^)#]+\.md)(?:#[^)]*)?\)/g)) {
      const recordPath = relativePath(path.posix.normalize(path.posix.join(path.posix.dirname(specPath), match[1])));
      if (recordPath.startsWith('docs/progress/completed/')) sources.push(stagedText(root, recordPath) || '');
    }
    const records = sources.flatMap((source) => source.split(/(?=^##\s+)/m))
      .filter((part) => /registro de ejecución/i.test(part));
    let requiredIds = [id];
    if (id.startsWith('US-')) {
      const children = [];
      for (const line of lines.slice(lineIndex + 1)) {
        if (/^\s*-\s*\[.\]\s*US-\d{3,}/i.test(line)) break;
        const child = line.match(/^\s*-\s*\[(.)\]\s*(TASK-\d{3,})/i);
        if (child) children.push({ done: child[1].toLowerCase() === 'x', id: child[2] });
      }
      if (!children.length || children.some((child) => !child.done)) {
        errors.push(`${id}: historia cerrada sin todas sus tareas completadas en tracker.`);
      }
      requiredIds = children.length ? children.map((child) => child.id) : [id];
    }
    for (const requiredId of requiredIds) {
      if (!records.filter((record) => record.includes(requiredId)).some((record) => record.split('\n').some((line) =>
        /Verificaciones ejecutadas y resultados\s*:/i.test(line)
        && meaningful(line.split(/resultados\s*:/i)[1]) && !/pendiente|no ejecutad/i.test(line)))) {
        errors.push(`${id}: falta registro de ${requiredId} con verificaciones y resultados concretos; revisar DoD.`);
      }
    }
  }
  return {
    code: errors.length ? 1 : 0,
    messages: [...messages, ...errors.map((error) => `FALLO documentación: ${error}`),
      ...(errors.length ? [] : ['OK documentación: controles del índice superados; no certifican veracidad ni DoD.'])],
  };
}

export function run(root, args) {
  const [command, ...options] = args;
  if (!['start', 'verify', 'docs'].includes(command)
      || (options.length && (options.length !== 2 || options[0] !== '--context'))) {
    throw new Error('Uso: node .opencode/scripts/kofi-check.mjs start|verify|docs [--context ruta.json]');
  }
  const contextPath = options[1] || defaultContext;
  const context = loadContext(root, contextPath, command === 'docs');
  if (command === 'docs') return documentation(root, context);
  if (command === 'start') return start(root, context);
  return verify(root, context);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    const root = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
    const result = run(root, process.argv.slice(2));
    console.log(result.messages.join('\n'));
    process.exitCode = result.code;
  } catch (error) {
    console.error(`PENDIENTE: ${error.message}`);
    process.exitCode = 2;
  }
}
