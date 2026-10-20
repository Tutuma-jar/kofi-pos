import { useState } from 'react';
import { formatMoney } from '../api/amounts';
import type { Line } from '../api/contract.provisional';
import { useSales } from '../state/sales-context';
import styles from '../pages/SalesPage.module.css';

export function OrderLine({
  line,
  subtotal,
  editable,
}: {
  line: Line;
  subtotal: number;
  editable: boolean;
}) {
  const { quantity, remove } = useSales();
  const [draft, setDraft] = useState<string | null>(null);
  const name = line.product.name;
  const commit = () => {
    if (draft !== null) quantity(line.product.id, draft);
    setDraft(null);
  };
  return (
    <li className={styles.orderLine}>
      <div className={styles.lineHeading}>
        <strong>{name}</strong>
        <strong className={styles.money}>{formatMoney(subtotal)}</strong>
      </div>
      <span className={styles.unitPrice}>
        {formatMoney(line.product.priceTenths)} por unidad
      </span>
      {editable ? (
        <div className={styles.lineActions}>
          <div className={styles.stepper}>
            <button
              aria-label={`Disminuir ${name}`}
              disabled={line.quantity === 1}
              onClick={() => {
                setDraft(null);
                quantity(line.product.id, String(line.quantity - 1));
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="M3 8h10" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <input
              aria-label={`Cantidad de ${name}`}
              inputMode="numeric"
              value={draft ?? String(line.quantity)}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commit();
                }
              }}
            />
            <button
              aria-label={`Aumentar ${name}`}
              onClick={() => {
                setDraft(null);
                quantity(line.product.id, String(line.quantity + 1));
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M3 8h10M8 3v10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          </div>
          <button
            className={styles.remove}
            onClick={() => remove(line.product.id)}
            aria-label={`Quitar ${name}`}
          >
            Quitar
          </button>
        </div>
      ) : (
        <p className={styles.unitPrice}>Cantidad: {line.quantity}</p>
      )}
    </li>
  );
}
