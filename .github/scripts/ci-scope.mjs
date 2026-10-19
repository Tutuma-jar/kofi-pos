import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Solo se omiten cambios conocidos como documentales. Lo desconocido verifica la base.
export function selectChecks(files) {
  let application = false;
  let format = false;
  for (const file of files) {
    if (file.startsWith('.github/')) {
      application = true;
    } else if (file === 'README.md') {
      format = true; // Este documento forma parte del comando format:check existente.
    } else if (/^(frontend|backend)\//.test(file) || (!file.startsWith('docs/') && !file.endsWith('.md'))) {
      application = true;
    }
  }
  return { application, format: application || format };
}

function readDiff(base) {
  const result = spawnSync('git', ['diff', '--no-ext-diff', '--no-textconv', '--name-only',
    '--no-renames', '-z', base, 'HEAD', '--'], {
    encoding: 'utf8', timeout: 15_000, maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error('Comparación Git no disponible.');
  // --no-renames incluye ambos destinos: mover código a docs no puede ocultarlo.
  return result.stdout.split('\0').filter(Boolean);
}

export function determineScope(eventName, event, diff = readDiff) {
  const full = (reason) => ({ application: true, format: true, reason });
  if (eventName === 'workflow_dispatch') return full('Ejecución manual completa.');
  const base = eventName === 'pull_request' ? event.pull_request?.base?.sha
    : eventName === 'push' ? event.before : null;
  if (typeof base !== 'string' || !/^[a-f\d]{40,64}$/i.test(base) || /^0+$/.test(base)) {
    return full('Primer push o base no determinable: verificación completa.');
  }
  try {
    const scope = selectChecks(diff(base));
    return { ...scope, reason: scope.application ? 'Cambios de aplicación/configuración.'
      : scope.format ? 'Solo documentación incluida en format:check; sin build ni pruebas del POS.'
        : 'Sin cambios técnicos aplicables; sin instalación, build o pruebas del POS.' };
  } catch {
    return full('Diff no disponible: verificación completa conservadora.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const scope = determineScope(process.env.GITHUB_EVENT_NAME, event);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT,
      `application=${scope.application}\nformat=${scope.format}\n`);
  }
  console.log(scope.reason);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `### Verificación técnica\n${scope.reason}\n\n` +
      `- Tipos, lint, pruebas y build: ${scope.application ? 'seleccionados' : 'no aplican a estos cambios'}.\n` +
      `- Formato del bootstrap: ${scope.format ? 'seleccionado' : 'no aplica a estos cambios'}.\n` +
      '- Se comprueba siempre el selector de CI. La selección no acredita resultados ni criterios de las US.\n');
  }
}
