import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
  act,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { AuthContext } from '../../auth/auth-context';
import { createAuthClient } from '../../auth/api/auth-client';
import { createDemoSalesClient } from '../api/demo-client';
import type { SalesClient, Scenario } from '../api/contract.provisional';
import { SalesProvider } from '../state/SalesProvider';
import { useSales } from '../state/sales-context';
import { SalesPage } from './SalesPage';

beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function Controls() {
  const { state, beforeLogout } = useSales();
  return (
    <>
      <Link to="/other">Otro módulo</Link>
      <Link to="/sales">Volver a ventas</Link>
      <button onClick={() => beforeLogout()}>Cerrar para prueba</button>
      <output data-testid="phase">{state.phase}</output>
    </>
  );
}
function mount(scenario: Scenario = 'normal', supplied?: SalesClient) {
  const auth = createAuthClient({
    initial: { status: 'authenticated', label: 'Demo' },
    delay: 0,
  });
  const client =
    supplied ??
    createDemoSalesClient({
      auth,
      storage: localStorage,
      scenario: () => scenario,
      delay: 0,
    });
  const view = render(
    <MemoryRouter initialEntries={['/sales']}>
      <AuthContext value={auth}>
        <SalesProvider client={client}>
          <Controls />
          <Routes>
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/other" element={<p>Otro contenido</p>} />
          </Routes>
        </SalesProvider>
      </AuthContext>
    </MemoryRouter>,
  );
  return { ...view, auth, client };
}
const add = async (name = 'Espresso') =>
  fireEvent.click(
    await screen.findByRole('button', { name: `Agregar ${name}` }),
  );
const order = () =>
  within(screen.getByRole('region', { name: 'Pedido en curso' }));
