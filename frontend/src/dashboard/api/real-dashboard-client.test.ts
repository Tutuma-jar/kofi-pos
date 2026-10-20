import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { AuthClient } from '../../auth/api/contract.provisional';
import { BASE_TIME, fixture } from './fixtures';
import {
  createRealDashboardClient,
  validDashboardResponse,
  type DashboardTransport,
} from './real-dashboard-client';

const stops: (() => void)[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE_TIME);
});
afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  vi.useRealTimers();
});
const data = (period: 'today' | 'month' = 'today') =>
  fixture(period, Date.now(), {
    mode: 'normal',
    updated: false,
    renamed: false,
  });
const flush = async () => {
  for (let i = 0; i < 15; i++) await Promise.resolve();
};

test('validates full DTO, integer limits, identities, 24-hour sequence and coherent totals', () => {
  expect(validDashboardResponse(data(), 'today')).toBe(true);
  expect(validDashboardResponse(data(), 'month')).toBe(false);
  const mutations = [
    (value: ReturnType<typeof data>) => {
      value.hourlySales.pop();
    },
    (value: ReturnType<typeof data>) => {
      value.hourlySales[0]!.hour = 1;
    },
    (value: ReturnType<typeof data>) => {
      value.summary.revenueTenths = Number.MAX_SAFE_INTEGER + 1;
    },
    (value: ReturnType<typeof data>) => {
      value.summary.salesCount++;
    },
    (value: ReturnType<typeof data>) => {
      value.products[0]!.productId = 'bad';
    },
    (value: ReturnType<typeof data>) => {
      value.products[0]!.unitsSold = 0.5;
    },
    (value: ReturnType<typeof data>) => {
      value.products.push(value.products[0]!);
    },
  ];
  for (const mutate of mutations) {
    const value = data();
    mutate(value);
    expect(validDashboardResponse(value, 'today')).toBe(false);
  }
});

function harness() {
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  const cancelled = vi.fn();
  const events = new EventTarget();
  const auth = {
    request: vi.fn<NonNullable<DashboardTransport['request']>>(
      async (path) => ({
        kind: 'ok',
        data: data(String(path).endsWith('month') ? 'month' : 'today'),
      }),
    ),
    openStream: vi.fn<NonNullable<AuthClient['openStream']>>(async () => ({
      kind: 'ok',
      data: new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            stream = controller;
          },
          cancel: cancelled,
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      ),
    })),
  };
  const client = createRealDashboardClient(auth, { random: () => 0, events });
  const stop = client.start();
  stops.push(stop);
  return {
    auth,
    client,
    events,
    cancelled,
    stop,
    send: (text: string) => stream.enqueue(new TextEncoder().encode(text)),
    eof: () => stream.close(),
  };
}
test('real adapter reads HTTP, groups invalidations, updates all blocks and preserves selected period', async () => {
  const h = harness();
  await flush();
  expect(h.auth.request).toHaveBeenCalledWith(
    '/api/dashboard-periods/today',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(h.client.getSnapshot().data).toEqual(data());
  h.send('event: sales-changed\ndata: {}\n\n');
  await flush();
  expect(h.client.getSnapshot().data).toEqual(data());
  h.client.selectPeriod('month');
  await flush();
  expect(h.client.getSnapshot().data).toEqual(data('month'));
  expect(h.auth.openStream).toHaveBeenCalledWith(
    '/api/dashboard-events',
    expect.objectContaining({ headers: { Accept: 'text/event-stream' } }),
  );
});
test('EOF reconnects, reconciliation covers a lost notice, silence aborts stream and resume reads', async () => {
  const h = harness();
  await flush();
  h.eof();
  await flush();
  await vi.advanceTimersByTimeAsync(1);
  await flush();
  expect(h.auth.openStream).toHaveBeenCalledTimes(2);
  const previous = h.auth.request.mock.calls.length;
  await vi.advanceTimersByTimeAsync(30_000);
  await flush();
  expect(h.auth.request.mock.calls.length).toBeGreaterThan(previous);
  h.send(': heartbeat\n\n');
  await flush();
  await vi.advanceTimersByTimeAsync(59_000);
  expect(h.auth.openStream).toHaveBeenCalledTimes(2);
  // Heartbeat arrived at t=30001ms, so t=90000 is only 59999ms silent.
  // The t=91000 tick is the first one at/after the approved 60-second limit.
  await vi.advanceTimersByTimeAsync(2000);
  await flush();
  expect(h.auth.openStream).toHaveBeenCalledTimes(3);
  expect(h.cancelled).toHaveBeenCalled();
  const count = h.auth.request.mock.calls.length;
  h.events.dispatchEvent(new Event('focus'));
  await flush();
  expect(h.auth.request.mock.calls.length).toBeGreaterThan(count);
});
test('unauthorized stream stops reads, retries, subscriptions and timers', async () => {
  const h = harness();
  await flush();
  h.auth.openStream.mockResolvedValue({ kind: 'unauthorized' });
  h.eof();
  await flush();
  await vi.advanceTimersByTimeAsync(1);
  await flush();
  expect(h.client.getSnapshot().phase).toBe('unauthorized');
  const count = h.auth.openStream.mock.calls.length;
  await vi.advanceTimersByTimeAsync(120_000);
  expect(h.auth.openStream).toHaveBeenCalledTimes(count);
  expect(vi.getTimerCount()).toBe(0);
});
test('superseded session response does not end a later session; bad DTO never becomes empty', async () => {
  const h = harness();
  await flush();
  h.auth.request.mockResolvedValueOnce({
    kind: 'error',
    status: 0,
    code: 'REQUEST_SUPERSEDED',
  });
  h.client.refresh();
  await flush();
  expect(h.client.getSnapshot().phase).not.toBe('unauthorized');
  h.auth.request.mockResolvedValueOnce({
    kind: 'ok',
    data: { ...data(), hourlySales: [] },
  });
  h.client.refresh();
  await flush();
  expect(h.client.getSnapshot().stale).toBe(true);
  expect(h.client.getSnapshot().data?.summary.salesCount).toBeGreaterThan(0);
});
test('unmount aborts pending reads/stream and removes resume listeners', async () => {
  const h = harness();
  await flush();
  h.stop();
  stops.pop();
  await flush();
  const calls = h.auth.request.mock.calls.length;
  h.events.dispatchEvent(new Event('focus'));
  await vi.advanceTimersByTimeAsync(120_000);
  expect(h.auth.request).toHaveBeenCalledTimes(calls);
  expect(h.auth.openStream.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

test('demo indication comes from the real backend header, without changing the JSON contract', async () => {
  const h = harness();
  await flush();
  h.auth.request.mockResolvedValueOnce({
    kind: 'ok',
    data: data(),
    headers: new Headers({ 'X-Kofi-Dashboard-Mode': 'demo' }),
  });
  h.client.refresh();
  await flush();
  expect(h.client.getSnapshot().demonstration).toBe(true);
  expect(h.client.getSnapshot().data).toEqual(data());
  h.client.refresh();
  await flush();
  expect(h.client.getSnapshot().demonstration).toBe(false);
});
