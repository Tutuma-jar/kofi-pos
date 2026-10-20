import type { Decimal128, Document, Long, ObjectId } from 'mongodb';

/** Semantic read projection, not a persistence contract for Gestión de ventas. */
export type DashboardSaleProjection = {
  registeredAt: Date;
  paymentMethod: 'cash' | 'qr';
  totalTenths: Long | Decimal128;
  lines: {
    productId: ObjectId;
    quantity: Long | Decimal128;
    revenueTenths: Long | Decimal128;
  }[];
};
export type DashboardCatalogProjection = { _id: ObjectId; currentName: string };

export type DashboardPeriod = 'today' | 'month';
export type DashboardResponse = {
  period: DashboardPeriod;
  periodEndsAt: string;
  summary: {
    salesCount: number;
    revenueTenths: number;
    cashSalesCount: number;
    qrSalesCount: number;
  };
  products: {
    productId: string;
    currentName: string;
    unitsSold: number;
    revenueTenths: number;
  }[];
  hourlySales: { hour: number; salesCount: number }[];
};

/** Read-only boundary, NOT a sales persistence model. No default commercial collections.
 * The producer must project only confirmed sales, with Date registeredAt,
 * cash|qr paymentMethod, Long totalTenths and nonempty lines containing
 * ObjectId productId, Long quantity and Long revenueTenths. Catalog projection:
 * ObjectId _id, string currentName (including inactive products).
 * Projection stages must be trusted server configuration, never HTTP input.
 */
export type DashboardSource = {
  salesCollection: string;
  productsCollection: string;
  salesProjection: Document[];
  productProjection: Document[];
};
