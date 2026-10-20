import type { HttpResult } from '../../auth/api/contract.provisional';
import { MenuError } from './contract.provisional';
import type { Category, MenuClient } from './contract.provisional';

/** TASK-020: categories over the common authorized client of auth/api.
 * Not wired into menuClient yet (products arrive with TASK-016); renaming and
 * deleting categories are not available in this iteration and fail explicitly.
 */
export const menuMessages = {
  duplicate: 'Ya existe una categoría con este nombre.',
  length: 'Escribe un nombre de 1 a 80 caracteres.',
  conflict:
    'Esta categoría cambió mientras la editabas. Revisa la versión actual y vuelve a aplicar tus cambios.',
  session: 'Tu sesión terminó. Inicia sesión de nuevo.',
  connection: 'No pudimos completar la operación. Reintenta.',
  unavailable: 'Esta acción aún no está disponible.',
} as const;

export type MenuTransport = {
  request?: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<HttpResult<unknown>>;
};
type Failure = Exclude<HttpResult<unknown>, { kind: 'ok' }>;

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export function validCategory(value: unknown): value is Category {
  return (
    record(value) &&
    typeof value.id === 'string' &&
    /^[a-f0-9]{24}$/.test(value.id) &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    typeof value.version === 'number' &&
    Number.isSafeInteger(value.version) &&
    value.version >= 1
  );
}
export function validCategoryList(
  value: unknown,
): value is { items: Category[] } {
  if (!record(value) || !Array.isArray(value.items)) return false;
  const ids = new Set<string>();
  for (const item of value.items) {
    if (!validCategory(item) || ids.has(item.id)) return false;
    ids.add(item.id);
  }
  return true;
}
const nameLengthRejected = (details: unknown) =>
  record(details) &&
  Array.isArray(details.fields) &&
  details.fields.some(
    (field: unknown) =>
      record(field) &&
      field.field === 'name' &&
      (field.code === 'TOO_SHORT' || field.code === 'TOO_LONG'),
  );

// The server message is diagnostic only: the UI shows these texts.
export function menuFailure(result: Failure): MenuError {
  if (result.kind === 'unauthorized')
    return new MenuError('CONNECTION_ERROR', menuMessages.session);
  if (result.kind === 'error') {
    if (result.status === 409 && result.code === 'DUPLICATE_NAME')
      return new MenuError('VALIDATION_ERROR', menuMessages.duplicate, {
        name: menuMessages.duplicate,
      });
    if (result.status === 409 && result.code === 'VERSION_CONFLICT')
      return new MenuError('CONFLICT', menuMessages.conflict);
    if (
      result.status === 400 &&
      result.code === 'VALIDATION_ERROR' &&
      nameLengthRejected(result.details)
    )
      return new MenuError('VALIDATION_ERROR', menuMessages.length, {
        name: menuMessages.length,
      });
  }
  // Network, 5xx, superseded or unexpected answers: never an empty catalog.
  return new MenuError('CONNECTION_ERROR', menuMessages.connection);
}

const unavailable = () =>
  Promise.reject(new MenuError('CONNECTION_ERROR', menuMessages.unavailable));

export function createRealMenuClient(
  auth: MenuTransport,
  timeoutMs = 15_000,
): MenuClient {
  async function send(path: string, init: RequestInit = {}) {
    if (!auth.request) throw menuFailure({ kind: 'connection' });
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), timeoutMs);
    let result: HttpResult<unknown>;
    try {
      result = await auth.request(path, { ...init, signal: abort.signal });
    } catch {
      result = { kind: 'connection' };
    } finally {
      clearTimeout(timeout);
    }
    if (result.kind !== 'ok') throw menuFailure(result);
    return result.data;
  }
  return {
    async list() {
      const data = await send('/api/categories');
      if (!validCategoryList(data)) throw menuFailure({ kind: 'connection' });
      // Product reads belong to TASK-016; this client is not wired until then.
      return { categories: data.items, products: [] };
    },
    async saveCategory(name, current) {
      if (current) return unavailable();
      const data = await send('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!validCategory(data)) throw menuFailure({ kind: 'connection' });
    },
    deleteCategory: unavailable,
    getProduct: unavailable,
    saveProduct: unavailable,
    setActive: unavailable,
    // Compatibility surface for the simulated UI: no fixture fallback.
    setScenario() {},
  };
}
