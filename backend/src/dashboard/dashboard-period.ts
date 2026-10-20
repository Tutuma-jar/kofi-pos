import type { DashboardPeriod } from './dashboard.contract.js';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/La_Paz',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function dashboardPeriod(period: DashboardPeriod, now: Date) {
  const parts = formatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((value) => value.type === type)?.value);
  const year = part('year');
  const month = part('month');
  const day = part('day');
  // Modern Bolivia is UTC-04 without DST; civil parts always come from IANA.
  const start = new Date(
    Date.UTC(year, month - 1, period === 'today' ? day : 1, 4),
  );
  const end = new Date(
    period === 'today'
      ? Date.UTC(year, month - 1, day + 1, 4)
      : Date.UTC(year, month, 1, 4),
  );
  return { start, end, cutoff: now };
}
