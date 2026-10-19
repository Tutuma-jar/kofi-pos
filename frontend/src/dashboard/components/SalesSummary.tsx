import { memo } from 'react';
import type { DashboardResponse } from '../api/contract.provisional';
import { money } from '../api/presentation';
import styles from '../pages/DashboardPage.module.css';

export const SalesSummary = memo(function SalesSummary({
  summary,
}: {
  summary: DashboardResponse['summary'];
}) {
  const metrics = [
    ['Ventas', String(summary.salesCount)],
    ['Ingresos', money(summary.revenueTenths)],
    ['Ventas en efectivo', String(summary.cashSalesCount)],
    ['Ventas con QR', String(summary.qrSalesCount)],
  ];
  return (
    <dl className={styles.metrics} aria-label="Resumen de ventas">
      {metrics.map(([label, value]) => (
        <div key={label} className={styles.metric}>
          <dt>{label}</dt>
          <dd className={value && value.length > 13 ? styles.longNumber : ''}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
});
