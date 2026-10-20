import { useEffect, useRef } from 'react';
import { Button } from '../../shared/components/Button';
import { calculateAmounts, formatMoney } from '../api/amounts';
import { useSales } from '../state/sales-context';
import { OrderLine } from './OrderLine';
import styles from '../pages/SalesPage.module.css';

export function OrderPanel() {
  const sales = useSales();
  const { state } = sales;
  const heading = useRef<HTMLHeadingElement>(null);
  const { phase, busy } = state;
  useEffect(() => {
    if (phase !== 'editing') heading.current?.focus();
  }, [phase]);
  const lines =
    phase === 'reviewing' && state.quote ? state.quote.lines : state.lines;
  const amounts = calculateAmounts(lines);
  const total =
    phase === 'reviewing'
      ? (state.quote?.totalTenths ?? 0)
      : (state.review?.totalTenths ?? amounts.totalTenths);
  const terminal = phase === 'success' || phase === 'closed';
  return (
    <section
      className={styles.order}
      aria-label="Pedido en curso"
      aria-busy={busy}
    >
      <div className={styles.orderHeader}>
        <h2 ref={heading} tabIndex={-1}>
          {phase === 'reviewing'
            ? 'Revisar antes de cobrar'
            : phase === 'payment'
              ? 'Registrar el pago'
              : phase === 'uncertain'
                ? 'Resultado por comprobar'
                : phase === 'success'
                  ? 'Venta simulada confirmada'
                  : phase === 'closed'
                    ? 'Operación no registrada'
                    : 'Pedido en curso'}
        </h2>
        {!terminal && (
          <span>
            {state.lines.length}{' '}
            {state.lines.length === 1 ? 'producto' : 'productos'}
          </span>
        )}
      </div>
      <div
        className={styles.orderScroll}
        tabIndex={0}
        aria-label="Detalle del pedido"
      >
        {phase === 'success' && state.receipt ? (
          <div className={styles.result}>
            <p role="status">El servicio simulado confirmó el registro.</p>
            <p className={styles.receiptTotal}>
              {formatMoney(state.receipt.totalTenths)}
            </p>
            <p>Pago en {state.receipt.method === 'cash' ? 'efectivo' : 'QR'}</p>
            <p>
              {new Intl.DateTimeFormat('es-BO', {
                timeZone: 'America/La_Paz',
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(state.receipt.confirmedAt))}
            </p>
            <p className={styles.reference}>
              Referencia: {state.receipt.operationId}
            </p>
            <p>No se guardó una venta real ni se actualizó el Dashboard.</p>
          </div>
        ) : phase === 'closed' ? (
          <div className={styles.result}>
            <p>
              La simulación confirmó que esta identidad no quedó registrada.
            </p>
            <p>
              Si recibiste el dinero, revisa la selección de nuevo. No vuelvas a
              cobrarlo.
            </p>
          </div>
        ) : (
          <>
            {phase === 'uncertain' && (
              <div className={styles.notice}>
                <p>
                  No sabemos todavía si la venta se registró. No vuelvas a
                  cobrar.
                </p>
                <p className={styles.reference}>
                  Referencia: {state.operationId}
                </p>
                <p>
                  Comprueba el resultado o concilia esta misma identidad. Una
                  consulta sin coincidencia no demuestra un fallo definitivo.
                </p>
                {!state.review && (
                  <p>
                    La simulación solo conserva resultados en memoria. Tras una
                    recarga no puede acreditar un guardado anterior; la
                    recuperación real requiere backend.
                  </p>
                )}
              </div>
            )}
            {phase === 'reviewing' && state.quote && (
              <>
                <p className={styles.panelHint}>
                  Comprueba los productos y confirma el total antes de recibir
                  el dinero.
                </p>
                {state.quote.changes.map((change) => (
                  <div key={change.productId} className={styles.change}>
                    <strong>{change.name}</strong>
                    {change.unavailable ? (
                      <>
                        <p>
                          Ya no está disponible. Retíralo antes de continuar.
                        </p>
                        <Button
                          disabled={busy}
                          onClick={() => sales.remove(change.productId)}
                        >
                          Retirar {change.name}
                        </Button>
                      </>
                    ) : (
                      <p>
                        Precio anterior: {formatMoney(change.previousTenths)}
                        <br />
                        Precio vigente:{' '}
                        <strong>{formatMoney(change.currentTenths)}</strong>
                        <br />
                        Se aplicará solo al confirmar la revisión.
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}
            {phase === 'payment' && (
              <p className={styles.notice}>
                Total y productos fijados. Recibe el dinero antes de registrar;
                el cliente paga antes de recibir los productos.
              </p>
            )}
            {!lines.length && phase !== 'uncertain' ? (
              <div className={styles.empty}>
                <h3>Agrega productos para preparar una venta</h3>
                <p>Elige un producto del catálogo para comenzar.</p>
              </div>
            ) : (
              <ul className={styles.lines}>
                {lines.map((line, index) => (
                  <OrderLine
                    key={line.product.id}
                    line={line}
                    subtotal={amounts.subtotals[index]!}
                    editable={phase === 'editing' && !busy}
                  />
                ))}
              </ul>
            )}
            {phase === 'payment' && (
              <fieldset className={styles.payment} disabled={busy}>
                <legend>Método de pago recibido</legend>
                <div>
                  {(
                    [
                      ['cash', 'Efectivo'],
                      ['qr', 'QR'],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="payment-method"
                        value={value}
                        checked={state.method === value}
                        onChange={() => sales.chooseMethod(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p>Kofi no procesa pagos ni verifica la transacción QR.</p>
              </fieldset>
            )}
          </>
        )}
      </div>
      <footer className={styles.orderFooter}>
        {!terminal && (
          <div className={styles.total}>
            <span>{phase === 'reviewing' ? 'Total resultante' : 'Total'}</span>
            <strong>
              {phase === 'uncertain' && !state.review
                ? 'Por comprobar'
                : formatMoney(total)}
            </strong>
          </div>
        )}
        {busy && (
          <p role="status" className={styles.progress}>
            {phase === 'payment'
              ? 'Registrando venta pagada…'
              : phase === 'uncertain'
                ? 'Comprobando el resultado…'
                : 'Comprobando catálogo y revisión…'}
          </p>
        )}
        {phase === 'editing' && (
          <Button
            variant="primary"
            disabled={busy || !lines.length}
            onClick={() => void sales.review()}
          >
            Revisar antes de cobrar
          </Button>
        )}
        {phase === 'reviewing' && (
          <>
            <Button
              variant="primary"
              disabled={
                busy ||
                !lines.length ||
                lines.some((line) => !line.product.active)
              }
              onClick={() => void sales.confirmReview()}
            >
              Confirmar total para cobrar
            </Button>
            <Button disabled={busy} onClick={sales.edit}>
              Volver al pedido
            </Button>
          </>
        )}
        {phase === 'payment' && (
          <>
            <Button
              variant="primary"
              disabled={busy || !state.method}
              onClick={() => void sales.register()}
            >
              {busy ? 'Registrando…' : 'Registrar venta ya pagada'}
            </Button>
            <Button disabled={busy} onClick={sales.edit}>
              Modificar antes del pago
            </Button>
          </>
        )}
        {phase === 'uncertain' && (
          <>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => void sales.recover()}
            >
              Comprobar resultado
            </Button>
            <div className={styles.recoveryActions}>
              {state.review && (
                <Button disabled={busy} onClick={() => void sales.retry()}>
                  Reintentar misma operación
                </Button>
              )}
              <Button disabled={busy} onClick={() => void sales.recover(true)}>
                Conciliar operación
              </Button>
            </div>
          </>
        )}
        {terminal && (
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void sales.newSale()}
          >
            Nueva venta
          </Button>
        )}
      </footer>
    </section>
  );
}
