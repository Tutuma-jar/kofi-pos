import type { DemoScenario, SaleDetail } from './contract.provisional';
import { boliviaDate, shiftDate } from './dates';

export const scenarioLabels: Record<DemoScenario, string> = {
  normal: 'Ventas de ejemplo',
  slow: 'Carga lenta',
  empty: 'Sin ventas registradas',
  'query-error': 'Error de consulta',
  'report-error': 'Error de reportes',
  'detail-error': 'Error del detalle',
  'not-found': 'Venta no encontrada',
};
// Catálogo exclusivamente ficticio: el ranking usa nombres actuales, el detalle snapshots.
export const demoProducts = [
  {
    name: 'Espresso de la casa',
    original: 'Espresso',
    price: 100,
    active: true,
  },
  { name: 'Cappuccino', original: 'Cappuccino', price: 180, active: true },
  {
    name: 'Croissant de mantequilla',
    original: 'Croissant de mantequilla',
    price: 125,
    active: true,
  },
  {
    name: 'Café frío',
    original: 'Café frío original',
    price: 165,
    active: false,
  },
  { name: 'Americano', original: 'Americano', price: 120, active: true },
  { name: 'Latte', original: 'Latte', price: 180, active: true },
  {
    name: 'Té de la tarde',
    original: 'Té de la tarde',
    price: 100,
    active: true,
  },
  {
    name: 'Chocolate caliente',
    original: 'Chocolate caliente',
    price: 160,
    active: true,
  },
  { name: 'Limonada', original: 'Limonada', price: 120, active: true },
  { name: 'Brownie', original: 'Brownie', price: 140, active: true },
  {
    name: 'Galleta de avena',
    original: 'Galleta de avena',
    price: 80,
    active: true,
  },
  {
    name: 'Sándwich de queso',
    original: 'Sándwich de queso',
    price: 200,
    active: true,
  },
];
export function createSalesFixture(now: number): SaleDetail[] {
  const today = boliviaDate(now);
  const midnight = Date.parse(`${today}T00:00:00-04:00`);
  const latest = Math.max(midnight, now - 1000);
  const sale = (index: number, at: number): SaleDetail => {
    const indexes = index === 0 ? [0, 3] : [index % 12, (index + 2) % 12];
    const lines = indexes.map((productIndex, position) => {
      const product = demoProducts[productIndex]!;
      const quantity = position === 0 ? (index % 3) + 1 : 1;
      return {
        productRef: `demo-product-${productIndex}`,
        name: product.original,
        unitPriceTenths: product.price,
        quantity,
        subtotalTenths: product.price * quantity,
      };
    });
    return {
      saleRef: `demo-sale-${String(index).padStart(4, '0')}`,
      registeredAt: new Date(at).toISOString(),
      units: lines.reduce((sum, line) => sum + line.quantity, 0),
      paymentMethod: index % 2 ? 'qr' : 'cash',
      totalTenths: lines.reduce((sum, line) => sum + line.subtotalTenths, 0),
      lines,
    };
  };
  const recent = Array.from({ length: 62 }, (_, i) =>
    sale(i, Math.max(midnight, latest - Math.floor((i + 1) / 2) * 60_000)),
  );
  return [
    ...recent,
    sale(62, midnight),
    sale(63, midnight - 1000),
    sale(64, Date.parse(`${shiftDate(today, -6)}T12:00:00-04:00`)),
    sale(
      65,
      Date.parse(`${shiftDate(`${today.slice(0, 7)}-01`, -1)}T12:00:00-04:00`),
    ),
  ];
}
