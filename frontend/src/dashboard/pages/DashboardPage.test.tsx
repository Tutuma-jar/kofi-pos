import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AuthContext } from '../../auth/auth-context';
import { createAuthClient } from '../../auth/api/auth-client';
import type { AuthClient } from '../../auth/api/contract.provisional';
import { createDemoDashboardClient } from '../api/demo-client';
import { BASE_TIME, fixture } from '../api/fixtures';
import { createRealDashboardClient } from '../api/real-dashboard-client';
import { DashboardPage } from './DashboardPage';

const authClients: AuthClient[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE_TIME);
});
afterEach(() => {
  cleanup();
  authClients.splice(0).forEach((client) => client.dispose());
  vi.useRealTimers();
});
function mount() {
  const auth = createAuthClient({
    initial: { status: 'authenticated', label: 'Cuenta compartida' },
  });
  authClients.push(auth);
  const client = createDemoDashboardClient(auth.unauthorized);
  render(
    <AuthContext value={auth}>
      <DashboardPage client={client} />
    </AuthContext>,
  );
  return { client, auth };
}
async function settle(ms = 350) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
const summary = () => within(screen.getByLabelText('Resumen de ventas'));
const products = () =>
  within(
    screen.getByRole('region', {
      name: 'Lista completa de productos vendidos',
    }),
  );

test('backend demonstration indicator is discreet and keeps real page states and selector', async () => {
  const auth = createAuthClient({
    initial: { status: 'authenticated', label: 'Test' },
  });
  authClients.push(auth);
  const client = createRealDashboardClient({
    request: async () => ({
      kind: 'ok',
      data: fixture('today', Date.now(), {
        mode: 'empty',
        updated: false,
        renamed: false,
      }),
      headers: new Headers({ 'X-Kofi-Dashboard-Mode': 'demo' }),
    }),
  });
  render(
    <AuthContext value={auth}>
      <DashboardPage client={client} />
    </AuthContext>,
  );
  expect(screen.getByLabelText('Cargando ventas')).toBeDefined();
  await settle(0);
  expect(screen.getByText(/Datos de demostración/)).toBeDefined();
  expect(
    screen.getByRole('heading', { name: 'Aún no se realizaron ventas hoy' }),
  ).toBeDefined();
  expect(screen.getByLabelText('Este mes')).toBeDefined();
});

test('Hoy inicial, carga diferenciada y cuatro tarjetas; Mes cambia los tres bloques', async () => {
  mount();
  expect(screen.getByLabelText<HTMLInputElement>('Hoy').checked).toBe(true);
  expect(screen.getByLabelText('Cargando ventas')).toBeDefined();
  expect(screen.queryByText('Aún no se realizaron ventas hoy')).toBeNull();
  await settle();
  expect(summary().getAllByRole('term')).toHaveLength(4);
  expect(summary().getByText('12')).toBeDefined();
  expect(summary().getByText('BOB 455.0')).toBeDefined();
  expect(summary().getByText('7')).toBeDefined();
  expect(summary().getByText('5')).toBeDefined();
  expect(products().getByText('BOB 100.0')).toBeDefined();
  fireEvent.click(screen.getByLabelText('Este mes'));
  expect(screen.queryByLabelText('Resumen de ventas')).toBeNull();
  await settle();
  expect(summary().getByText('40')).toBeDefined();
  expect(summary().getByText('BOB 1550.0')).toBeDefined();
  expect(products().getByText('BOB 300.0')).toBeDefined();
  expect(screen.getByText(/Suma de cada franja/)).toBeDefined();
});

test('mensajes exactos de vacío sustituyen las tres secciones; selector sigue operable', async () => {
  const { client } = mount();
  act(() => client.demo?.run('empty'));
  await settle();
  expect(
    screen.getByRole('heading', { name: 'Aún no se realizaron ventas hoy' }),
  ).toBeDefined();
  expect(screen.queryByLabelText('Resumen de ventas')).toBeNull();
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.queryByRole('table')).toBeNull();
  fireEvent.click(screen.getByLabelText('Este mes'));
  await settle();
  expect(
    screen.getByRole('heading', {
      name: 'Aún no se realizaron ventas este mes',
    }),
  ).toBeDefined();
});

test('error inicial no es vacío; actualización fallida conserva datos rotulados y recupera', async () => {
  const { client } = mount();
  act(() => client.demo?.run('initial-error'));
  await settle();
  expect(
    screen.getByRole('heading', { name: 'No pudimos cargar las ventas' }),
  ).toBeDefined();
  expect(screen.queryByText('Aún no se realizaron ventas hoy')).toBeNull();
  act(() => client.demo?.run('recover'));
  await settle();
  act(() => client.demo?.run('refresh-error'));
  await settle();
  expect(summary().getByText('12')).toBeDefined();
  expect(screen.getByRole('status').textContent).toContain(
    'Datos no actualizados',
  );
  expect(screen.queryByText(/Diagnóstico simulado/)).toBeNull();
  act(() => client.demo?.run('recover'));
  await settle();
  expect(screen.getByRole('status').textContent).not.toContain(
    'no actualizados',
  );
});

