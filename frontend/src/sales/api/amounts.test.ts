import { describe, expect, it } from 'vitest';
import {
  assertRequestSize,
  calculateAmounts,
  formatMoney,
  MAX_BODY_BYTES,
} from './amounts';
import { catalogFixture } from './fixtures';
const line = (priceTenths: number, quantity: number) => ({
  product: { ...catalogFixture.products[0]!, priceTenths },
  quantity,
});
describe('Importes simulados US-011', () => {
  it('calcula décimas exactas, sin redondear, y formatea con un decimal', () => {
    expect(calculateAmounts([line(125, 3), line(100, 2)])).toEqual({
      subtotals: [375, 200],
      totalTenths: 575,
    });
    expect(formatMoney(575)).toBe('BOB 57.5');
    expect(formatMoney(0)).toBe('BOB 0.0');
    expect(calculateAmounts([]).totalTenths).toBe(0);
  });
  it.each([0, -1, 1.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rechaza cantidad %s',
    (quantity) =>
      expect(() => calculateAmounts([line(10, quantity)])).toThrow(),
  );
  it('acepta el límite exacto y rechaza producto y suma fuera de rango', () => {
    const max = Number.MAX_SAFE_INTEGER;
    expect(calculateAmounts([line(1, max)]).totalTenths).toBe(max);
    expect(calculateAmounts([line(max, 1)]).totalTenths).toBe(max);
    expect(formatMoney(max)).toBe('BOB 900719925474099.1');
    expect(() => calculateAmounts([line(max, 2)])).toThrow();
    expect(() => calculateAmounts([line(max, 1), line(1, 1)])).toThrow();
  });
  it('comprueba los 100 KB en bytes UTF-8 sin procesar parcialmente', () => {
    expect(() =>
      assertRequestSize('x'.repeat(MAX_BODY_BYTES - 2)),
    ).not.toThrow();
    expect(() => assertRequestSize('x'.repeat(MAX_BODY_BYTES - 1))).toThrow();
    expect(() => assertRequestSize('é'.repeat(MAX_BODY_BYTES / 2))).toThrow();
  });
});
