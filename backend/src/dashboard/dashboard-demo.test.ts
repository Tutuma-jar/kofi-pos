import { afterEach, expect, test, vi } from 'vitest';
import { createDashboardDemo } from './dashboard-demo.js';

afterEach(() => {
  vi.useRealTimers();
});
test.each([
  '2026-10-19T16:30:00.000Z',
  '2026-11-01T04:00:00.000Z',
  '2028-02-29T18:00:00.000Z',
])('coherent demo today/month at %s, no future hours', async (instant) => {
  const clock = vi.fn(() => new Date(instant));
  const demo = createDashboardDemo(clock);
  const today = await demo.read('today');
  expect(clock).toHaveBeenCalledOnce();
  const month = await demo.read('month');
  expect(month.summary.salesCount).toBeGreaterThanOrEqual(
    today.summary.salesCount,
  );
  for (const snapshot of [today, month]) {
    expect(snapshot.hourlySales.map((row) => row.hour)).toEqual(
      Array.from({ length: 24 }, (_, i) => i),
    );
    expect(snapshot.hourlySales.reduce((n, row) => n + row.salesCount, 0)).toBe(
      snapshot.summary.salesCount,
    );
    expect(snapshot.products.reduce((n, row) => n + row.revenueTenths, 0)).toBe(
      snapshot.summary.revenueTenths,
    );
    expect(
      snapshot.summary.cashSalesCount + snapshot.summary.qrSalesCount,
    ).toBe(snapshot.summary.salesCount);
    expect(Number.isSafeInteger(snapshot.summary.revenueTenths)).toBe(true);
    expect(new Set(snapshot.products.map((row) => row.productId)).size).toBe(
      snapshot.products.length,
    );
  }
  const hour = Number(
    new Intl.DateTimeFormat('en', {
      timeZone: 'America/La_Paz',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(new Date(instant)),
  );
  expect(
    today.hourlySales.slice(hour + 1).every((row) => row.salesCount === 0),
  ).toBe(true);
  demo.advance();
  expect((await demo.read('today')).summary.salesCount).toBe(
    today.summary.salesCount + 1,
  );
});
test('explicit empty and error scenarios remain distinct', async () => {
  const empty = await createDashboardDemo(() => new Date(), 'empty').read(
    'today',
  );
  expect(empty.summary.salesCount).toBe(0);
  expect(empty.products).toEqual([]);
  expect(empty.hourlySales.every((row) => row.salesCount === 0)).toBe(true);
  await expect(
    createDashboardDemo(() => new Date(), 'error').read('today'),
  ).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
});
test('simulated notice every 15s only while observed; bounded state and shutdown cleanup', async () => {
  vi.useFakeTimers();
  const demo = createDashboardDemo(() => new Date('2026-10-19T16:00:00Z'));
  let observed = false;
  const notify = vi.fn(async () => {});
  demo.start(notify, () => observed);
  demo.start(notify, () => observed);
  await vi.advanceTimersByTimeAsync(15_000);
  expect(notify).not.toHaveBeenCalled();
  observed = true;
  await vi.advanceTimersByTimeAsync(30_000);
  expect(notify).toHaveBeenCalledTimes(2);
  expect((await demo.read('today')).summary.salesCount).toBe(10);
  for (let i = 0; i < 100; i++) demo.advance();
  expect((await demo.read('today')).summary.salesCount).toBe(40);
  demo.stop();
  expect(vi.getTimerCount()).toBe(0);
});
