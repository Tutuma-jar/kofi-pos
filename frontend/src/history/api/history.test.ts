import { describe, expect, it, vi } from 'vitest';
import {
  boliviaDate,
  money,
  presetRange,
  validateRange,
  formatTimestamp,
} from './dates';
import { createDemoHistoryClient } from './demo-client';
import { demoProducts } from './fixtures';
import type { HistorySnapshot } from './contract.provisional';

const time = Date.parse('2026-10-20T16:00:00Z');
const auth = () => ({
  getSnapshot: () => ({ status: 'authenticated' as const, label: 'Demo' }),
  unauthorized: vi.fn(),
});
function setup() {
  let now = time;
  const access = auth();
  return {
    client: createDemoHistoryClient({ auth: access, now: () => now, delay: 0 }),
    access,
    advance: () => {
      now += 60_000;
    },
  };
}
describe('fechas del rango, sin depender de la zona del navegador', () => {
  it('respeta medianoche de Bolivia y formatea BOB sin miles', () => {
    expect(boliviaDate(Date.parse('2026-10-20T03:59:59Z'))).toBe('2026-10-19');
    expect(boliviaDate(Date.parse('2026-10-20T04:00:00Z'))).toBe('2026-10-20');
    expect(formatTimestamp('2026-10-20T03:59:59Z')).toContain('19/10/2026');
    expect(formatTimestamp('2026-10-20T03:59:59Z')).toContain('23:59:59');
    expect(money(0)).toBe('BOB 0.0');
    expect(money(12005)).toBe('BOB 1200.5');
  });
  it.each([
    ['2026-01-01', '2025-12-01', '2025-12-31'],
    ['2024-03-15', '2024-02-01', '2024-02-29'],
    ['2026-03-01', '2026-02-01', '2026-02-28'],
    ['2026-05-01', '2026-04-01', '2026-04-30'],
  ])('mes anterior de %s', (date, startDate, endDate) => {
    expect(presetRange('last-month', date)).toEqual({ startDate, endDate });
  });
  it('hoy, siete días inclusivos y mes hasta hoy', () => {
    expect(presetRange('today', '2026-01-03')).toEqual({
      startDate: '2026-01-03',
      endDate: '2026-01-03',
    });
    expect(presetRange('last-seven', '2026-01-03')).toEqual({
      startDate: '2025-12-28',
      endDate: '2026-01-03',
    });
    expect(presetRange('this-month', '2026-01-03')).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-01-03',
    });
  });
  it('acepta 366 días y rechaza 367, futuro, rango inverso, incompleto o inexistente', () => {
    const valid = { startDate: '2024-01-01', endDate: '2024-12-31' };
    expect(validateRange(valid, '2026-10-20')).toBeNull();
    expect(
      validateRange({ ...valid, endDate: '2025-01-01' }, '2026-10-20'),
    ).toContain('366');
    expect(
      validateRange(
        { startDate: '2026-10-20', endDate: '2026-10-21' },
        '2026-10-20',
      ),
    ).toContain('futuras');
    expect(
      validateRange(
        { startDate: '2026-10-20', endDate: '2026-10-19' },
        '2026-10-20',
      ),
    ).toContain('posterior');
    for (const startDate of ['', '2026-02-30', 'bad'])
      expect(
        validateRange({ startDate, endDate: '2026-10-20' }, '2026-10-20'),
      ).toContain('válidas');
  });
});
describe('cliente de demostración: solo lectura con transporte HTTP compartido', () => {
  it('página de 50, cursor estable con empates, anterior y corte compartido', async () => {
    const { client, advance } = setup();
    const first = await client.read(null);
    expect(first.range).toEqual({
      startDate: '2026-10-20',
      endDate: '2026-10-20',
    });
    expect(first.currentDate).toBe('2026-10-20');
    expect(first.items).toHaveLength(50);
    expect(first.hasPrevious).toBe(false);
    expect(first.nextCursor).toBeTruthy();
    const second = await client.page(first, 'next');
    expect(second.items).toHaveLength(13);
    expect(second.hasPrevious).toBe(true);
    expect(second.nextCursor).toBeNull();
    expect(second.cutoffAt).toBe(first.cutoffAt);
    expect(second.reports).toEqual(first.reports);
    const ids = [...first.items, ...second.items].map((s) => s.saleRef);
    expect(new Set(ids).size).toBe(63);
    expect(
      [...first.items, ...second.items].every(
        (s) => boliviaDate(Date.parse(s.registeredAt)) === '2026-10-20',
      ),
    ).toBe(true);
    advance();
    const previous = await client.page(second, 'previous');
    expect(previous.items).toEqual(first.items);
    expect(previous.cutoffAt).toBe(first.cutoffAt);
    const refreshed = await client.read(first.range);
    expect(refreshed.pageNumber).toBe(1);
    expect(refreshed.cutoffAt).not.toBe(first.cutoffAt);
  });
  it('listado, detalle, resumen y ranking coherentes, con snapshots históricos e inactivos', async () => {
    const { client } = setup();
    const first = await client.read(null);
    const second = await client.page(first, 'next');
    const rows = [...first.items, ...second.items];
    const details = await Promise.all(
      rows.map((s) => client.detail(s.saleRef)),
    );
    for (const detail of details) {
      expect(detail.units).toBe(
        detail.lines.reduce((sum, line) => sum + line.quantity, 0),
      );
      expect(detail.totalTenths).toBe(
        detail.lines.reduce((sum, line) => sum + line.subtotalTenths, 0),
      );
    }
    expect(first.reports.kind).toBe('ready');
    if (first.reports.kind !== 'ready') throw new Error('Reports missing');
    const { summary, ranking } = first.reports;
    expect(summary.salesCount).toBe(rows.length);
    expect(summary.incomeTenths).toBe(
      rows.reduce((sum, s) => sum + s.totalTenths, 0),
    );
    expect(summary.cashIncomeTenths + summary.qrIncomeTenths).toBe(
      summary.incomeTenths,
    );
    expect(summary.averageTicketTenths).toBe(
      Math.floor(summary.incomeTenths / summary.salesCount + 0.5),
    );
    expect(ranking).toHaveLength(10);
    const espresso = ranking.find((p) => p.productRef === 'demo-product-0')!;
    expect(espresso.name).toBe('Espresso de la casa');
    const historical = await client.detail('demo-sale-0000');
    expect(historical.lines[0]!.name).toBe('Espresso');
    expect(demoProducts[3]!.active).toBe(false);
    expect(ranking.some((p) => p.productRef === 'demo-product-3')).toBe(true);
    const espressoLines = details
      .flatMap((d) => d.lines)
      .filter((l) => l.productRef === espresso.productRef);
    expect(espresso.units).toBe(
      espressoLines.reduce((n, l) => n + l.quantity, 0),
    );
    expect(espresso.incomeTenths).toBe(
      espressoLines.reduce((n, l) => n + l.subtotalTenths, 0),
    );
    expect(await client.detail('demo-sale-0000')).toEqual(historical);
  });
  it('vacío real o rango sin resultados no inventa promedio, y menos de diez productos', async () => {
    const { client } = setup();
    const none = await client.read({
      startDate: '2020-01-01',
      endDate: '2020-01-01',
    });
    expect(none.items).toEqual([]);
    expect(
      none.reports.kind === 'ready' && none.reports.summary.averageTicketTenths,
    ).toBeNull();
    const yesterday = await client.read({
      startDate: '2026-10-19',
      endDate: '2026-10-19',
    });
    expect(yesterday.items).toHaveLength(1);
    expect(
      yesterday.reports.kind === 'ready' && yesterday.reports.ranking.length,
    ).toBe(2);
    client.demo!.setScenario('empty');
    expect((await client.read(null)).items).toEqual([]);
  });
  it('errores diferenciados, reintento y validación de rango también en el servicio simulado', async () => {
    const { client } = setup();
    client.demo!.setScenario('query-error');
    await expect(client.read(null)).rejects.toMatchObject({
      code: 'CONNECTION',
    });
    client.demo!.setScenario('normal');
    const data = await client.read(null);
    expect(data.items.length).toBe(50);
    client.demo!.setScenario('report-error');
    const partial = await client.read(null);
    expect(partial.items).toHaveLength(50);
    expect(partial.reports.kind).toBe('error');
    client.demo!.setScenario('detail-error');
    await expect(client.detail(data.items[0]!.saleRef)).rejects.toMatchObject({
      code: 'QUERY',
    });
    client.demo!.setScenario('not-found');
    await expect(client.detail(data.items[0]!.saleRef)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    client.demo!.setScenario('normal');
    await expect(
      client.read({ startDate: '2026-10-21', endDate: '2026-10-21' }),
    ).rejects.toMatchObject({ code: 'INVALID_RANGE' });
    await expect(
      client.page({ ...data } as HistorySnapshot, 'next'),
    ).rejects.toMatchObject({ code: 'QUERY' });
  });
  it('abort y 401 no se convierten en resultados vacíos', async () => {
    const access = {
      getSnapshot: () => ({ status: 'anonymous' as const }),
      unauthorized: vi.fn(),
    };
    const client = createDemoHistoryClient({
      auth: access,
      now: () => time,
      delay: 0,
    });
    await expect(client.read(null)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(access.unauthorized).toHaveBeenCalledOnce();
    const controller = new AbortController();
    controller.abort();
    await expect(client.read(null, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
