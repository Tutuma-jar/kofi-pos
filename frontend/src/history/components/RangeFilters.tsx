import type { DateRange, Preset } from '../api/contract.provisional';
import { presetRange, sameRange } from '../api/dates';
import { Button } from '../../shared/components/Button';
import styles from '../pages/HistoryPage.module.css';

const presets: { value: Preset; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'last-seven', label: 'Últimos 7 días' },
  { value: 'this-month', label: 'Este mes' },
  { value: 'last-month', label: 'Mes anterior' },
];
export function RangeFilters({
  range,
  currentDate,
  error,
  busy,
  changed,
  onChange,
  onQuery,
  onPreset,
  onRefresh,
}: {
  range: DateRange;
  currentDate: string | null;
  error: string | null;
  busy: boolean;
  changed: boolean;
  onChange: (range: DateRange) => void;
  onQuery: () => void;
  onPreset: (preset: Preset) => void;
  onRefresh: () => void;
}) {
  return (
    <form
      className={styles.filters}
      aria-label="Filtrar por fechas"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onQuery();
      }}
    >
      <div className={styles.filterTop}>
        <span className={styles.filterTitle}>Período de consulta</span>
        <div
          className={styles.presets}
          role="group"
          aria-label="Atajos de fechas"
        >
          {presets.map(({ value, label }) => (
            <Button
              key={value}
              aria-pressed={
                !!currentDate &&
                sameRange(range, presetRange(value, currentDate))
              }
              disabled={!currentDate}
              onClick={() => onPreset(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <span className={styles.zone}>Horario de Bolivia · UTC−4</span>
      </div>
      <div className={styles.filterFields}>
        <label>
          Desde
          <input
            type="date"
            value={range.startDate}
            max={currentDate ?? undefined}
            disabled={!currentDate}
            aria-invalid={!!error}
            aria-describedby="range-help range-error"
            onChange={(event) =>
              onChange({ ...range, startDate: event.target.value })
            }
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={range.endDate}
            max={currentDate ?? undefined}
            disabled={!currentDate}
            aria-invalid={!!error}
            aria-describedby="range-help range-error"
            onChange={(event) =>
              onChange({ ...range, endDate: event.target.value })
            }
          />
        </label>
        <Button
          variant="primary"
          type="submit"
          disabled={!currentDate || !!error || (busy && !changed)}
        >
          Consultar rango
        </Button>
        <Button disabled={busy || changed || !!error} onClick={onRefresh}>
          Actualizar
        </Button>
        <p id="range-help" className={styles.help}>
          Fechas inclusivas · Máximo 366 días.
          <br />
          El rango se aplica a ventas y reportes.
        </p>
      </div>
      <p
        id="range-error"
        role={error ? 'alert' : undefined}
        className={styles.filterError}
      >
        {error}
      </p>
    </form>
  );
}
