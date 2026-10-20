import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../../shared/components/Button';
import type {
  DateRange,
  DemoScenario,
  HistoryClient,
  Preset,
  SaleRow,
} from '../api/contract.provisional';
import { createDemoHistoryClient } from '../api/demo-client';
import {
  formatRange,
  formatTimestamp,
  presetRange,
  sameRange,
  validateRange,
} from '../api/dates';
import { scenarioLabels } from '../api/fixtures';
import { useHistory } from '../state/useHistory';
import { RangeFilters } from '../components/RangeFilters';
import { HistoryTable } from '../components/HistoryTable';
import { PeriodReports } from '../components/PeriodReports';
import { SaleDetailDialog } from '../components/SaleDetailDialog';
import styles from './HistoryPage.module.css';

export function HistoryPage({ client: supplied }: { client?: HistoryClient }) {
  const { client: auth } = useAuth();
  const [owned] = useState(() => supplied ?? createDemoHistoryClient({ auth }));
  const client = supplied ?? owned;
  const history = useHistory(client);
  const [draft, setDraft] = useState<DateRange | null>(null);
  const [scenario, setScenario] = useState<DemoScenario>('normal');
  const [selected, setSelected] = useState<SaleRow | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = 'Historial y reportes · Kofi';
    heading.current?.focus();
  }, []);
  const range = draft ?? history.data?.range ?? { startDate: '', endDate: '' };
  const validation = history.currentDate
    ? validateRange(range, history.currentDate)
    : null;
  const changed =
    !!draft && (!history.data || !sameRange(draft, history.data.range));
  const busy = history.phase === 'loading';
  const data = !validation && !changed ? history.data : null;
  const query = (next: DateRange) => {
    if (!history.currentDate || validateRange(next, history.currentDate))
      return;
    setDraft(next);
    setSelected(null);
    history.read(next);
  };
  const shortcut = (preset: Preset) => {
    if (history.currentDate) query(presetRange(preset, history.currentDate));
  };
  return (
    <section className={styles.page} aria-labelledby="history-title">
      <div className={styles.pageHeader}>
        <div>
          <h1 id="history-title" ref={heading} tabIndex={-1}>
            Historial y reportes
          </h1>
          <p>Revisa las ventas registradas y los resultados del período.</p>
        </div>
        {client.demo && (
          <details className={styles.demo}>
            <summary>Datos de demostración</summary>
            <p>
              Ventas ficticias, sin conexión con ventas reales ni escrituras en
              la base de datos.
            </p>
            <label>
              Escenario simulado
              <select
                value={scenario}
                onChange={(event) => {
                  const next = event.target.value as DemoScenario;
                  client.demo?.setScenario(next);
                  setScenario(next);
                  setSelected(null);
                  // Cambiar de escenario relee el rango aplicado, no aplica borradores inválidos.
                  setDraft(null);
                  history.refresh();
                }}
              >
                {Object.entries(scenarioLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </details>
        )}
      </div>
      <RangeFilters
        range={range}
        currentDate={history.currentDate}
        error={validation}
        busy={busy}
        changed={changed}
        onChange={setDraft}
        onPreset={shortcut}
        onQuery={() => query(range)}
        onRefresh={() => {
          setSelected(null);
          history.refresh();
        }}
      />
      <div
        className={styles.readStatus}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {validation
          ? 'Corrige el rango para consultar. No se muestran resultados de fechas inválidas.'
          : changed && !busy
            ? 'Fechas modificadas. Consulta el rango para ver sus ventas y reportes.'
            : busy
              ? data
                ? 'Actualizando consulta… Los datos anteriores todavía no están actualizados.'
                : 'Cargando historial y reportes…'
              : history.phase === 'error'
                ? data
                  ? 'Datos no actualizados · Se conserva la última consulta confirmada.'
                  : 'Consulta fallida · No equivale a un rango sin ventas.'
                : data
                  ? `Rango consultado: ${formatRange(data.range)} · Lectura al ${formatTimestamp(data.cutoffAt)} · Bolivia`
                  : 'Consulta un rango para continuar.'}
      </div>
      {history.phase === 'error' && !validation && (
        <div className={styles.error} role="alert">
          <p>
            <strong>No pudimos actualizar la consulta.</strong> {history.error}{' '}
            {data
              ? 'La lista y los reportes conservados no están actualizados.'
              : 'No se pudo comprobar si hay ventas en este rango.'}
          </p>
          <Button onClick={() => history.refresh()}>Reintentar consulta</Button>
        </div>
      )}
      {!data && (
        <div className={styles.pending}>
          {busy && !validation ? (
            <p>Preparando la consulta del período…</p>
          ) : validation || changed ? (
            <p>Consulta un rango válido para ver las ventas y sus reportes.</p>
          ) : history.phase === 'error' ? (
            <p>Los resultados no están disponibles. Reintenta la consulta.</p>
          ) : null}
        </div>
      )}
      {data && (
        <div className={styles.workspace} aria-busy={busy}>
          <section
            className={styles.historyPanel}
            aria-labelledby="sales-heading"
          >
            <header className={styles.sectionHeader}>
              <div>
                <h2 id="sales-heading">Ventas registradas</h2>
                <p>Más recientes primero · Hasta 50 por página</p>
              </div>
              {history.phase !== 'ready' && (
                <span className={styles.stale}>No actualizado</span>
              )}
            </header>
            {data.items.length ? (
              <HistoryTable
                data={data}
                busy={busy || history.phase === 'error'}
                onDetail={setSelected}
                onPage={history.page}
              />
            ) : (
              <div className={styles.empty}>
                <h3>
                  {history.phase === 'ready'
                    ? 'No se registraron ventas en este rango'
                    : 'La última consulta no tenía ventas'}
                </h3>
                <p>
                  {history.phase === 'ready'
                    ? 'Puedes elegir otro período en los filtros.'
                    : 'No se ha confirmado si el rango sigue sin ventas.'}
                </p>
              </div>
            )}
          </section>
          <section
            className={styles.reportPanel}
            aria-labelledby="reports-heading"
          >
            <header className={styles.sectionHeader}>
              <div>
                <h2 id="reports-heading">Reporte del período</h2>
                <p>{formatRange(data.range)} · Bolivia</p>
              </div>
              {history.phase !== 'ready' && (
                <span className={styles.stale}>No actualizado</span>
              )}
            </header>
            {history.phase !== 'ready' &&
            data.reports.kind === 'ready' &&
            !data.reports.summary.salesCount ? (
              <div className={styles.empty}>
                <p>
                  La última consulta no tenía datos. El reporte no está
                  actualizado.
                </p>
              </div>
            ) : (
              <PeriodReports
                reports={data.reports}
                onRetry={history.refresh}
                busy={busy}
              />
            )}
          </section>
        </div>
      )}
      <p className={styles.footerNote}>
        Consulta de solo lectura. Las ventas registradas por error también se
        incluyen; no hay anulaciones ni devoluciones.
      </p>
      {selected && (
        <SaleDetailDialog
          key={selected.saleRef}
          sale={selected}
          client={client}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
