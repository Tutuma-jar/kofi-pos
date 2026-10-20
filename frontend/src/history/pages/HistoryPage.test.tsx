import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../auth/auth-context';
import { createAuthClient } from '../../auth/api/auth-client';
import type { AuthClient } from '../../auth/api/contract.provisional';
import type {
  DemoScenario,
  HistoryClient,
  HistorySnapshot,
  SaleDetail,
} from '../api/contract.provisional';
import { createDemoHistoryClient } from '../api/demo-client';
import { HistoryPage } from './HistoryPage';

const now = () => Date.parse('2026-10-20T16:00:00Z');
const clients: AuthClient[] = [];
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanup();
  clients.forEach((c) => c.dispose());
  clients.length = 0;
  vi.restoreAllMocks();
});
function mount(scenario: DemoScenario = 'normal', supplied?: HistoryClient) {
  const auth = createAuthClient({
    initial: { status: 'authenticated', label: 'Demo' },
    delay: 0,
  });
  clients.push(auth);
  const client = supplied ?? createDemoHistoryClient({ auth, now, delay: 0 });
  client.demo?.setScenario(scenario);
  return {
    ...render(
      <AuthContext value={auth}>
        <HistoryPage client={client} />
      </AuthContext>,
    ),
    client,
    auth,
  };
}
const sales = () =>
  within(screen.getByRole('region', { name: 'Ventas registradas' }));
const reports = () =>
  within(screen.getByRole('region', { name: 'Reporte del período' }));
const chooseScenario = (value: DemoScenario) => {
  fireEvent.click(screen.getByText('Datos de demostración'));
  fireEvent.change(screen.getByLabelText('Escenario simulado'), {
    target: { value },
  });
};
const detailButton = () =>
  sales().getAllByRole('button', { name: /^Ver detalle/ })[0]!;
async function ready() {
  await screen.findByRole('region', { name: 'Listado de ventas' });
}