async function prepare() {
  await add();
  fireEvent.click(
    screen.getByRole('button', { name: 'Revisar antes de cobrar' }),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Confirmar total para cobrar' }),
  );
  await screen.findByRole('button', { name: 'Registrar venta ya pagada' });
}
describe('Gestión de ventas completa con servicio simulado', () => {
  it('carga, pedido vacío, búsqueda y categorías, detalle accesible', async () => {
    mount();
    expect(screen.getByText('Cargando productos…')).toBeTruthy();
    expect(order().getByText('BOB 0.0')).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Revisar antes de cobrar',
      }).disabled,
    ).toBe(true);
    await add();
    expect(screen.queryByRole('button', { name: 'Solo inactivos' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Buscar productos'), {
      target: { value: '  CAPPUCCINO  ' },
    });
    expect(
      screen.queryByRole('button', { name: 'Agregar Espresso' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Panadería' }));
    expect(screen.getByText('Sin resultados')).toBeTruthy();
    fireEvent.click(screen.getByText('Limpiar búsqueda y filtros'));
    const detail = screen.getByRole('button', {
      name: 'Ver descripción de Espresso',
    });
    detail.focus();
    fireEvent.click(detail);
    expect(screen.getByRole('dialog').textContent).toContain('Café intenso');
    fireEvent.click(screen.getByText('Cerrar detalle'));
    expect(document.activeElement).toBe(detail);
  });
  it('agrega repetidos, restaura cantidades inválidas y quita explícitamente', async () => {
    mount();
    await add();
    await add();
    await add('Croissant de mantequilla');
    expect(order().getByText('BOB 32.5')).toBeTruthy();
    const input = screen.getByLabelText<HTMLInputElement>(
      'Cantidad de Espresso',
    );
    for (const value of ['', '0', '-1', '1.2', '9007199254740992']) {
      fireEvent.change(input, { target: { value } });
      fireEvent.blur(input);
      expect(input.value).toBe('2');
    }
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(order().getByText('BOB 42.5')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Quitar Espresso'));
    fireEvent.click(screen.getByLabelText('Quitar Croissant de mantequilla'));
    expect(
      screen.getByText('Agrega productos para preparar una venta'),
    ).toBeTruthy();
  });
  it.each(['Efectivo', 'QR'])(
    'recorrido %s sin preselección ni doble envío y nueva venta',
    async (method) => {
      const { client } = mount();
      const register = vi.spyOn(client, 'register');
      await prepare();
      expect(
        screen.getByRole<HTMLButtonElement>('button', {
          name: 'Registrar venta ya pagada',
        }).disabled,
      ).toBe(true);
      expect(screen.getByLabelText<HTMLInputElement>(method).checked).toBe(
        false,
      );
      fireEvent.click(screen.getByLabelText(method));
      const button = screen.getByText('Registrar venta ya pagada');
      fireEvent.click(button);
      fireEvent.click(button);
      expect(screen.getByText('Registrando…')).toBeTruthy();
      await screen.findByText('Venta simulada confirmada');
      expect(register).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(client.references()).toEqual([]));
      fireEvent.click(screen.getByText('Nueva venta'));
      await screen.findByText('Agrega productos para preparar una venta');
    },
  );
  it('informa cambios de precio sin modificar el pedido hasta confirmar', async () => {
    mount('price-change');
    await add();
    fireEvent.click(screen.getByText('Revisar antes de cobrar'));
    await screen.findByText(/Precio anterior/);
    expect(screen.getByText(/Precio vigente/).textContent).toContain(
      'BOB 12.0',
    );
    fireEvent.click(screen.getByText('Volver al pedido'));
    expect(order().getAllByText('BOB 10.0').length).toBeGreaterThan(0);
  });
  it('producto desactivado exige retiro y no puede cobrarse', async () => {
    mount('unavailable');
    await add();
    fireEvent.click(screen.getByText('Revisar antes de cobrar'));
    const remove = await screen.findByText('Retirar Espresso');
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Confirmar total para cobrar',
      }).disabled,
    ).toBe(true);
    fireEvent.click(remove);
    expect(
      screen.getByText('Agrega productos para preparar una venta'),
    ).toBeTruthy();
  });
  it('rechazo definitivo mantiene selección e invalida revisión', async () => {
    mount('validation');
    await prepare();
    fireEvent.click(screen.getByLabelText('QR'));
    fireEvent.click(screen.getByText('Registrar venta ya pagada'));
    await screen.findByText(/La venta no quedó registrada/);
    expect(screen.getByLabelText('Cantidad de Espresso')).toBeTruthy();
    expect(screen.queryByText('Registrar venta ya pagada')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain(
      'dinero ya se recibió',
    );
  });
  it.each(['lost-saved', 'lost-unsaved', 'connection'] as const)(
    'resultado %s no inventa éxito ni habilita nueva operación',
    async (scenario) => {
      mount(scenario);
      await prepare();
      fireEvent.click(screen.getByLabelText('Efectivo'));
      fireEvent.click(screen.getByText('Registrar venta ya pagada'));
      await screen.findByText('Resultado por comprobar');
      expect(screen.queryByText('Nueva venta')).toBeNull();
      expect(
        screen.getByRole<HTMLButtonElement>('button', {
          name: 'Agregar Espresso',
        }).disabled,
      ).toBe(true);
      fireEvent.click(screen.getByText('Comprobar resultado'));
      if (scenario === 'lost-saved')
        await screen.findByText('Venta simulada confirmada');
      else if (scenario === 'lost-unsaved') {
        await waitFor(() =>
          expect(
            screen.getByRole<HTMLButtonElement>('button', {
              name: 'Conciliar operación',
            }).disabled,
          ).toBe(false),
        );
        expect(screen.queryByText('Venta simulada confirmada')).toBeNull();
        fireEvent.click(screen.getByText('Conciliar operación'));
        await screen.findByText(/La venta no quedó registrada/);
      } else
        await screen.findByText(/Sin conexión. El resultado continúa incierto/);
    },
  );
  it.each(['empty', 'catalog-error'] as const)(
    'distingue %s de carga y ausencia de resultados',
    async (scenario) => {
      mount(scenario);
      await screen.findByText(
        scenario === 'empty'
          ? 'No hay productos disponibles'
          : 'No pudimos cargar el catálogo',
      );
      expect(screen.queryByText('Sin resultados')).toBeNull();
    },
  );
  it('conserva al navegar, permite cancelar cierre y descarta al perder sesión', async () => {
    const { auth } = mount();
    await prepare();
    fireEvent.click(screen.getByText('Otro módulo'));
    expect(screen.getByText('Otro contenido')).toBeTruthy();
    fireEvent.click(screen.getByText('Volver a ventas'));
    await screen.findByText('Registrar venta ya pagada');
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('button', {
          name: 'Registrar venta ya pagada',
        }).disabled,
      ).toBe(true),
    );
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByText('Cerrar para prueba'));
    expect(confirm.mock.calls[0]?.[0]).toContain(
      'revisión confirmada sin registrar',
    );
    expect(screen.getByText('Registrar venta ya pagada')).toBeTruthy();
    act(() => auth.unauthorized());
    await waitFor(() =>
      expect(screen.getByTestId('phase').textContent).toBe('editing'),
    );
    expect(screen.queryByText('Registrar venta ya pagada')).toBeNull();
  });
  it('tras recarga conserva solo referencia, bloquea otra venta y no recupera pedido', async () => {
    const first = mount('lost-unsaved');
    await prepare();
    fireEvent.click(screen.getByLabelText('QR'));
    fireEvent.click(screen.getByText('Registrar venta ya pagada'));
    await screen.findByText('Resultado por comprobar');
    const refs = first.client.references();
    first.unmount();
    mount();
    await screen.findByText('Resultado por comprobar');
    await screen.findByText(/La referencia no recupera/);
    expect(screen.queryByLabelText('Cantidad de Espresso')).toBeNull();
    expect(screen.queryByText('Reintentar misma operación')).toBeNull();
    expect(localStorage.getItem(localStorage.key(0)!)).toBe(refs[0]);
  });
  it('un fallo de almacenamiento impide enviar, sin fingir incertidumbre', async () => {
    const { client } = mount();
    const send = vi.spyOn(client, 'register');
    vi.spyOn(client, 'remember').mockImplementation(() => {
      throw new Error('Almacenamiento bloqueado; no se envió el registro.');
    });
    await prepare();
    fireEvent.click(screen.getByLabelText('QR'));
    fireEvent.click(screen.getByText('Registrar venta ya pagada'));
    expect(screen.getByRole('alert').textContent).toContain('no se envió');
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByText('Registrar venta ya pagada')).toBeTruthy();
  });
  it('una excepción de transporte al enviar conserva selección y exige comprobar', async () => {
    const { client } = mount();
    vi.spyOn(client, 'register').mockRejectedValueOnce(
      new Error('Conexión interrumpida'),
    );
    await prepare();
    fireEvent.click(screen.getByLabelText('Efectivo'));
    fireEvent.click(screen.getByText('Registrar venta ya pagada'));
    await screen.findByText('Resultado por comprobar');
    expect(screen.queryByText('Venta simulada confirmada')).toBeNull();
    expect(client.references()).toHaveLength(1);
    expect(order().getByText('Espresso')).toBeTruthy();
  });
  it('la carrera al confirmar exige ver y confirmar el nuevo total', async () => {
    mount('review-race');
    await add();
    fireEvent.click(screen.getByText('Revisar antes de cobrar'));
    fireEvent.click(await screen.findByText('Confirmar total para cobrar'));
    await screen.findByText(/El catálogo cambió al confirmar/);
    expect(screen.queryByText('Registrar venta ya pagada')).toBeNull();
    expect(screen.getByText(/Precio vigente/).textContent).toContain(
      'BOB 12.0',
    );
    fireEvent.click(screen.getByText('Confirmar total para cobrar'));
    await screen.findByText('Registrar venta ya pagada');
    expect(order().getAllByText('BOB 12.0').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Modificar antes del pago'));
    expect(screen.queryByLabelText('QR')).toBeNull();
    expect(screen.getByText('Revisar antes de cobrar')).toBeTruthy();
  });
  it('avisa al salir y dos proveedores no comparten la selección', async () => {
    const first = mount();
    await add();
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    first.unmount();
    mount();
    await screen.findByRole('button', { name: 'Agregar Espresso' });
    expect(
      screen.getByText('Agrega productos para preparar una venta'),
    ).toBeTruthy();
    expect(localStorage.length).toBe(0);
  });
});
