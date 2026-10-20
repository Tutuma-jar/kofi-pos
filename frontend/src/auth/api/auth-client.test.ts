import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createAuthClient, lifecycleFixture } from './auth-client';
import type { AuthClient, SessionState } from './contract.provisional';

const clients: AuthClient[] = [];
const active: SessionState = {
  status: 'authenticated',
  label: 'Cuenta compartida',
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => {
  clients.forEach((client) => client.dispose());
  clients.length = 0;
  vi.useRealTimers();
});
function client(options: Parameters<typeof createAuthClient>[0] = {}) {
  const instance = createAuthClient({ initial: active, ...options });
  clients.push(instance);
  return instance;
}

test('presencia cada 30s sin eventos de teclado/ratón conserva sesión', async () => {
  const received = vi.fn();
  const session = client({ onPresence: received });
  await vi.advanceTimersByTimeAsync(29_999);
  expect(received).toHaveBeenCalledTimes(0);
  await vi.advanceTimersByTimeAsync(1);
  expect(received).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(120_000);
  expect(received).toHaveBeenCalledTimes(5);
  expect(session.getSnapshot().status).toBe('authenticated');
});

test('sin señales finaliza exactamente al límite simulado 120s y no revive', async () => {
  const session = client({ presenceDelivered: false });
  await vi.advanceTimersByTimeAsync(119_999);
  expect(session.getSnapshot().status).toBe('authenticated');
  await vi.advanceTimersByTimeAsync(1);
  expect(session.getSnapshot()).toEqual({
    status: 'anonymous',
    reason: 'expired',
  });
  session.setPresenceDelivery(true);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(session.getSnapshot().status).toBe('anonymous');
});

test('120s se cuentan desde última señal recibida; suspensión simulada no revive', async () => {
  const session = client();
  await vi.advanceTimersByTimeAsync(30_000);
  session.setPresenceDelivery(false);
  await vi.advanceTimersByTimeAsync(119_999);
  expect(session.getSnapshot().status).toBe('authenticated');
  await vi.advanceTimersByTimeAsync(1);
  expect(session.getSnapshot().status).toBe('anonymous');
});

test('nuevo acceso y cierre A no desplazan B; señales tardías no reactivan A', async () => {
  const a = client();
  const b = client({ initial: { status: 'anonymous' } });
  const login = b.login({ username: 'demo', password: 'simulada' });
  await vi.advanceTimersByTimeAsync(650);
  expect(await login).toBe('accepted');
  expect(a.getSnapshot().status).toBe('authenticated');
  const close = a.logout();
  await vi.advanceTimersByTimeAsync(650);
  await close;
  expect(a.getSnapshot()).toEqual({ status: 'anonymous', reason: 'closed' });
  expect(b.getSnapshot().status).toBe('authenticated');
  a.setPresenceDelivery(true);
  await vi.advanceTimersByTimeAsync(120_000);
  expect(a.getSnapshot().status).toBe('anonymous');
  expect(b.getSnapshot().status).toBe('authenticated');
});

test('fixtures de recarga/nueva/duplicada/restaurada no acreditan identidad real', () => {
  expect(lifecycleFixture('reload', active)).toBe(active);
  for (const lifecycle of ['new', 'duplicated', 'restored'] as const) {
    expect(lifecycleFixture(lifecycle, active)).toEqual({
      status: 'anonymous',
      reason: 'required',
    });
  }
  expect(
    lifecycleFixture('reload', { status: 'anonymous', reason: 'closed' })
      .status,
  ).toBe('anonymous');
});

test('logout invalida login en vuelo y no espera el margen de presencia', async () => {
  const session = client();
  const login = session.login({ username: 'demo', password: 'simulada' });
  const close = session.logout();
  expect(session.getSnapshot().status).toBe('closing');
  await vi.advanceTimersByTimeAsync(650);
  expect(await login).toBe('superseded');
  await close;
  expect(session.getSnapshot()).toEqual({
    status: 'anonymous',
    reason: 'closed',
  });
});

test('comprobación inicial tardía no borra un resultado de acceso posterior', async () => {
  const session = client({ initial: { status: 'checking' }, delay: 0 });
  const login = session.login({ username: 'demo', password: 'simulada' });
  await vi.advanceTimersByTimeAsync(180);
  expect(await login).toBe('accepted');
  expect(session.getSnapshot().status).toBe('authenticated');
});

test('dispose cancela callbacks pendientes y no reactiva sesiones', async () => {
  const session = client({ initial: { status: 'anonymous' } });
  const login = session.login({ username: 'demo', password: 'simulada' });
  session.dispose();
  expect(await login).toBe('superseded');
  await vi.advanceTimersByTimeAsync(120_000);
  expect(session.getSnapshot().status).toBe('anonymous');
});
