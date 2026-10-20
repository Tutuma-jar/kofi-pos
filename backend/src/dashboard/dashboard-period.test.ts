import { expect, test } from 'vitest';
import { dashboardPeriod } from './dashboard-period.js';

test.each([
  [
    'today',
    '2026-10-20T03:59:59.999Z',
    '2026-10-19T04:00:00.000Z',
    '2026-10-20T04:00:00.000Z',
  ],
  [
    'today',
    '2026-10-20T04:00:00.000Z',
    '2026-10-20T04:00:00.000Z',
    '2026-10-21T04:00:00.000Z',
  ],
  [
    'month',
    '2026-11-01T03:59:59.999Z',
    '2026-10-01T04:00:00.000Z',
    '2026-11-01T04:00:00.000Z',
  ],
  [
    'month',
    '2027-01-01T04:00:00.000Z',
    '2027-01-01T04:00:00.000Z',
    '2027-02-01T04:00:00.000Z',
  ],
  [
    'today',
    '2026-12-31T20:00:00.000Z',
    '2026-12-31T04:00:00.000Z',
    '2027-01-01T04:00:00.000Z',
  ],
  [
    'month',
    '2028-02-29T18:00:00.000Z',
    '2028-02-01T04:00:00.000Z',
    '2028-03-01T04:00:00.000Z',
  ],
  [
    'today',
    '2028-02-29T18:00:00.000Z',
    '2028-02-29T04:00:00.000Z',
    '2028-03-01T04:00:00.000Z',
  ],
] as const)(
  '%s at %s has Bolivia civil boundaries',
  (period, instant, start, end) => {
    const now = new Date(instant);
    const result = dashboardPeriod(period, now);
    expect(result.start.toISOString()).toBe(start);
    expect(result.end.toISOString()).toBe(end);
    expect(result.cutoff).toBe(now);
  },
);
