import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../auth-context';
import { Button } from '../../shared/components/Button';
import { AuthenticatedLayout } from '../../shared/layout/AuthenticatedLayout';
import styles from './AuthenticatedAccess.module.css';

export function AuthenticatedAccess({
  children,
  title,
  bounded = false,
  beforeLogout,
}: {
  children: ReactNode;
  title: string;
  bounded?: boolean;
  beforeLogout?: () => boolean;
}) {
  const { client, session } = useAuth();
  const statusHeading = useRef<HTMLHeadingElement>(null);
  const closing = session.status === 'closing';
  const blocked = closing || session.status === 'close-error';

  useEffect(() => {
    const heading = statusHeading.current;
    // El menú modal puede seguir abierto ante un cambio externo de estado.
    // Nunca intentar enfocar su fondo mientras continúa inerte.
    if (blocked && heading?.isConnected && !heading.closest('[inert]'))
      heading.focus();
  }, [blocked]);

  return (
    <AuthenticatedLayout
      title={title}
      bounded={bounded}
      accountLabel={'label' in session ? session.label : ''}
      onLogout={() => {
        if (beforeLogout && !beforeLogout()) return;
        void client.logout();
      }}
      logoutDisabled={closing}
      contentInert={blocked}
      statusSlot={
        blocked ? (
          <section
            className={styles.status}
            aria-label="Estado del cierre"
            role="status"
          >
            <h2 ref={statusHeading} tabIndex={-1}>
              {closing ? 'Cerrando sesión…' : 'El cierre no está confirmado'}
            </h2>
            <p>
              {closing
                ? 'Espera la confirmación. El acceso está suspendido mientras se cierra la sesión.'
                : session.status === 'close-error' && session.uncertain
                  ? 'No pudimos confirmar el cierre de sesión. No podemos afirmar que el acceso haya sido revocado.'
                  : 'No se completó el cierre. El acceso sigue suspendido en esta pantalla.'}
            </p>
            {!closing && (
              <Button
                onClick={() => {
                  void client.logout();
                }}
              >
                Reintentar cierre
              </Button>
            )}
          </section>
        ) : null
      }
    >
      {children}
    </AuthenticatedLayout>
  );
}
