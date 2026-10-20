import type { DateRange, Preset } from './contract.provisional';

const dayMs = 86_400_000;
export function boliviaDate(now: number) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
const dateMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
export const shiftDate = (date: string, days: number) =>
  new Date(dateMs(date) + days * dayMs).toISOString().slice(0, 10);
export function presetRange(preset: Preset, currentDate: string): DateRange {
  const first = `${currentDate.slice(0, 7)}-01`;
  if (preset === 'last-seven')
    return { startDate: shiftDate(currentDate, -6), endDate: currentDate };
  if (preset === 'this-month')
    return { startDate: first, endDate: currentDate };
  if (preset === 'last-month') {
    const endDate = shiftDate(first, -1);
    return { startDate: `${endDate.slice(0, 7)}-01`, endDate };
  }
  return { startDate: currentDate, endDate: currentDate };
}
export function validateRange(
  range: DateRange,
  currentDate: string,
): string | null {
  for (const date of [range.startDate, range.endDate]) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(dateMs(date)) ||
      new Date(dateMs(date)).toISOString().slice(0, 10) !== date
    )
      return 'Elige una fecha de inicio y una fecha de fin válidas.';
  }
  if (range.startDate > range.endDate)
    return 'La fecha de inicio no puede ser posterior a la fecha de fin.';
  if (range.endDate > currentDate)
    return 'No se pueden consultar fechas futuras en Bolivia.';
  if ((dateMs(range.endDate) - dateMs(range.startDate)) / dayMs + 1 > 366)
    return 'El rango puede abarcar como máximo 366 días, incluyendo inicio y fin.';
  return null;
}
export const sameRange = (a: DateRange, b: DateRange) =>
  a.startDate === b.startDate && a.endDate === b.endDate;
export const formatDate = (date: string) =>
  `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
export const formatRange = (range: DateRange) =>
  range.startDate === range.endDate
    ? formatDate(range.startDate)
    : `${formatDate(range.startDate)} – ${formatDate(range.endDate)}`;
const timestamp = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'America/La_Paz',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
export const formatTimestamp = (at: string) => timestamp.format(new Date(at));
export const money = (tenths: number) => {
  const digits = String(tenths).padStart(2, '0');
  return `BOB ${digits.slice(0, -1)}.${digits.slice(-1)}`;
};
export const paymentLabel = (method: 'cash' | 'qr') =>
  method === 'cash' ? 'Efectivo' : 'QR';
