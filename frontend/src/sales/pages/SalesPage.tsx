import { useEffect } from 'react';
import { ProductCatalog } from '../components/ProductCatalog';
import { OrderPanel } from '../components/OrderPanel';
import { scenarios } from '../api/fixtures';
import type { Scenario } from '../api/contract.provisional';
import { useSales } from '../state/sales-context';
import styles from './SalesPage.module.css';

export function SalesPage() {
  const sales = useSales();
  const { state, open, seen } = sales;
  useEffect(() => {
    document.title = 'Gestión de ventas · Kofi';
    void open();
  }, [open]);
  useEffect(() => {
    if (state.terminalId) seen();
  }, [state.terminalId, seen]);
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Gestión de ventas</h1>
          <p>Prepara el pedido, revisa el total y registra el pago recibido.</p>
        </div>
        <label className={styles.scenario}>
          Escenario simulado
          <select
            value={sales.scenario}
            disabled={state.busy}
            onChange={(event) =>
              sales.setScenario(event.target.value as Scenario)
            }
          >
            {scenarios.map((scenario) => (
              <option value={scenario.value} key={scenario.value}>
                {scenario.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <p className={styles.demo}>
        Demostración · Productos y ventas simulados. Sin cobros, guardados
        reales ni cambios en el Dashboard.
      </p>
      <div className={styles.message} aria-live="polite" aria-atomic="true">
        {state.message && (
          <p role={state.phase === 'uncertain' ? 'status' : 'alert'}>
            {state.message}
          </p>
        )}
      </div>
      <div className={styles.workspace}>
        <ProductCatalog />
        <OrderPanel />
      </div>
    </div>
  );
}
