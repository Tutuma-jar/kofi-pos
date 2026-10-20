import type { Reports } from '../api/contract.provisional';
import { money } from '../api/dates';
import { Button } from '../../shared/components/Button';
import styles from '../pages/HistoryPage.module.css';

export function PeriodReports({
  reports,
  onRetry,
  busy,
}: {
  reports: Reports;
  onRetry: () => void;
  busy: boolean;
}) {
  if (reports.kind === 'error')
    return (
      <div className={styles.empty} role="alert">
        <h3>No se pudieron generar los reportes</h3>
        <p>{reports.message}</p>
        <Button onClick={onRetry} disabled={busy}>
          Reintentar reportes
        </Button>
      </div>
    );
  const { summary, ranking } = reports;
  if (!summary.salesCount)
    return (
      <div className={styles.empty}>
        <h3>No se registraron ventas en este rango</h3>
        <p>
          El resumen y los productos más vendidos aparecerán cuando haya ventas
          registradas.
        </p>
      </div>
    );
  return (
    <>
      <dl className={styles.summary} aria-label="Resumen del período">
        <div className={styles.income}>
          <dt>Ingresos totales</dt>
          <dd>{money(summary.incomeTenths)}</dd>
        </div>
        <div>
          <dt>Ventas registradas</dt>
          <dd>{summary.salesCount}</dd>
        </div>
        <div>
          <dt>Ticket promedio</dt>
          <dd>
            {summary.averageTicketTenths === null
              ? 'No disponible'
              : money(summary.averageTicketTenths)}
          </dd>
        </div>
      </dl>
      <dl
        className={styles.paymentSummary}
        aria-label="Ingresos por método de pago"
      >
        <div>
          <dt>Efectivo</dt>
          <dd>{money(summary.cashIncomeTenths)}</dd>
        </div>
        <div>
          <dt>QR</dt>
          <dd>{money(summary.qrIncomeTenths)}</dd>
        </div>
      </dl>
      <div className={styles.rankingHeader}>
        <h3>Productos más vendidos</h3>
        <p>Hasta 10 productos · Por unidades</p>
      </div>
      <div
        className={styles.rankingScroll}
        role="region"
        aria-label="Productos más vendidos"
        tabIndex={0}
      >
        <table className={`${styles.table} ${styles.ranking}`}>
          <caption className={styles.srOnly}>
            Ranking del período con nombres actuales, incluidos productos
            desactivados.
          </caption>
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col" className={styles.numeric}>
                Unid.
              </th>
              <th scope="col" className={styles.numeric}>
                Ingresos
              </th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((product, index) => (
              <tr key={product.productRef}>
                <th scope="row">
                  <span className={styles.rank}>{index + 1}</span>
                  {product.name}
                </th>
                <td className={styles.numeric}>{product.units}</td>
                <td className={`${styles.numeric} ${styles.secondaryAmount}`}>
                  {money(product.incomeTenths)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.rankingNote}>
        Nombres actuales; ingresos a los precios registrados.
      </p>
    </>
  );
}
