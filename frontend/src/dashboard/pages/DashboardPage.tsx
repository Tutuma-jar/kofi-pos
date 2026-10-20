import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type {
  DashboardClient,
  DemoScenario,
} from '../api/contract.provisional';
import { createRealDashboardClient } from '../api/real-dashboard-client';
import { scenarioLabels } from '../api/fixtures';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../../shared/components/Button';
import { PeriodSelector } from '../components/PeriodSelector';
import { SalesSummary } from '../components/SalesSummary';
import { SoldProducts } from '../components/SoldProducts';
import { HourlySalesChart } from '../components/HourlySalesChart';
import { DashboardState } from '../components/DashboardState';
import styles from './DashboardPage.module.css';

export function DashboardPage({
  client: supplied,
}: {
  client?: DashboardClient;
}) {
  const { client: auth } = useAuth();
  const [owned] = useState(() => supplied ?? createRealDashboardClient(auth));
  const client = supplied ?? owned;
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const [textHours, setTextHours] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => client.start(), [client]);
  useEffect(() => {
    document.title = 'Dashboard · Kofi';
    heading.current?.focus();
  }, []);
  const hasSales = !!state.data && state.data.summary.salesCount > 0;
  const previousEmpty = !!state.data && !hasSales && state.stale;
  return (
    <section className={styles.page} aria-labelledby="dashboard-heading">
      <div className={styles.toolbar}>
        <h1 id="dashboard-heading" tabIndex={-1} ref={heading}>
          Dashboard
        </h1>
        {import.meta.env.DEV && client.demo && (
          <label className={styles.demoControl}>
            <span className={styles.srOnly}>Escenario de demostración</span>
            <select
              aria-label="Escenario de demostración"
              value=""
              onChange={(event) =>
                client.demo?.run(event.target.value as DemoScenario)
              }
            >
              <option value="" disabled>
                Escenarios · solo simulación
              </option>
              {(Object.entries(scenarioLabels) as [DemoScenario, string][]).map(
                ([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
        )}
        <PeriodSelector period={state.period} onChange={client.selectPeriod} />
      </div>
      <div
        className={`${styles.statusBar} ${state.stale || state.error ? styles.warning : ''}`}
      >
        <div role="status" aria-live="polite" aria-atomic="true">
          {state.phase === 'loading'
            ? 'Cargando ventas…'
            : state.phase === 'error'
              ? 'Consulta fallida; no equivale a un período sin ventas.'
              : state.stale
                ? `Datos no actualizados · ${state.dataLabel}${state.refreshing ? ' · Actualizando…' : ''}`
                : state.refreshing
                  ? 'Actualizando…'
                  : state.stream === 'reconnecting'
                    ? 'Actualización interrumpida; última lectura confirmada.'
                    : client.demo
                      ? 'Datos simulados · Sin conexión con ventas reales'
                      : 'Última lectura confirmada'}
        </div>
        {state.stale && (
          <Button
            className={styles.retry}
            onClick={client.refresh}
            disabled={state.refreshing}
          >
            Reintentar
          </Button>
        )}
        <span className={styles.clock} title={state.demoDescription}>
          {state.demonstration && <span>Datos de demostración · </span>}
          {state.clockLabel}
        </span>
      </div>
      {state.phase === 'unauthorized' ? null : hasSales && state.data ? (
        <div className={styles.dataArea} aria-busy={state.refreshing}>
          <SalesSummary summary={state.data.summary} />
          <div className={styles.panels}>
            <HourlySalesChart
              hourlySales={state.data.hourlySales}
              period={state.data.period}
              drawnThroughHour={state.drawnThroughHour}
              text={textHours}
              onTextChange={setTextHours}
            />
            <SoldProducts products={state.data.products} />
          </div>
        </div>
      ) : previousEmpty ? (
        <section
          className={styles.centralState}
          aria-label="Datos no actualizados"
        >
          <h2>No pudimos confirmar los resultados actuales</h2>
          <p>
            La última lectura de {state.dataLabel} no tenía ventas. No está
            confirmada para el período vigente.
          </p>
        </section>
      ) : (
        <DashboardState state={state} retry={client.refresh} />
      )}
      {import.meta.env.DEV && (
        <span className={styles.srOnly}>
          Escenario activo: {state.demoDescription}
        </span>
      )}
    </section>
  );
}
