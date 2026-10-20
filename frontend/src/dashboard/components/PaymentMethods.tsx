import { memo } from 'react';
import type { DashboardResponse } from '../api/contract.provisional';
import styles from '../pages/DashboardPage.module.css';

export const PaymentMethods = memo(function PaymentMethods({
  summary,
}: {
  summary: DashboardResponse['summary'];
}) {
  return (
    <section className={styles.payments} aria-labelledby="payments-title">
      <h2 id="payments-title">Métodos de pago</h2>
      <p className={styles.paymentNote}>Cantidad de ventas del período</p>
      <dl className={styles.paymentList}>
        <div>
          <dt>
            <span className={styles.swatch} aria-hidden="true" />
            Ventas con QR
          </dt>
          <dd>{summary.qrSalesCount}</dd>
        </div>
        <div>
          <dt>
            <span
              className={`${styles.swatch} ${styles.cashSwatch}`}
              aria-hidden="true"
            />
            Ventas en efectivo
          </dt>
          <dd>{summary.cashSalesCount}</dd>
        </div>
      </dl>
    </section>
  );
});
