import { memo } from 'react';
import type {
  DashboardPeriod,
  DashboardResponse,
} from '../api/contract.provisional';
import { hourLabel } from '../api/presentation';
import { Button } from '../../shared/components/Button';
import styles from '../pages/DashboardPage.module.css';

export const HourlySalesChart = memo(function HourlySalesChart({
  hourlySales,
  period,
  drawnThroughHour,
  text,
  onTextChange,
}: {
  hourlySales: DashboardResponse['hourlySales'];
  period: DashboardPeriod;
  drawnThroughHour: number;
  text: boolean;
  onTextChange: (text: boolean) => void;
}) {
  const visible =
    period === 'month'
      ? hourlySales
      : hourlySales.filter((point) => point.hour <= drawnThroughHour);
  // This maximum determines SVG geometry only; it is not an additional metric.
  const scale = Math.max(1, ...visible.map((point) => point.salesCount));
  const path = visible
    .map(
      (point, index) =>
        `${index ? 'L' : 'M'}${(point.hour / 23) * 100},${100 - (point.salesCount / scale) * 100}`,
    )
    .join(' ');
  return (
    <section className={styles.chart} aria-labelledby="hours-title">
      <div className={styles.panelHeading}>
        <h2 id="hours-title">Ventas por hora</h2>
        <Button
          className={styles.viewToggle}
          aria-pressed={text}
          aria-controls="hourly-content"
          onClick={() => onTextChange(!text)}
        >
          {text ? 'Ver gráfico' : 'Ver valores por hora'}
        </Button>
      </div>
      <div id="hourly-content" className={styles.hourlyContent}>
        {text ? (
          <dl
            className={styles.hourValues}
            aria-label="Hora y cantidad de ventas"
          >
            {visible.map((point) => (
              <div key={point.hour}>
                <dt>{hourLabel(point.hour)}</dt>
                <dd>{point.salesCount}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className={styles.plot}>
            <div className={styles.yAxis} aria-hidden="true">
              <span>Ventas</span>
              <span>{scale}</span>
              <span>0</span>
            </div>
            <div className={styles.drawing}>
              <div className={styles.gridLines} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                role="img"
                aria-labelledby="hourly-chart-description"
              >
                <title id="hourly-chart-description">
                  Cantidad de ventas por hora. Usa «Ver valores por hora» para
                  consultar las cantidades exactas.
                </title>
                <path
                  d={path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
                {visible.length === 1 && visible[0] && (
                  <circle
                    cx="0"
                    cy={100 - (visible[0].salesCount / scale) * 100}
                    r="1"
                    fill="currentColor"
                  />
                )}
              </svg>
            </div>
            <div className={styles.xAxis} aria-label="Horas de 0 a 23">
              {hourlySales.map(({ hour }) => (
                <span key={hour} style={{ left: `${(hour / 23) * 100}%` }}>
                  {hour}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className={styles.chartNote}>
        {period === 'today'
          ? `Horario de Bolivia · Hasta las ${hourLabel(drawnThroughHour)}; sin trazar horas futuras.`
          : 'Horario de Bolivia · Suma de cada franja de todos los días del mes.'}
      </p>
    </section>
  );
});
