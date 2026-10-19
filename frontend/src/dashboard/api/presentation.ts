import type { DashboardPeriod } from './contract.provisional';

const zone = 'America/La_Paz';
const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: zone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});
const clockFormatter = new Intl.DateTimeFormat('es-BO', {
  timeZone: zone,
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
export function boliviaTime(now: number) {
  const parts = partsFormatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((entry) => entry.type === type)?.value);
  const year = part('year');
  const month = part('month');
  const day = part('day');
  return {
    year,
    month,
    day,
    hour: part('hour'),
    dayKey: `${year}-${month}-${day}`,
  };
}
export function periodEndsAt(period: DashboardPeriod, now: number) {
  const { year, month, day } = boliviaTime(now);
  // Bolivia is UTC-04, without daylight-saving transitions. No browser zone.
  return new Date(
    period === 'today'
      ? Date.UTC(year, month - 1, day + 1, 4)
      : Date.UTC(year, month, 1, 4),
  ).toISOString();
}
export function periodLabel(period: DashboardPeriod, endsAt: string) {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: zone,
    ...(period === 'today' ? { day: 'numeric' as const } : {}),
    month: 'long',
    year: 'numeric',
  }).format(Date.parse(endsAt) - 1);
}
export function clockLabel(now: number) {
  return `${clockFormatter.format(now)} · Bolivia`;
}
export function money(tenths: number) {
  // Exact decimal presentation, not a monetary calculation or locale rounding.
  const digits = String(tenths).padStart(2, '0');
  return `BOB ${digits.slice(0, -1)}.${digits.slice(-1)}`;
}
export function hourLabel(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}
