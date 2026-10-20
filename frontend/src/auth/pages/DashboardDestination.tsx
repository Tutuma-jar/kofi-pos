import { useEffect, useRef } from 'react';
import { useAuth } from '../auth-context';
import { Button } from '../../shared/components/Button';
import styles from './Access.module.css';

export function DashboardDestination() {
  const { client } = useAuth();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = 'Dashboard · Kofi';
    heading.current?.focus();
  }, []);
  return (
    <section className={styles.destination} aria-labelledby="dashboard-heading">
      <h1 id="dashboard-heading" tabIndex={-1} ref={heading}>
        Dashboard
      </h1>
      <p className={styles.muted}>
        Este es el destino provisional de Acceso. Los indicadores y el contenido
        del Dashboard no forman parte de esta demostración.
      </p>
      <p className={styles.notice}>
        Para cerrar esta sesión, abre la navegación con el botón de menú.
      </p>
      {import.meta.env.DEV && (
        <>
          <div className={styles.actions}>
            <Button onClick={client.expire}>Simular sesión expirada</Button>
            <Button onClick={client.unauthorized}>
              Simular autorización ausente (401)
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
