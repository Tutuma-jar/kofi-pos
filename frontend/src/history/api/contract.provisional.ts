/** Supuestos de UI para US-014..017, NO contrato HTTP aprobado.
 * Rango, importes, corte, orden y cursor respetan las decisiones aprobadas.
 * Solo la capa api simula agregaciones y paginación; la UI consume resultados.
 * TASK-033..036 deberán aprobar rutas/DTO/códigos antes de conectar la API real.
 */
export type DateRange = { startDate: string; endDate: string };
export type Preset = 'today' | 'last-seven' | 'this-month' | 'last-month';
export type SaleRow = {
  saleRef: string; // Referencia opaca interna; nunca número visible de venta.
  registeredAt: string;
  units: number;
  paymentMethod: 'cash' | 'qr';
  totalTenths: number;
};
export type SaleLine = {
  productRef: string;
  name: string;
  unitPriceTenths: number;
  quantity: number;
  subtotalTenths: number;
};
export type SaleDetail = SaleRow & { lines: SaleLine[] };
export type PeriodSummary = {
  salesCount: number;
  incomeTenths: number;
  cashIncomeTenths: number;
  qrIncomeTenths: number;
  averageTicketTenths: number | null;
};
export type RankedProduct = {
  productRef: string;
  name: string;
  units: number;
  incomeTenths: number;
};
export type Reports =
  | { kind: 'ready'; summary: PeriodSummary; ranking: RankedProduct[] }
  | { kind: 'error'; message: string };
export type HistoryResponse = {
  range: DateRange;
  currentDate: string;
  items: SaleRow[];
  pageSize: 50;
  cutoffAt: string;
  nextCursor: string | null;
  reports: Reports;
};
export type HistorySnapshot = HistoryResponse & {
  hasPrevious: boolean;
  pageNumber: number;
};
export type DemoScenario =
  | 'normal'
  | 'slow'
  | 'empty'
  | 'query-error'
  | 'report-error'
  | 'detail-error'
  | 'not-found';
export type HistoryClient = {
  /** null pide Hoy según el reloj del servicio, no el del navegador. */
  read: (
    range: DateRange | null,
    signal?: AbortSignal,
  ) => Promise<HistorySnapshot>;
  /** Los cursores anteriores permanecen dentro de api/, no en componentes. */
  page: (
    snapshot: HistorySnapshot,
    direction: 'next' | 'previous',
    signal?: AbortSignal,
  ) => Promise<HistorySnapshot>;
  detail: (saleRef: string, signal?: AbortSignal) => Promise<SaleDetail>;
  demo?: { setScenario: (scenario: DemoScenario) => void };
};
export class HistoryError extends Error {
  constructor(
    public code:
      'CONNECTION' | 'QUERY' | 'INVALID_RANGE' | 'NOT_FOUND' | 'UNAUTHORIZED',
    message: string,
  ) {
    super(message);
  }
}