describe('Historial y reportes, interfaz completa', () => {
  it('carga inicial, Hoy del servicio, tabla compacta, resumen y top 10 sin funciones excluidas', async () => {
    mount();
    expect(
      screen.getAllByText('Cargando historial y reportes…').length,
    ).toBeGreaterThan(0);
    await ready();
    expect(screen.getByLabelText<HTMLInputElement>('Desde').value).toBe(
      '2026-10-20',
    );
    expect(screen.getByLabelText<HTMLInputElement>('Hasta').max).toBe(
      '2026-10-20',
    );
    expect(
      screen.getByRole('button', { name: 'Hoy' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(sales().getAllByRole('row')).toHaveLength(51);
    expect(reports().getAllByRole('row')).toHaveLength(11);
    expect(reports().getByText('Espresso de la casa')).toBeTruthy();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByText(/Exportar|Imprimir|Número de venta/)).toBeNull();
    expect(screen.queryByText('demo-sale-0000')).toBeNull();
    expect(screen.getByText('Datos de demostración')).toBeTruthy();
  });
  it('página siguiente, anterior, rango y refresco vuelven a primera página', async () => {
    const { client } = mount();
    const read = vi.spyOn(client, 'read');
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(sales().getByText(/Página 2/)).toBeTruthy());
    expect(sales().getAllByRole('row')).toHaveLength(14);
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    await waitFor(() => expect(sales().getByText(/Página 1/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(sales().getByText(/Página 2/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(sales().getByText(/Página 1/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Últimos 7 días' }));
    await waitFor(() =>
      expect(read).toHaveBeenLastCalledWith(
        { startDate: '2026-10-14', endDate: '2026-10-20' },
        expect.any(AbortSignal),
      ),
    );
    await ready();
    expect(
      reports().getByText('14/10/2026 – 20/10/2026 · Bolivia'),
    ).toBeTruthy();
  });
  it('borrador inválido o sin aplicar nunca muestra resultados como propios ni consulta', async () => {
    const { client } = mount();
    await ready();
    const read = vi.spyOn(client, 'read');
    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-10-21' },
    });
    expect(screen.getByRole('alert').textContent).toContain('posterior');
    expect(
      screen.queryByRole('region', { name: 'Listado de ventas' }),
    ).toBeNull();
    fireEvent.submit(screen.getByRole('form', { name: 'Filtrar por fechas' }));
    expect(read).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2020-01-01' },
    });
    expect(screen.getByRole('alert').textContent).toContain('366');
    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-10-19' },
    });
    expect(
      screen.getByText(
        'Fechas modificadas. Consulta el rango para ver sus ventas y reportes.',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar rango' }));
    await ready();
    expect(read).toHaveBeenCalledOnce();
    expect(
      reports().getByText('19/10/2026 – 20/10/2026 · Bolivia'),
    ).toBeTruthy();
  });
  it.each(['empty', 'normal'] as const)(
    'vacío con %s: sin promedio ficticio ni reporte inventado',
    async (scenario) => {
      mount(scenario);
      if (scenario === 'normal') {
        await ready();
        fireEvent.change(screen.getByLabelText('Desde'), {
          target: { value: '2020-01-01' },
        });
        fireEvent.change(screen.getByLabelText('Hasta'), {
          target: { value: '2020-01-01' },
        });
        fireEvent.click(
          screen.getByRole('button', { name: 'Consultar rango' }),
        );
      }
      await waitFor(() =>
        expect(
          screen.getAllByText('No se registraron ventas en este rango'),
        ).toHaveLength(2),
      );
      expect(screen.queryByText('Ticket promedio')).toBeNull();
      expect(screen.queryByText('BOB 0.0')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );
  it('fallo inicial, reintento real y fallo al refrescar conserva datos marcados no actualizados', async () => {
    const { client } = mount('query-error');
    await screen.findByRole('alert');
    expect(
      screen.queryByText('No se registraron ventas en este rango'),
    ).toBeNull();
    client.demo!.setScenario('normal');
    fireEvent.click(
      screen.getByRole('button', { name: 'Reintentar consulta' }),
    );
    await ready();
    const count = sales().getAllByRole('row').length;
    chooseScenario('query-error');
    await screen.findByRole('alert');
    expect(screen.getAllByText('No actualizado')).toHaveLength(2);
    expect(sales().getAllByRole('row')).toHaveLength(count);
    expect(reports().getByText('Ticket promedio')).toBeTruthy();
    expect(
      screen.queryByText('No se registraron ventas en este rango'),
    ).toBeNull();
    client.demo!.setScenario('normal');
    fireEvent.click(
      screen.getByRole('button', { name: 'Reintentar consulta' }),
    );
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.queryByText('No actualizado')).toBeNull();
  });
  it('reporte fallido no elimina las ventas ni se presenta como vacío; reintento conjunto', async () => {
    const { client } = mount('report-error');
    await ready();
    expect(reports().getByRole('alert').textContent).toContain(
      'No se pudieron generar los reportes',
    );
    expect(sales().getAllByRole('row')).toHaveLength(51);
    client.demo!.setScenario('normal');
    fireEvent.click(
      screen.getByRole('button', { name: 'Reintentar reportes' }),
    );
    await waitFor(() =>
      expect(reports().getByText('Ticket promedio')).toBeTruthy(),
    );
  });
  it('detalle cargando, snapshots y solo lectura; Escape devuelve foco al disparador', async () => {
    mount();
    await ready();
    const trigger = detailButton();
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = within(
      screen.getByRole('dialog', { name: 'Detalle de la venta' }),
    );
    expect(dialog.getByText('Cargando detalle de la venta…')).toBeTruthy();
    await dialog.findByText('Total registrado');
    expect(dialog.getByText('Espresso')).toBeTruthy();
    expect(dialog.queryByText('Espresso de la casa')).toBeNull();
    expect(dialog.getByText('Café frío original')).toBeTruthy();
    expect(dialog.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Cerrar detalle',
    ]);
    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { bubbles: true, cancelable: true }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it.each(['detail-error', 'not-found'] as const)(
    'detalle %s diferenciable y recuperable sin inventar productos',
    async (scenario) => {
      const { client } = mount(scenario);
      await ready();
      fireEvent.click(detailButton());
      const dialog = within(screen.getByRole('dialog'));
      await dialog.findByRole('alert');
      expect(dialog.queryByRole('table')).toBeNull();
      if (scenario === 'not-found')
        expect(dialog.getByText(/No se encontró la venta/)).toBeTruthy();
      client.demo!.setScenario('normal');
      fireEvent.click(
        dialog.getByRole('button', { name: 'Reintentar detalle' }),
      );
      await dialog.findByText('Total registrado');
    },
  );
  it('ignora respuestas antiguas incluso si el cliente ignora AbortSignal', async () => {
    const access = {
      getSnapshot: () => ({ status: 'authenticated' as const, label: 'Demo' }),
      unauthorized: vi.fn(),
    };
    const source = createDemoHistoryClient({ auth: access, now, delay: 0 });
    const initial = await source.read(null);
    const older = await source.read({
      startDate: '2026-10-14',
      endDate: '2026-10-20',
    });
    const latest = await source.read({
      startDate: '2026-10-01',
      endDate: '2026-10-20',
    });
    let finishOld!: (data: HistorySnapshot) => void;
    let finishLatest!: (data: HistorySnapshot) => void;
    const read = vi
      .fn()
      .mockResolvedValueOnce(initial)
      .mockImplementationOnce(
        () =>
          new Promise<HistorySnapshot>((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<HistorySnapshot>((resolve) => {
            finishLatest = resolve;
          }),
      );
    mount('normal', { ...source, read });
    await ready();
    fireEvent.click(screen.getByText('Últimos 7 días'));
    fireEvent.click(screen.getByText('Este mes'));
    await act(async () => finishLatest(latest));
    expect(
      reports().getByText('01/10/2026 – 20/10/2026 · Bolivia'),
    ).toBeTruthy();
    await act(async () => finishOld(older));
    expect(
      reports().getByText('01/10/2026 – 20/10/2026 · Bolivia'),
    ).toBeTruthy();
    expect(
      reports().queryByText('14/10/2026 – 20/10/2026 · Bolivia'),
    ).toBeNull();
  });
  it('cerrar un detalle con petición pendiente no lo reabre ni sobrescribe el siguiente', async () => {
    const access = {
      getSnapshot: () => ({ status: 'authenticated' as const, label: 'Demo' }),
      unauthorized: vi.fn(),
    };
    const source = createDemoHistoryClient({ auth: access, now, delay: 0 });
    const detail = await source.detail('demo-sale-0000');
    let finish!: (data: SaleDetail) => void;
    const readDetail = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<SaleDetail>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue(detail);
    mount('normal', { ...source, detail: readDetail });
    await ready();
    fireEvent.click(detailButton());
    fireEvent.click(screen.getByText('Cerrar detalle'));
    await act(async () => finish(detail));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(detailButton());
    await screen.findByText('Total registrado');
  });
});
