import type {
  DashboardPeriod,
  DashboardResponse,
  DemoScenario,
} from './contract.provisional';
import { boliviaTime, periodEndsAt } from './presentation';

export const BASE_TIME = Date.parse('2026-10-19T14:35:00.000Z');
// Scenario-only catalog metadata, deliberately absent from the approved DTO.
export const inactiveCatalogFixture = {
  productId: '000000000000000000000002',
  active: false,
  currentPriceTenths: 9990,
};
export const scenarioLabels: Record<DemoScenario, string> = {
  normal: 'Restablecer demostración',
  slow: 'Carga lenta (1.5 s)',
  empty: 'Período sin ventas',
  many: '60 productos',
  large: 'Cifras largas',
  decimal: 'Importe BOB 4550.5',
  zero: 'Venta con ingreso cero',
  sale: 'Venta confirmada',
  repeat: 'Aviso repetido',
  burst: 'Ráfaga de avisos',
  missed: 'Venta sin aviso (30 s)',
  rename: 'Renombrar producto',
  inactive: 'Desactivar y cambiar precio',
  'initial-error': 'Error de carga inicial',
  'refresh-error': 'Error de actualización',
  network: 'Fallo de red',
  validation: 'Error 400',
  recover: 'Recuperar lectura',
  disconnect: 'Cortar conexión',
  reconnect: 'Reconectar',
  silence: 'Sin latidos (60 s)',
  hour: 'Avanzar una hora',
  midnight: 'Medianoche en 2 s',
  'month-end': 'Fin de mes en 2 s',
  race: 'Respuestas Hoy→Mes→Hoy',
  'late-failure': 'Respuesta vieja tras fallo',
  'unauthorized-read': '401 en lectura',
  'unauthorized-stream': '401 en stream',
};
export type FixtureMode =
  'normal' | 'empty' | 'many' | 'large' | 'decimal' | 'zero';
export type FixtureOptions = {
  mode: FixtureMode;
  updated: boolean;
  renamed: boolean;
};
const id = (value: number) => value.toString(16).padStart(24, '0');

/** Snapshots are authored aggregates; the client never derives them from sales. */
export function fixture(
  period: DashboardPeriod,
  now: number,
  options: FixtureOptions,
): DashboardResponse {
  const response: DashboardResponse = {
    period,
    periodEndsAt: periodEndsAt(period, now),
    summary: {
      salesCount: 0,
      revenueTenths: 0,
      cashSalesCount: 0,
      qrSalesCount: 0,
    },
    products: [],
    hourlySales: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      salesCount: 0,
    })),
  };
  const date = boliviaTime(now);
  const newMonth = date.year !== 2026 || date.month !== 10;
  const nextDay = date.day > 19;
  if (options.mode === 'empty' || newMonth || (period === 'today' && nextDay))
    return response;
  if (options.mode === 'many') {
    response.summary = {
      salesCount: 60,
      revenueTenths: 6000,
      cashSalesCount: 30,
      qrSalesCount: 30,
    };
    response.products = Array.from({ length: 60 }, (_, index) => ({
      productId: id(index + 1),
      currentName:
        index === 0
          ? 'Café de especialidad de los Yungas, preparación de la casa con leche'
          : `Producto de demostración ${String(index + 1).padStart(2, '0')}`,
      unitsSold: 1,
      revenueTenths: 100,
    }));
    for (const hour of [8, 9, 10])
      response.hourlySales[hour] = { hour, salesCount: 20 };
    return response;
  }
  if (['large', 'decimal', 'zero'].includes(options.mode)) {
    const large = options.mode === 'large';
    const count = large ? Number.MAX_SAFE_INTEGER : 1;
    const revenue = large
      ? Number.MAX_SAFE_INTEGER
      : options.mode === 'decimal'
        ? 45505
        : 0;
    response.summary = {
      salesCount: count,
      revenueTenths: revenue,
      cashSalesCount: large ? count - 1 : 1,
      qrSalesCount: large ? 1 : 0,
    };
    response.products = [
      {
        productId: id(1),
        currentName: 'Café de especialidad — presentación de cifras completas',
        unitsSold: count,
        revenueTenths: revenue,
      },
    ];
    response.hourlySales[10] = { hour: 10, salesCount: count };
    return response;
  }
  const month = period === 'month';
  const updated = options.updated;
  response.summary = month
    ? updated
      ? {
          salesCount: 41,
          revenueTenths: 15900,
          cashSalesCount: 23,
          qrSalesCount: 18,
        }
      : {
          salesCount: 40,
          revenueTenths: 15500,
          cashSalesCount: 23,
          qrSalesCount: 17,
        }
    : updated
      ? {
          salesCount: 13,
          revenueTenths: 4950,
          cashSalesCount: 7,
          qrSalesCount: 6,
        }
      : {
          salesCount: 12,
          revenueTenths: 4550,
          cashSalesCount: 7,
          qrSalesCount: 5,
        };
  const croissant = {
    productId: id(3),
    currentName: 'Croissant',
    unitsSold: month ? 12 : 4,
    revenueTenths: month ? 3000 : 1000,
  };
  const latte = {
    productId: id(1),
    currentName: options.renamed ? 'Latte de la casa' : 'Café latte',
    unitsSold: month ? 24 : 8,
    revenueTenths: month ? 6000 : 2000,
  };
  const tea = {
    productId: id(4),
    currentName: 'Té',
    unitsSold: month ? 6 : 2,
    revenueTenths: month ? 1050 : 350,
  };
  const americano = {
    productId: id(2),
    currentName: 'Americano',
    unitsSold: month ? (updated ? 22 : 20) : updated ? 8 : 6,
    revenueTenths: month ? (updated ? 5850 : 5450) : updated ? 1600 : 1200,
  };
  response.products = updated
    ? [americano, croissant, latte, tea]
    : [croissant, latte, tea, americano];
  const hours: [number, number][] = month
    ? [
        [7, 2],
        [8, 8],
        [9, 10],
        [10, updated ? 13 : 12],
        [14, 5],
        [18, 3],
      ]
    : [
        [8, 3],
        [9, 4],
        [10, updated ? 6 : 5],
      ];
  for (const [hour, salesCount] of hours)
    response.hourlySales[hour] = { hour, salesCount };
  return response;
}
