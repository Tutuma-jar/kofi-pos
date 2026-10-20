/** HTTP DTO: approved US-003 contract, shared by US-004 and US-005.
 * Only the in-memory client/scenario interfaces below are provisional.
 * No backend, real stream, credentials, aggregation or business ordering here.
 */
export type DashboardPeriod = 'today' | 'month';
export type DashboardResponse = {
  period: DashboardPeriod;
  periodEndsAt: string;
  summary: {
    salesCount: number;
    revenueTenths: number;
    cashSalesCount: number;
    qrSalesCount: number;
  };
  products: {
    productId: string;
    currentName: string;
    unitsSold: number;
    revenueTenths: number;
  }[];
  hourlySales: { hour: number; salesCount: number }[];
};
export type DashboardError = {
  error: {
    code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'INTERNAL_ERROR';
    message: string;
    details?: { fields: { field: string; code: string }[] };
  };
};
export type ReadResult =
  | { kind: 'superseded' }
  | { kind: 'ok'; data: DashboardResponse }
  | { kind: 'error'; status: 400 | 401 | 500; body: DashboardError }
  | { kind: 'connection' };
export type DashboardEvent =
  | { type: 'source'; demonstration: boolean }
  | { type: 'sales-changed'; data: Record<string, never> }
  | { type: 'heartbeat' | 'open' | 'closed' | 'unauthorized' | 'clock' };
export type DashboardPort = {
  read: (period: DashboardPeriod) => Promise<ReadResult>;
  subscribe: (listener: (event: DashboardEvent) => void) => () => void;
  reconnect: () => void;
  now: () => number;
  description?: () => string;
};
export type DashboardSnapshot = {
  demonstration: boolean;
  period: DashboardPeriod;
  phase: 'loading' | 'ready' | 'error' | 'unauthorized';
  data: DashboardResponse | null;
  refreshing: boolean;
  stale: boolean;
  error: 'connection' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR' | null;
  stream: 'connected' | 'reconnecting';
  currentHour: number;
  drawnThroughHour: number;
  clockLabel: string;
  dataLabel: string;
  demoDescription: string;
};
export type DemoScenario =
  | 'normal'
  | 'slow'
  | 'empty'
  | 'many'
  | 'large'
  | 'decimal'
  | 'zero'
  | 'sale'
  | 'repeat'
  | 'burst'
  | 'missed'
  | 'rename'
  | 'inactive'
  | 'initial-error'
  | 'refresh-error'
  | 'network'
  | 'validation'
  | 'recover'
  | 'disconnect'
  | 'reconnect'
  | 'silence'
  | 'hour'
  | 'midnight'
  | 'month-end'
  | 'race'
  | 'late-failure'
  | 'unauthorized-read'
  | 'unauthorized-stream';
export type DashboardClient = {
  getSnapshot: () => DashboardSnapshot;
  subscribe: (listener: () => void) => () => void;
  start: () => () => void;
  selectPeriod: (period: DashboardPeriod) => void;
  refresh: () => void;
  reset: () => void;
  demo?: { run: (scenario: DemoScenario) => void };
};
