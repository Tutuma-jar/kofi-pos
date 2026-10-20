import type { DashboardSnapshot } from '../api/contract.provisional';
import { Button } from '../../shared/components/Button';
import styles from '../pages/DashboardPage.module.css';

export function DashboardState({
  state,
  retry,
}: {
  state: DashboardSnapshot;
  retry: () => void;
}) {
  if (state.phase === 'loading')
    return (
      <div
        className={styles.loading}
        aria-label="Cargando ventas"
        aria-busy="true"
      >
        <div className={styles.skeletonCards}>
          {[0, 1].map((index) => (
            <div key={index} />
          ))}
        </div>
        <div className={styles.skeletonBody}>
          <div />
          <div />
        </div>
      </div>
    );
  if (state.phase === 'error')
    return (
      <section
        className={styles.centralState}
        aria-labelledby="dashboard-error-title"
      >
        <h2 id="dashboard-error-title">No pudimos cargar las ventas</h2>
        <p>
          {state.error === 'VALIDATION_ERROR'
            ? 'No se pudo consultar este período.'
            : 'Los datos no están disponibles. No podemos confirmar los resultados del período.'}
        </p>
        <Button variant="primary" onClick={retry}>
          Reintentar
        </Button>
      </section>
    );
  return (
    <section className={styles.centralState} aria-label="Período sin ventas">
      <h2>
        {state.period === 'today'
          ? 'Aún no se realizaron ventas hoy'
          : 'Aún no se realizaron ventas este mes'}
      </h2>
    </section>
  );
}
