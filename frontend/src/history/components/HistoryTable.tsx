import type { HistorySnapshot, SaleRow } from '../api/contract.provisional';
import { formatTimestamp, paymentLabel, money } from '../api/dates';
import { Button } from '../../shared/components/Button';
import styles from '../pages/HistoryPage.module.css';

export function HistoryTable({
  data,
  busy,
  onDetail,
  onPage,
}: {
  data: HistorySnapshot;
  busy: boolean;
  onDetail: (sale: SaleRow) => void;
  onPage: (direction: 'next' | 'previous') => void;
}) {
  return (
    <>
      <div
        className={styles.tableScroll}
        role="region"
        aria-label="Listado de ventas"
        tabIndex={0}
      >
        <table className={styles.table}>
          <caption className={styles.srOnly}>
            Ventas registradas, de la más reciente a la más antigua. Fechas y
            horas de Bolivia.
          </caption>
          <thead>
            <tr>
              <th scope="col">Fecha y hora</th>
              <th scope="col" className={styles.numeric}>
                Unidades
              </th>
              <th scope="col">Pago</th>
              <th scope="col" className={styles.numeric}>
                Total
              </th>
              <th scope="col">
                <span className={styles.srOnly}>Detalle</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((sale) => (
              <tr key={sale.saleRef}>
                <td>
                  <time dateTime={sale.registeredAt}>
                    {formatTimestamp(sale.registeredAt)}
                  </time>
                </td>
                <td className={styles.numeric}>{sale.units}</td>
                <td>{paymentLabel(sale.paymentMethod)}</td>
                <td className={`${styles.numeric} ${styles.amount}`}>
                  {money(sale.totalTenths)}
                </td>
                <td>
                  <button
                    className={styles.detailAction}
                    disabled={busy}
                    onClick={() => onDetail(sale)}
                    aria-label={`Ver detalle del ${formatTimestamp(sale.registeredAt)}, ${paymentLabel(sale.paymentMethod)}, ${money(sale.totalTenths)}`}
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.pagination}>
        <p role="status">
          Página {data.pageNumber}{' '}
          <span>· {data.items.length} ventas en esta página</span>
        </p>
        <div>
          <Button
            disabled={busy || !data.hasPrevious}
            onClick={() => onPage('previous')}
          >
            Anterior
          </Button>
          <Button
            disabled={busy || !data.nextCursor}
            onClick={() => onPage('next')}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </>
  );
}
