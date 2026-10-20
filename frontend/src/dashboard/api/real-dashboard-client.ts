import type {
  AuthClient,
  HttpResult,
} from '../../auth/api/contract.provisional';
import type {
  DashboardEvent,
  DashboardPeriod,
  DashboardResponse,
  ReadResult,
} from './contract.provisional';
import { createDashboardClient } from './dashboard-client';
import { createSseParser } from './sse-parser';

const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export function validDashboardResponse(
  value: unknown,
  period: DashboardPeriod,
): value is DashboardResponse {
  if (
    !record(value) ||
    value.period !== period ||
    typeof value.periodEndsAt !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.periodEndsAt) ||
    !Number.isFinite(Date.parse(value.periodEndsAt))
  )
    return false;
  const s = value.summary;
  if (
    !record(s) ||
    !['salesCount', 'revenueTenths', 'cashSalesCount', 'qrSalesCount'].every(
      (key) => integer(s[key]),
    )
  )
    return false;
  if (
    !Array.isArray(value.products) ||
    !Array.isArray(value.hourlySales) ||
    value.hourlySales.length !== 24
  )
    return false;
  const ids = new Set<string>();
  let productRevenue = 0n;
  for (const product of value.products) {
    if (
      !record(product) ||
      typeof product.productId !== 'string' ||
      !/^[a-f0-9]{24}$/.test(product.productId) ||
      ids.has(product.productId) ||
      typeof product.currentName !== 'string' ||
      !product.currentName.trim() ||
      !integer(product.unitsSold) ||
      product.unitsSold === 0 ||
      !integer(product.revenueTenths) ||
      product.revenueTenths === 0
    )
      return false;
    ids.add(product.productId);
    productRevenue += BigInt(product.revenueTenths);
  }
  let hourlyCount = 0n;
  for (const [hour, entry] of value.hourlySales.entries()) {
    if (!record(entry) || entry.hour !== hour || !integer(entry.salesCount))
      return false;
    hourlyCount += BigInt(entry.salesCount);
  }
  return (
    BigInt(s.cashSalesCount as number) + BigInt(s.qrSalesCount as number) ===
      BigInt(s.salesCount as number) &&
    productRevenue === BigInt(s.revenueTenths as number) &&
    hourlyCount === BigInt(s.salesCount as number) &&
    (s.salesCount === 0) === (value.products.length === 0)
  );
}

export type DashboardTransport = {
  request?: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<HttpResult<unknown>>;
  openStream?: AuthClient['openStream'];
};
export function createRealDashboardClient(
  auth: DashboardTransport,
  options: {
    now?: () => number;
    random?: () => number;
    events?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  } = {},
) {
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const browserEvents =
    options.events ?? (typeof window === 'undefined' ? undefined : window);
  let listener: ((event: DashboardEvent) => void) | undefined;
  let revision = 0;
  let attempt = 0;
  let controller: AbortController | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const reads = new Set<AbortController>();
  const emit = (event: DashboardEvent) => listener?.(event);
  function stopStream() {
    revision++;
    controller?.abort();
    controller = undefined;
    clearTimeout(retry);
    retry = undefined;
  }
  function connect() {
    stopStream();
    if (!listener || !auth.openStream) return;
    const current = revision;
    const abort = new AbortController();
    controller = abort;
    const opening = setTimeout(() => abort.abort(), 15_000);
    void (async () => {
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let unauthorized = false;
      const cancelReader = () => {
        void reader?.cancel().catch(() => {});
      };
      try {
        const result = await auth.openStream!('/api/dashboard-events', {
          headers: { Accept: 'text/event-stream' },
          signal: abort.signal,
        });
        clearTimeout(opening);
        if (current !== revision || !listener) {
          if (result.kind === 'ok') await result.data.body?.cancel();
          return;
        }
        if (result.kind === 'unauthorized') {
          unauthorized = true;
          emit({ type: 'unauthorized' });
          return;
        }
        if (
          result.kind !== 'ok' ||
          result.data.headers
            .get('Content-Type')
            ?.split(';')[0]
            ?.trim()
            .toLowerCase() !== 'text/event-stream' ||
          !result.data.body
        )
          throw new Error('Stream unavailable');
        emit({ type: 'open' });
        const parser = createSseParser(
          () => emit({ type: 'sales-changed', data: {} }),
          () => {
            attempt = 0;
            emit({ type: 'heartbeat' });
          },
        );
        reader = result.data.body.getReader();
        abort.signal.addEventListener('abort', cancelReader, { once: true });
        while (current === revision && listener) {
          const chunk = await reader.read();
          if (current !== revision || !listener) break;
          if (chunk.done) break;
          parser.push(chunk.value);
        }
      } catch {
        /* EOF, invalid frames and network errors all reconcile on reconnect. */
      } finally {
        clearTimeout(opening);
        abort.signal.removeEventListener('abort', cancelReader);
        try {
          await reader?.cancel();
        } catch {
          /* Already closed. */
        }
        reader?.releaseLock();
        if (current === revision && !unauthorized) {
          // Schedule before emitting closed; client does not recursively reconnect.
          const delay =
            attempt++ === 0
              ? 0
              : Math.min(10_000, 500 * 2 ** Math.min(attempt - 2, 5)) *
                (0.8 + random() * 0.2);
          retry = setTimeout(connect, delay);
          emit({ type: 'closed' });
        }
      }
    })();
  }
  const client = createDashboardClient({
    now,
    async read(period): Promise<ReadResult> {
      if (!auth.request) return { kind: 'connection' };
      const abort = new AbortController();
      reads.add(abort);
      const timeout = setTimeout(() => abort.abort(), 15_000);
      try {
        const result = await auth.request(`/api/dashboard-periods/${period}`, {
          signal: abort.signal,
        });
        if (
          result.kind === 'ok' &&
          validDashboardResponse(result.data, period)
        ) {
          if (!abort.signal.aborted)
            emit({
              type: 'source',
              demonstration:
                result.headers?.get('X-Kofi-Dashboard-Mode') === 'demo',
            });
          return { kind: 'ok', data: result.data };
        }
        if (result.kind === 'connection') return result;
        if (result.kind === 'error' && result.code === 'REQUEST_SUPERSEDED')
          return { kind: 'superseded' };
        const status =
          result.kind === 'unauthorized'
            ? 401
            : result.kind === 'error' && result.status === 400
              ? 400
              : 500;
        return {
          kind: 'error',
          status,
          body: {
            error: {
              code:
                status === 401
                  ? 'UNAUTHORIZED'
                  : status === 400
                    ? 'VALIDATION_ERROR'
                    : 'INTERNAL_ERROR',
              message: 'No se pudo confirmar el Dashboard.',
            },
          },
        };
      } finally {
        clearTimeout(timeout);
        reads.delete(abort);
      }
    },
    subscribe(fn) {
      listener = fn;
      attempt = 0;
      const resume = () => {
        emit({ type: 'clock' });
        emit({ type: 'open' });
        connect();
      };
      browserEvents?.addEventListener('pageshow', resume);
      browserEvents?.addEventListener('online', resume);
      browserEvents?.addEventListener('focus', resume);
      browserEvents?.addEventListener('resume', resume);
      connect();
      return () => {
        listener = undefined;
        stopStream();
        reads.forEach((read) => read.abort());
        reads.clear();
        browserEvents?.removeEventListener('pageshow', resume);
        browserEvents?.removeEventListener('online', resume);
        browserEvents?.removeEventListener('focus', resume);
        browserEvents?.removeEventListener('resume', resume);
      };
    },
    reconnect: connect,
  });
  return client;
}
