import type { AuthClient } from '../../auth/api/contract.provisional';
import { createHttpClient } from '../../auth/api/http-client';
import { HistoryError } from './contract.provisional';
import type {
  DateRange,
  DemoScenario,
  HistoryClient,
  HistoryResponse,
  HistorySnapshot,
  PeriodSummary,
  RankedProduct,
  SaleDetail,
} from './contract.provisional';
import { boliviaDate, presetRange, sameRange, validateRange } from './dates';
import { createSalesFixture, demoProducts } from './fixtures';

type ReadInput = {
  operation: 'read';
  range: DateRange | null;
  cursor?: string | null;
  cutoffAt?: string;
};
type DemoInput = ReadInput | { operation: 'detail'; saleRef: string };
type Cursor = {
  cutoffAt: string;
  range: DateRange;
  registeredAt: string;
  saleRef: string;
};
type Trail = { cursors: (string | null)[]; index: number };

/** Transport local en memoria: ninguna llamada fetch, MongoDB, escritura o endpoint real.
 * Los cálculos aquí SOLO representan respuestas del futuro servidor.
 */
export function createDemoHistoryClient(options: {
  auth: Pick<AuthClient, 'getSnapshot' | 'unauthorized'>;
  now?: () => number;
  delay?: number;
}): HistoryClient {
  const now = options.now ?? Date.now;
  const sales = createSalesFixture(now());
  let scenario: DemoScenario = 'normal';
  const cursors = new Map<string, Cursor>();
  const trails = new WeakMap<HistorySnapshot, Trail>();
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  const failure = (code: string, message: string, status: number) =>
    json({ error: { code, message } }, status);
  const request = createHttpClient(async (_url, init) => {
    const captured = scenario;
    await new Promise<void>((resolve, reject) => {
      const signal = init?.signal;
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      const timer = setTimeout(
        () => {
          signal?.removeEventListener('abort', abort);
          resolve();
        },
        captured === 'slow' ? 2000 : (options.delay ?? 350),
      );
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
    });
    if (options.auth.getSnapshot().status !== 'authenticated')
      return failure('UNAUTHORIZED', 'Acceso requerido', 401);
    const input = JSON.parse(String(init?.body)) as DemoInput;
    if (captured === 'query-error')
      throw new TypeError('Simulated connection failure');
    if (input.operation === 'detail') {
      if (captured === 'detail-error')
        return failure('QUERY', 'Detalle no disponible', 503);
      const detail =
        captured === 'not-found'
          ? undefined
          : sales.find((s) => s.saleRef === input.saleRef);
      return detail
        ? json(detail)
        : failure('NOT_FOUND', 'Venta no encontrada', 404);
    }
    const currentDate = boliviaDate(now());
    const range = input.range ?? presetRange('today', currentDate);
    const validation = validateRange(range, currentDate);
    if (validation) return failure('INVALID_RANGE', validation, 400);
    const cursor = input.cursor ? cursors.get(input.cursor) : null;
    if (input.cursor && (!cursor || !sameRange(cursor.range, range)))
      return failure('QUERY', 'Cursor inválido', 400);
    const cutoffAt =
      cursor?.cutoffAt ?? input.cutoffAt ?? new Date(now()).toISOString();
    const filtered = (captured === 'empty' ? [] : sales)
      .filter((s) => {
        const date = boliviaDate(Date.parse(s.registeredAt));
        return (
          date >= range.startDate &&
          date <= range.endDate &&
          s.registeredAt <= cutoffAt
        );
      })
      .sort(
        (a, b) =>
          b.registeredAt.localeCompare(a.registeredAt) ||
          b.saleRef.localeCompare(a.saleRef),
      );
    const remaining = cursor
      ? filtered.filter(
          (s) =>
            s.registeredAt < cursor.registeredAt ||
            (s.registeredAt === cursor.registeredAt &&
              s.saleRef < cursor.saleRef),
        )
      : filtered;
    const items = remaining
      .slice(0, 50)
      .map(({ saleRef, registeredAt, units, paymentMethod, totalTenths }) => ({
        saleRef,
        registeredAt,
        units,
        paymentMethod,
        totalTenths,
      }));
    let nextCursor: string | null = null;
    const last = items.at(-1);
    if (remaining.length > 50 && last) {
      nextCursor = crypto.randomUUID();
      cursors.set(nextCursor, {
        cutoffAt,
        range,
        registeredAt: last.registeredAt,
        saleRef: last.saleRef,
      });
    }
    const summary: PeriodSummary = {
      salesCount: filtered.length,
      incomeTenths: 0,
      cashIncomeTenths: 0,
      qrIncomeTenths: 0,
      averageTicketTenths: null,
    };
    const ranked = new Map<string, RankedProduct>();
    for (const sale of filtered) {
      summary.incomeTenths += sale.totalTenths;
      if (sale.paymentMethod === 'cash')
        summary.cashIncomeTenths += sale.totalTenths;
      else summary.qrIncomeTenths += sale.totalTenths;
      for (const line of sale.lines) {
        const current = ranked.get(line.productRef) ?? {
          productRef: line.productRef,
          name: demoProducts[Number(line.productRef.split('-').at(-1))]!.name,
          units: 0,
          incomeTenths: 0,
        };
        current.units += line.quantity;
        current.incomeTenths += line.subtotalTenths;
        ranked.set(line.productRef, current);
      }
    }
    if (summary.salesCount)
      summary.averageTicketTenths = Math.floor(
        summary.incomeTenths / summary.salesCount + 0.5,
      );
    const ranking = [...ranked.values()]
      .sort(
        (a, b) =>
          b.units - a.units ||
          b.incomeTenths - a.incomeTenths ||
          a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
      )
      .slice(0, 10);
    const response: HistoryResponse = {
      range,
      currentDate,
      items,
      pageSize: 50,
      cutoffAt,
      nextCursor,
      reports:
        captured === 'report-error'
          ? {
              kind: 'error',
              message:
                'No pudimos generar los reportes del rango. Reintenta la consulta.',
            }
          : { kind: 'ready', summary, ranking },
    };
    return json(response);
  }, options.auth.unauthorized);
  async function call<T>(input: DemoInput, signal?: AbortSignal): Promise<T> {
    // Dirección simbólica consumida SOLO por el transport anterior, no una ruta propuesta.
    const result = await request<T>('https://kofi-demo.invalid/history', {
      method: 'POST',
      body: JSON.stringify(input),
      ...(signal ? { signal } : {}),
    });
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (result.kind === 'ok') return result.data;
    if (result.kind === 'unauthorized')
      throw new HistoryError(
        'UNAUTHORIZED',
        'La sesión ya no está disponible.',
      );
    if (result.kind === 'connection')
      throw new HistoryError(
        'CONNECTION',
        'No pudimos conectar para consultar las ventas.',
      );
    if (result.code === 'NOT_FOUND')
      throw new HistoryError(
        'NOT_FOUND',
        'No se encontró la venta. Vuelve al historial y actualiza la consulta.',
      );
    throw new HistoryError(
      result.code === 'INVALID_RANGE' ? 'INVALID_RANGE' : 'QUERY',
      'No pudimos completar la consulta. Reintenta.',
    );
  }
  async function read(input: ReadInput, trail: Trail, signal?: AbortSignal) {
    const data = await call<HistoryResponse>(input, signal);
    const snapshot: HistorySnapshot = {
      ...data,
      hasPrevious: trail.index > 0,
      pageNumber: trail.index + 1,
    };
    trails.set(snapshot, trail);
    return snapshot;
  }
  return {
    read: (range, signal) =>
      read({ operation: 'read', range }, { cursors: [null], index: 0 }, signal),
    page: (snapshot, direction, signal) => {
      const trail = trails.get(snapshot);
      if (!trail)
        return Promise.reject(
          new HistoryError(
            'QUERY',
            'Actualiza el historial para volver a consultar.',
          ),
        );
      const index = trail.index + (direction === 'next' ? 1 : -1);
      const cursor =
        direction === 'next' ? snapshot.nextCursor : trail.cursors[index];
      if (index < 0 || (direction === 'next' && !cursor))
        return Promise.reject(
          new HistoryError('QUERY', 'No hay otra página disponible.'),
        );
      const nextTrail = {
        cursors: [...trail.cursors.slice(0, index), cursor ?? null],
        index,
      };
      return read(
        {
          operation: 'read',
          range: snapshot.range,
          cursor: cursor ?? null,
          cutoffAt: snapshot.cutoffAt,
        },
        nextTrail,
        signal,
      );
    },
    detail: (saleRef, signal) =>
      call<SaleDetail>({ operation: 'detail', saleRef }, signal),
    demo: {
      setScenario: (value) => {
        scenario = value;
      },
    },
  };
}
