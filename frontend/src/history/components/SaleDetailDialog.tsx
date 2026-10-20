import { useEffect, useRef, useState } from 'react';
import type {
  HistoryClient,
  SaleDetail,
  SaleRow,
} from '../api/contract.provisional';
import { formatTimestamp, money, paymentLabel } from '../api/dates';
import { Button } from '../../shared/components/Button';
import styles from '../pages/HistoryPage.module.css';

export function SaleDetailDialog({
  sale,
  client,
  onClose,
}: {
  sale: SaleRow;
  client: HistoryClient;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    phase: 'loading' | 'ready' | 'error';
    data?: SaleDetail;
    message?: string;
  }>({ phase: 'loading' });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    closeButton.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void client
      .detail(sale.saleRef, controller.signal)
      .then((data) => {
        if (active) setState({ phase: 'ready', data });
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            phase: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'No pudimos consultar el detalle. Reintenta.',
          });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [client, sale.saleRef, attempt]);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="sale-detail-title"
      aria-describedby="sale-detail-note"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const nodes = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [tabindex="0"]',
          ),
        );
        const first = nodes[0];
        const last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <header className={styles.dialogHeader}>
        <h2 id="sale-detail-title">Detalle de la venta</h2>
        <Button ref={closeButton} onClick={onClose}>
          Cerrar detalle
        </Button>
      </header>
      <p id="sale-detail-note" className={styles.muted}>
        Solo lectura · {client.demo ? 'Datos de demostración · ' : ''}Horario de
        Bolivia
      </p>
      {state.phase === 'loading' && (
        <p className={styles.detailState} role="status">
          Cargando detalle de la venta…
        </p>
      )}
      {state.phase === 'error' && (
        <div className={styles.detailState} role="alert">
          <h3>No pudimos consultar el detalle</h3>
          <p>{state.message}</p>
          <Button
            onClick={() => {
              setState({ phase: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            Reintentar detalle
          </Button>
        </div>
      )}
      {state.phase === 'ready' && state.data && (
        <>
          <dl className={styles.detailMeta}>
            <div>
              <dt>Fecha y hora</dt>
              <dd>
                <time dateTime={state.data.registeredAt}>
                  {formatTimestamp(state.data.registeredAt)}
                </time>
              </dd>
            </div>
            <div>
              <dt>Método de pago</dt>
              <dd>{paymentLabel(state.data.paymentMethod)}</dd>
            </div>
          </dl>
          <div
            className={styles.detailTableScroll}
            role="region"
            aria-label="Productos de la venta"
            tabIndex={0}
          >
            <table className={styles.table}>
              <caption className={styles.srOnly}>
                Productos e importes históricos registrados
              </caption>
              <thead>
                <tr>
                  <th scope="col">Producto</th>
                  <th scope="col" className={styles.numeric}>
                    Precio unitario
                  </th>
                  <th scope="col" className={styles.numeric}>
                    Cantidad
                  </th>
                  <th scope="col" className={styles.numeric}>
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.lines.map((line) => (
                  <tr key={line.productRef}>
                    <th scope="row">{line.name}</th>
                    <td className={styles.numeric}>
                      {money(line.unitPriceTenths)}
                    </td>
                    <td className={styles.numeric}>{line.quantity}</td>
                    <td className={styles.numeric}>
                      {money(line.subtotalTenths)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.detailTotal}>
            <span>Total registrado</span>
            <strong>{money(state.data.totalTenths)}</strong>
          </div>
          <p className={styles.detailNote}>
            Nombres y precios del momento de la venta. Los cambios posteriores
            del menú no alteran este detalle.
          </p>
        </>
      )}
    </dialog>
  );
}
