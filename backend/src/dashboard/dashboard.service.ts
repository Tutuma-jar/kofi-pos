import { Decimal128, type Db, type Document } from 'mongodb';
import { ApiError } from '../shared/http/api-error.js';
import type {
  DashboardPeriod,
  DashboardResponse,
  DashboardSource,
} from './dashboard.contract.js';
import { dashboardPeriod } from './dashboard-period.js';

const zero = Decimal128.fromString('0');
const one = Decimal128.fromString('1');
const max = Decimal128.fromString(String(Number.MAX_SAFE_INTEGER));
const decimal = (field: string) => ({
  $convert: { input: field, to: 'decimal', onError: null, onNull: null },
});
const exactPositive = (field: string) => ({
  $and: [
    { $in: [{ $type: field }, ['long', 'int', 'decimal']] },
    { $gt: [decimal(field), zero] },
    { $lte: [decimal(field), max] },
    { $eq: [decimal(field), { $trunc: decimal(field) }] },
  ],
});
function integrity(): never {
  throw new ApiError(
    'INTERNAL_ERROR',
    'No se pudo obtener un Dashboard íntegro.',
  );
}

export function safeDashboardInteger(value: unknown): number {
  const text = value instanceof Decimal128 ? value.toString() : String(value);
  // Decimal sums of integer operands remain integers. Never round during conversion.
  if (!/^\d+$/.test(text)) return integrity();
  const integer = BigInt(text);
  if (integer > BigInt(Number.MAX_SAFE_INTEGER)) return integrity();
  return Number(integer);
}

export function createDashboardService(
  db: Db,
  source?: DashboardSource,
  clock = () => new Date(),
) {
  return {
    async read(period: DashboardPeriod): Promise<DashboardResponse> {
      const range = dashboardPeriod(period, clock());
      if (!source)
        throw new ApiError(
          'INTERNAL_ERROR',
          'Fuente de ventas del Dashboard no conectada.',
        );
      const pipeline: Document[] = [
        ...source.salesProjection,
        {
          $match: {
            registeredAt: {
              $gte: range.start,
              $lt: range.end,
              $lte: range.cutoff,
            },
          },
        },
        {
          $set: {
            valid: {
              $and: [
                { $in: ['$paymentMethod', ['cash', 'qr']] },
                exactPositive('$totalTenths'),
                { $isArray: '$lines' },
                { $gt: [{ $size: { $ifNull: ['$lines', []] } }, 0] },
                {
                  $allElementsTrue: {
                    $map: {
                      input: '$lines',
                      as: 'line',
                      in: {
                        $and: [
                          { $eq: [{ $type: '$$line.productId' }, 'objectId'] },
                          exactPositive('$$line.quantity'),
                          exactPositive('$$line.revenueTenths'),
                        ],
                      },
                    },
                  },
                },
                {
                  $eq: [
                    decimal('$totalTenths'),
                    {
                      $sum: {
                        $map: {
                          input: '$lines',
                          as: 'line',
                          in: decimal('$$line.revenueTenths'),
                        },
                      },
                    },
                  ],
                },
              ],
            },
          },
        },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  salesCount: { $sum: one },
                  revenueTenths: { $sum: decimal('$totalTenths') },
                  cashSalesCount: {
                    $sum: {
                      $cond: [{ $eq: ['$paymentMethod', 'cash'] }, one, zero],
                    },
                  },
                  qrSalesCount: {
                    $sum: {
                      $cond: [{ $eq: ['$paymentMethod', 'qr'] }, one, zero],
                    },
                  },
                  invalidCount: { $sum: { $cond: ['$valid', 0, 1] } },
                },
              },
            ],
            products: [
              { $unwind: '$lines' },
              {
                $group: {
                  _id: '$lines.productId',
                  unitsSold: { $sum: decimal('$lines.quantity') },
                  revenueTenths: { $sum: decimal('$lines.revenueTenths') },
                  lastSoldAt: { $max: '$registeredAt' },
                },
              },
              {
                $lookup: {
                  from: source.productsCollection,
                  let: { productId: '$_id' },
                  pipeline: [
                    ...source.productProjection,
                    { $match: { $expr: { $eq: ['$_id', '$$productId'] } } },
                    { $project: { currentName: 1 } },
                  ],
                  as: 'catalog',
                },
              },
              { $sort: { lastSoldAt: -1, _id: 1 } },
            ],
            hourlySales: [
              {
                $group: {
                  _id: {
                    $hour: {
                      date: '$registeredAt',
                      timezone: 'America/La_Paz',
                    },
                  },
                  salesCount: { $sum: one },
                },
              },
            ],
          },
        },
      ];
      const [result] = await db
        .collection(source.salesCollection)
        .aggregate(pipeline, {
          readConcern: { level: 'snapshot' },
          readPreference: 'primary',
          maxTimeMS: 10_000,
        })
        .toArray();
      if (!result) return integrity();
      const summaryRow = result.summary[0];
      if (summaryRow?.invalidCount) return integrity();
      const summary = {
        salesCount: safeDashboardInteger(summaryRow?.salesCount ?? 0),
        revenueTenths: safeDashboardInteger(summaryRow?.revenueTenths ?? 0),
        cashSalesCount: safeDashboardInteger(summaryRow?.cashSalesCount ?? 0),
        qrSalesCount: safeDashboardInteger(summaryRow?.qrSalesCount ?? 0),
      };
      const products: DashboardResponse['products'] = result.products.map(
        (row: Document) => {
          if (
            row.catalog.length !== 1 ||
            typeof row.catalog[0].currentName !== 'string' ||
            !row.catalog[0].currentName.trim()
          )
            return integrity();
          return {
            productId: row._id.toHexString(),
            currentName: row.catalog[0].currentName,
            unitsSold: safeDashboardInteger(row.unitsSold),
            revenueTenths: safeDashboardInteger(row.revenueTenths),
          };
        },
      );
      const hourlySales = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        salesCount: 0,
      }));
      for (const row of result.hourlySales) {
        if (!Number.isInteger(row._id) || !hourlySales[row._id])
          return integrity();
        hourlySales[row._id]!.salesCount = safeDashboardInteger(row.salesCount);
      }
      if (
        BigInt(summary.cashSalesCount) + BigInt(summary.qrSalesCount) !==
          BigInt(summary.salesCount) ||
        products.reduce((sum, row) => sum + BigInt(row.revenueTenths), 0n) !==
          BigInt(summary.revenueTenths) ||
        hourlySales.reduce((sum, row) => sum + BigInt(row.salesCount), 0n) !==
          BigInt(summary.salesCount)
      )
        return integrity();
      return {
        period,
        periodEndsAt: range.end.toISOString(),
        summary,
        products,
        hourlySales,
      };
    },
  };
}
