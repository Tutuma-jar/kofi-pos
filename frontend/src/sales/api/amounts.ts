import { SalesError, type Line } from './contract.provisional';

export const MAX_BODY_BYTES = 100 * 1024;
const limit = BigInt(Number.MAX_SAFE_INTEGER);
export function assertRequestSize(value: unknown) {
  if (
    new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_BODY_BYTES
  )
    throw new SalesError(
      'validation',
      'La solicitud supera el límite técnico de 100 KB. Reduce la selección.',
    );
}
export function calculateAmounts(lines: Line[]) {
  let total = 0n;
  const subtotals = lines.map(({ product, quantity }) => {
    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      !Number.isSafeInteger(product.priceTenths) ||
      product.priceTenths < 1
    )
      throw new SalesError(
        'validation',
        'Escribe una cantidad entera positiva dentro del rango exacto.',
      );
    // BigInt prevents doing an imprecise multiplication or addition even temporarily.
    const subtotal = BigInt(product.priceTenths) * BigInt(quantity);
    if (subtotal > limit || total > limit - subtotal)
      throw new SalesError(
        'validation',
        'La cantidad o el total supera el rango entero exacto.',
      );
    total += subtotal;
    return Number(subtotal);
  });
  return { subtotals, totalTenths: Number(total) };
}
export function formatMoney(tenths: number) {
  const value = BigInt(tenths);
  return `BOB ${value / 10n}.${value % 10n}`;
}
