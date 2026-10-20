import { memo } from 'react';
import type { DashboardResponse } from '../api/contract.provisional';
import { money } from '../api/presentation';
import styles from '../pages/DashboardPage.module.css';

export const SalesSummary = memo(function SalesSummary({
  summary,
}: {
  summary: DashboardResponse['summary'];
}) {
  const income = money(summary.revenueTenths);
  return (
    <dl className={styles.metrics} aria-label="Resumen de ventas">
      <div className={styles.incomeMetric}>
        <dt>Ingresos registrados</dt>
        <dd className={income.length > 13 ? styles.longNumber : ''}>
          {income}
        </dd>
        <dd className={styles.metricNote}>Bolivianos · efectivo y QR</dd>
      </div>
      <div className={styles.salesMetric}>
        <dt>Ventas realizadas</dt>
        <dd
          className={
            String(summary.salesCount).length > 13 ? styles.longNumber : ''
          }
        >
          {summary.salesCount}
        </dd>
      </div>
    </dl>
  );
});