test('vacío anterior con error de actualización no afirma ausencia vigente', async () => {
  const { client } = mount();
  act(() => client.demo?.run('empty'));
  await settle();
  act(() => client.demo?.run('refresh-error'));
  await settle();
  expect(screen.queryByText('Aún no se realizaron ventas hoy')).toBeNull();
  expect(
    screen.getByText('No pudimos confirmar los resultados actuales'),
  ).toBeDefined();
});

test('orden recibido intacto, lista completa de 60 productos y foco en región de scroll', async () => {
  const { client } = mount();
  await settle();
  expect(
    products()
      .getAllByRole('rowheader')
      .map((cell) => cell.textContent),
  ).toEqual(['Croissant', 'Café latte', 'Té', 'Americano']);
  act(() => client.demo?.run('many'));
  await settle();
  expect(products().getAllByRole('rowheader')).toHaveLength(60);
  expect(products().getByText('Producto de demostración 60')).toBeDefined();
  const scroll = screen.getByRole('region', {
    name: 'Lista completa de productos vendidos',
  });
  scroll.focus();
  expect(document.activeElement).toBe(scroll);
});

test('gráfico Hoy corta en Bolivia, mantiene eje24 y valores accesibles sin puntero', async () => {
  const { client } = mount();
  await settle();
  const axis = screen.getByLabelText('Horas de 0 a 23');
  expect(axis.children).toHaveLength(24);
  expect(
    screen.getByRole('img').querySelector('path')?.getAttribute('d'),
  ).toContain('L43.47826086956522,0');
  const toggle = screen.getByRole('button', { name: 'Ver valores por hora' });
  toggle.focus();
  fireEvent.click(toggle);
  const values = screen.getByLabelText('Hora y cantidad de ventas');
  expect(within(values).getAllByRole('term')).toHaveLength(11);
  expect(within(values).getByText('10:00')).toBeDefined();
  expect(within(values).queryByText('11:00')).toBeNull();
  act(() => client.demo?.run('hour'));
  await settle();
  expect(
    within(screen.getByLabelText('Hora y cantidad de ventas')).getByText(
      '11:00',
    ),
  ).toBeDefined();
  expect(document.activeElement).toBe(toggle);
  fireEvent.click(screen.getByLabelText('Este mes'));
  await settle();
  expect(
    within(screen.getByLabelText('Hora y cantidad de ventas')).getAllByRole(
      'term',
    ),
  ).toHaveLength(24);
});

test('venta actualiza conjuntamente resumen/productos/horas sin recarga ni mover foco', async () => {
  const { client } = mount();
  await settle();
  const radio = screen.getByLabelText('Hoy');
  radio.focus();
  fireEvent.click(screen.getByRole('button', { name: 'Ver valores por hora' }));
  radio.focus();
  act(() => client.demo?.run('sale'));
  await settle();
  expect(summary().getByText('13')).toBeDefined();
  expect(summary().getByText('BOB 495.0')).toBeDefined();
  expect(products().getAllByRole('rowheader')[0]?.textContent).toBe(
    'Americano',
  );
  const ten = screen
    .getByLabelText('Hora y cantidad de ventas')
    .querySelectorAll('div')[10];
  expect(ten?.textContent).toBe('10:006');
  expect(document.activeElement).toBe(radio);
});

test('BOB con decimal exacto, cero no vacío y cifras largas completas', async () => {
  const { client } = mount();
  act(() => client.demo?.run('decimal'));
  await settle();
  expect(summary().getByText('BOB 4550.5')).toBeDefined();
  act(() => client.demo?.run('zero'));
  await settle();
  expect(summary().getByText('BOB 0.0')).toBeDefined();
  expect(screen.queryByText('Aún no se realizaron ventas hoy')).toBeNull();
  act(() => client.demo?.run('large'));
  await settle();
  expect(summary().getByText('BOB 900719925474099.1')).toBeDefined();
  expect(products().getByText('9007199254740991')).toBeDefined();
});

test('DEV reproduce respuesta vieja tras fallo y recuperación sin reponer vigencia falsa', async () => {
  mount();
  await settle();
  const control = screen.getByLabelText('Escenario de demostración');
  fireEvent.change(control, { target: { value: 'late-failure' } });
  await settle(1700);
  expect(screen.getByRole('status').textContent).toContain('no actualizados');
  fireEvent.change(control, { target: { value: 'recover' } });
  await settle();
  expect(screen.getByRole('status').textContent).not.toContain(
    'no actualizados',
  );
});

test.each(['unauthorized-read', 'unauthorized-stream'] as const)(
  '401 %s se delega a auth sin error propio ni vacío',
  async (scenario) => {
    const { client, auth } = mount();
    await settle();
    act(() => client.demo?.run(scenario));
    await settle();
    expect(auth.getSnapshot().status).toBe('anonymous');
    expect(screen.queryByText('Aún no se realizaron ventas hoy')).toBeNull();
    expect(screen.queryByText('No pudimos cargar las ventas')).toBeNull();
    expect(screen.queryByLabelText('Resumen de ventas')).toBeNull();
  },
);
