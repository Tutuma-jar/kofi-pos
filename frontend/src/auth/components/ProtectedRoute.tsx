import { Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { useAuth } from '../auth-context';
import styles from '../pages/Access.module.css';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session.status === 'checking')
    return (
      <main className={styles.loading}>
        <p role="status">Comprobando sesión…</p>
      </main>
    );
  if (session.status === 'anonymous' || session.status === 'connection-error')
    return <Navigate to="/login" replace state={{ authRequired: true }} />;
  return children;
}
