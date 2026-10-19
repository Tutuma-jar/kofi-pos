import type { DashboardPeriod } from '../api/contract.provisional';
import styles from '../pages/DashboardPage.module.css';

export function PeriodSelector({
  period,
  onChange,
}: {
  period: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
}) {
  return (
    <fieldset className={styles.period}>
      <legend className={styles.srOnly}>Período de ventas</legend>
      {(
        [
          ['today', 'Hoy'],
          ['month', 'Este mes'],
        ] as const
      ).map(([value, label]) => (
        <label key={value} className={period === value ? styles.selected : ''}>
          <input
            type="radio"
            name="dashboard-period"
            value={value}
            checked={period === value}
            onChange={() => onChange(value)}
          />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
