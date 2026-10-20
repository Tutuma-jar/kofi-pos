import { ApiError } from '../shared/http/api-error.js';
import type {
  DashboardPeriod,
  DashboardResponse,
} from './dashboard.contract.js';
import { dashboardPeriod } from './dashboard-period.js';

/** Temporary, bounded in-memory substitute for the absent sales producer.
 * No database dependency or writes. Replace its injection in server.ts with
 * DashboardSource when Gestión de ventas exists; never use as error fallback.
 */
export function createDashboardDemo(
  clock = () => new Date(),
  scenario: 'populated' | 'empty' | 'error' = 'populated',
) {
  const catalog = [
    {
      productId: '000000000000000000000001',
      currentName: 'Americano',
      price: 125,
    },
    { productId: '000000000000000000000002', currentName: 'Latte', price: 180 },
    {
      productId: '000000000000000000000003',
      currentName: 'Croissant',
      price: 95,
    },
    {
      productId: '000000000000000000000004',
      currentName: 'Capuchino',
      price: 160,
    },
  ];
  let revision = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  return {
    advance() {
      revision = Math.min(revision + 1, 32);
    },
    start(notify: () => Promise<void>, observed: () => boolean) {
      if (timer) return;
      timer = setInterval(() => {
        if (!observed()) return;
        revision = Math.min(revision + 1, 32);
        void notify().catch(() => {});
      }, 15_000);
      timer.unref();
    },
    stop() {
      clearInterval(timer);
      timer = undefined;
    },
    async read(period: DashboardPeriod): Promise<DashboardResponse> {
      if (scenario === 'error')
        throw new ApiError('INTERNAL_ERROR', 'Fallo de demostración.');
      const now = clock();
      const range = dashboardPeriod(period, now);
      const today = dashboardPeriod('today', now).start.getTime();
      const elapsed = now.getTime() - today;
      const sales: {
        at: number;
        product: number;
        quantity: number;
        qr: boolean;
      }[] = [];
      if (scenario !== 'empty') {
        for (let i = 0; i < 8 + revision; i++)
          sales.push({
            at: today + Math.floor((elapsed * (i + 1)) / (9 + revision)),
            product: i % catalog.length,
            quantity: 1 + (i % 3),
            qr: i % 2 === 1,
          });
        const days = Math.min(
          5,
          Math.round(
            (today - dashboardPeriod('month', now).start.getTime()) /
              86_400_000,
          ),
        );
        for (let day = 1; day <= days; day++) {
          for (let i = 0; i < 3; i++)
            sales.push({
              at: today - day * 86_400_000 + (9 + i * 3) * 3_600_000,
              product: (day + i) % catalog.length,
              quantity: i + 1,
              qr: i % 2 === 0,
            });
        }
      }
      const summary = {
        salesCount: 0,
        revenueTenths: 0,
        cashSalesCount: 0,
        qrSalesCount: 0,
      };
      const products = new Map<
        string,
        DashboardResponse['products'][number] & { lastSoldAt: number }
      >();
      const hourlySales = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        salesCount: 0,
      }));
      const hourFormatter = new Intl.DateTimeFormat('en', {
        timeZone: 'America/La_Paz',
        hour: 'numeric',
        hourCycle: 'h23',
      });
      for (const sale of sales) {
        if (
          sale.at < range.start.getTime() ||
          sale.at >= range.end.getTime() ||
          sale.at > now.getTime()
        )
          continue;
        const product = catalog[sale.product]!;
        const revenue = product.price * sale.quantity; // fixed small integer amounts
        summary.salesCount++;
        summary.revenueTenths += revenue;
        if (sale.qr) summary.qrSalesCount++;
        else summary.cashSalesCount++;
        hourlySales[Number(hourFormatter.format(sale.at))]!.salesCount++;
        const row = products.get(product.productId) ?? {
          productId: product.productId,
          currentName: product.currentName,
          unitsSold: 0,
          revenueTenths: 0,
          lastSoldAt: sale.at,
        };
        row.unitsSold += sale.quantity;
        row.revenueTenths += revenue;
        row.lastSoldAt = Math.max(row.lastSoldAt, sale.at);
        products.set(product.productId, row);
      }
      return {
        period,
        periodEndsAt: range.end.toISOString(),
        summary,
        hourlySales,
        products: [...products.values()]
          .sort(
            (a, b) =>
              b.lastSoldAt - a.lastSoldAt ||
              a.productId.localeCompare(b.productId),
          )
          .map(({ productId, currentName, unitsSold, revenueTenths }) => ({
            productId,
            currentName,
            unitsSold,
            revenueTenths,
          })),
      };
    },
  };
}
