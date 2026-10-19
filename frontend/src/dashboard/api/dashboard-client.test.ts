import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type {
  DashboardEvent,
  DashboardPeriod,
  ReadResult,
} from './contract.provisional';
import { createDashboardClient } from './dashboard-client';
import { createDemoDashboardClient } from './demo-client';
import { BASE_TIME, fixture } from './fixtures';
import { money } from './presentation';

const stops: (() => void)[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE_TIME);
});
afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  vi.useRealTimers();
});
const data = (
  period: DashboardPeriod = 'today',
  updated = false,
  time = Date.now(),
) => fixture(period, time, { mode: 'normal', updated, renamed: false });
const ok = (
  period: DashboardPeriod = 'today',
  updated = false,
  time = Date.now(),
): ReadResult => ({ kind: 'ok', data: data(period, updated, time) });
const error: ReadResult = {
  kind: 'error',
  status: 500,
  body: { error: { code: 'INTERNAL_ERROR', message: 'diagnostic' } },
};
function deferred() {
  let resolve!: (result: ReadResult) => void;
  const promise = new Promise<ReadResult>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function harness() {
  const pending: ReturnType<typeof deferred>[] = [];
  let emit: (event: DashboardEvent) => void = () => {};
  const reconnect = vi.fn();
  const unauthorized = vi.fn();
  const read = vi.fn<(period: DashboardPeriod) => Promise<ReadResult>>(() => {
    const request = deferred();
    pending.push(request);
    return request.promise;
  });
  const client = createDashboardClient(
    {
      now: Date.now,
      read,
      reconnect,
      subscribe: (listener) => {
        emit = listener;
        return () => {
          emit = () => {};
        };
      },
    },
    unauthorized,
  );
  stops.push(client.start());
  return {
    client,
    pending,
    read,
    reconnect,
    unauthorized,
    emit: (event: DashboardEvent) => emit(event),
  };
}
async function resolve(
  request: ReturnType<typeof deferred> | undefined,
  result: ReadResult,
) {
  expect(request).toBeDefined();
  request?.resolve(result);
  await Promise.resolve();
  await Promise.resolve();
}

test('una lectura atómica, Hoy inicial y cambio de período sin mezclar bloques', async () => {
  const h = harness();
  expect(h.client.getSnapshot().period).toBe('today');
  expect(h.client.getSnapshot().phase).toBe('loading');
  await resolve(h.pending[0], ok());
  expect(h.client.getSnapshot().data).toEqual(data());
  h.client.selectPeriod('month');
  expect(h.client.getSnapshot().data).toBeNull();
  await resolve(h.pending[1], ok('month'));
  expect(h.client.getSnapshot().data).toEqual(data('month'));
  expect(h.read.mock.calls.map(([period]) => period)).toEqual([
    'today',
    'month',
  ]);
});

test('Hoy→Mes→Hoy descarta generaciones antiguas aunque period coincida', async () => {
  const h = harness();
  h.client.selectPeriod('month');
  h.client.selectPeriod('today');
  await resolve(h.pending[2], ok('today', true));
  await resolve(h.pending[1], ok('month'));
  await resolve(h.pending[0], ok());
  expect(h.client.getSnapshot().data?.summary.salesCount).toBe(13);
});

test('respuesta vieja tras fallo no quita stale; tampoco sobrescribe recuperación', async () => {
  const h = harness();
  await resolve(h.pending[0], ok());
  h.client.refresh();
  h.client.refresh();
  await resolve(h.pending[2], error);
  await resolve(h.pending[1], ok('today', true));
  expect(h.client.getSnapshot().stale).toBe(true);
  expect(h.client.getSnapshot().data?.summary.salesCount).toBe(12);
  h.client.refresh();
  h.client.refresh();
  await resolve(h.pending[4], ok('today', true));
  await resolve(h.pending[3], error);
  expect(h.client.getSnapshot().stale).toBe(false);
  expect(h.client.getSnapshot().error).toBeNull();
  expect(h.client.getSnapshot().data?.summary.salesCount).toBe(13);
});

test('error inicial no es vacío; relectura fallida conserva snapshot incluso vacío', async () => {
  const h = harness();
  await resolve(h.pending[0], error);
  expect(h.client.getSnapshot().phase).toBe('error');
  expect(h.client.getSnapshot().data).toBeNull();
  h.client.refresh();
  const empty = fixture('today', Date.now(), {
    mode: 'empty',
    updated: false,
    renamed: false,
  });
  await resolve(h.pending[1], { kind: 'ok', data: empty });
  h.client.refresh();
  await resolve(h.pending[2], { kind: 'connection' });
  expect(h.client.getSnapshot().stale).toBe(true);
  expect(h.client.getSnapshot().data).toEqual(empty);
});

test('invalidaciones repetidas reemplazan snapshot, nunca incrementan valores', async () => {
  const h = harness();
  await resolve(h.pending[0], ok());
  h.emit({ type: 'sales-changed', data: {} });
  h.emit({ type: 'sales-changed', data: {} });
  await resolve(h.pending[2], ok('today', true));
  await resolve(h.pending[1], ok('today', true));
  expect(h.client.getSnapshot().data).toEqual(data('today', true));
});

test('conciliación30, latido25, corte60 y relectura al reconectar', async () => {
  const h = harness();
  await resolve(h.pending[0], ok());
  await vi.advanceTimersByTimeAsync(25_000);
  h.emit({ type: 'heartbeat' });
  await vi.advanceTimersByTimeAsync(5000);
  expect(h.read).toHaveBeenCalledTimes(2);
  await resolve(h.pending[1], ok());
  await vi.advanceTimersByTimeAsync(54_999);
  expect(h.reconnect).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(h.reconnect).toHaveBeenCalledTimes(1);
  expect(h.client.getSnapshot().stream).toBe('reconnecting');
  const count = h.read.mock.calls.length;
  h.emit({ type: 'open' });
  expect(h.read).toHaveBeenCalledTimes(count + 1);
});

test('periodEndsAt: lectura cruzando medianoche se descarta y relee; no publica otro día', async () => {
  vi.setSystemTime('2026-10-20T03:59:59.000Z');
  const h = harness();
  const old = ok();
  vi.setSystemTime('2026-10-20T04:00:00.000Z');
  await resolve(h.pending[0], old);
  expect(h.client.getSnapshot().data).toBeNull();
  expect(h.read).toHaveBeenCalledTimes(2);
  await resolve(h.pending[1], ok());
  expect(h.client.getSnapshot().data?.summary.salesCount).toBe(0);
});

test('vencimiento conserva datos rotulados anteriores y permite respuesta lenta sin inanición', async () => {
  vi.setSystemTime('2026-10-20T03:59:59.000Z');
  const h = harness();
  await resolve(h.pending[0], ok());
  await vi.advanceTimersByTimeAsync(1000);
  expect(h.client.getSnapshot().stale).toBe(true);
  expect(h.client.getSnapshot().dataLabel).toContain('19');
  const latest = h.pending.at(-1);
  await vi.advanceTimersByTimeAsync(1000);
  expect(h.pending.at(-1)).toBe(latest);
  await resolve(latest, ok());
  expect(h.client.getSnapshot().stale).toBe(false);
  expect(h.client.getSnapshot().data?.summary.salesCount).toBe(0);
});

test('cambia hora, día y mes de Bolivia; Mes también relee al cambiar día', async () => {
  const h = harness();
  await resolve(h.pending[0], ok());
  vi.setSystemTime('2026-10-19T15:00:00.000Z');
  h.emit({ type: 'clock' });
  expect(h.client.getSnapshot().currentHour).toBe(11);
  h.client.selectPeriod('month');
  await resolve(h.pending.at(-1), ok('month'));
  vi.setSystemTime('2026-10-20T04:00:00.000Z');
  h.emit({ type: 'clock' });
  expect(h.client.getSnapshot().stale).toBe(true);
  await resolve(h.pending.at(-1), ok('month'));
  vi.setSystemTime('2026-11-01T04:00:00.000Z');
  h.emit({ type: 'clock' });
  await resolve(h.pending.at(-1), ok('month'));
  expect(h.client.getSnapshot().data?.summary.salesCount).toBe(0);
  expect(h.client.getSnapshot().data?.periodEndsAt).toBe(
    '2026-12-01T04:00:00.000Z',
  );
});

test('period eco incorrecto no se publica; 401 obsoleto y stream delegan a Acceso', async () => {
  const h = harness();
  await resolve(h.pending[0], ok('month'));
  expect(h.client.getSnapshot().phase).toBe('error');
  h.client.refresh();
  h.client.selectPeriod('month');
  await resolve(h.pending[1], {
    kind: 'error',
    status: 401,
    body: { error: { code: 'UNAUTHORIZED', message: '' } },
  });
  expect(h.unauthorized).toHaveBeenCalledTimes(1);
  expect(h.client.getSnapshot().phase).toBe('unauthorized');
  await resolve(h.pending[2], ok('month'));
  expect(h.client.getSnapshot().data).toBeNull();
  const other = harness();
  other.emit({ type: 'unauthorized' });
  expect(other.unauthorized).toHaveBeenCalledTimes(1);
});

test('desmontar invalida solicitudes y limpia temporización y suscripción', async () => {
  const h = harness();
  stops.pop()?.();
  await resolve(h.pending[0], ok());
  await vi.advanceTimersByTimeAsync(60_000);
  expect(h.client.getSnapshot().data).toBeNull();
  expect(h.read).toHaveBeenCalledTimes(1);
});

test('fixtures coherentes, sin ranking ni límite; formato exacto sin separador de miles', () => {
  for (const period of ['today', 'month'] as const) {
    for (const mode of [
      'normal',
      'empty',
      'many',
      'large',
      'decimal',
      'zero',
    ] as const) {
      const value = fixture(period, BASE_TIME, {
        mode,
        updated: false,
        renamed: false,
      });
      expect(value.hourlySales).toHaveLength(24);
      expect(value.summary.cashSalesCount + value.summary.qrSalesCount).toBe(
        value.summary.salesCount,
      );
      expect(
        value.products.reduce((sum, product) => sum + product.revenueTenths, 0),
      ).toBe(value.summary.revenueTenths);
      expect(
        value.hourlySales.reduce((sum, point) => sum + point.salesCount, 0),
      ).toBe(value.summary.salesCount);
    }
  }
  expect(data().products.map((product) => product.unitsSold)).toEqual([
    4, 8, 2, 6,
  ]);
  expect(money(45505)).toBe('BOB 4550.5');
  expect(money(0)).toBe('BOB 0.0');
  expect(money(Number.MAX_SAFE_INTEGER)).toBe('BOB 900719925474099.1');
});

test('emisor demo: aviso perdido, renombrado e inactividad esperan relectura; latidos evitan corte', async () => {
  const client = createDemoDashboardClient();
  stops.push(client.start());
  await vi.advanceTimersByTimeAsync(350);
  client.demo?.run('missed');
  client.demo?.run('rename');
  client.demo?.run('inactive');
  expect(client.getSnapshot().data?.summary.salesCount).toBe(12);
  await vi.advanceTimersByTimeAsync(30_350);
  expect(client.getSnapshot().data?.summary.salesCount).toBe(13);
  expect(
    client
      .getSnapshot()
      .data?.products.find((product) => product.productId.endsWith('1'))
      ?.currentName,
  ).toBe('Latte de la casa');
  await vi.advanceTimersByTimeAsync(60_000);
  expect(client.getSnapshot().stream).toBe('connected');
});

test('escenarios fuera de orden, fallo, recuperación y silencio son reproducibles sin red', async () => {
  const client = createDemoDashboardClient();
  stops.push(client.start());
  await vi.advanceTimersByTimeAsync(350);
  client.demo?.run('sale');
  await vi.advanceTimersByTimeAsync(350);
  client.demo?.run('race');
  await vi.advanceTimersByTimeAsync(1600);
  expect(client.getSnapshot().period).toBe('today');
  expect(client.getSnapshot().data?.summary.salesCount).toBe(13);
  client.demo?.run('late-failure');
  await vi.advanceTimersByTimeAsync(1600);
  expect(client.getSnapshot().stale).toBe(true);
  client.demo?.run('recover');
  await vi.advanceTimersByTimeAsync(350);
  expect(client.getSnapshot().stale).toBe(false);
  client.demo?.run('silence');
  await vi.advanceTimersByTimeAsync(61_000);
  expect(client.getSnapshot().stream).toBe('connected');
});
