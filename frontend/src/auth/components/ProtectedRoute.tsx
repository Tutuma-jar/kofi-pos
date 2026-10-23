import { Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { useAuth } from '../auth-context';
import styles from '../pages/Access.module.css';
import guardStyles from './ProtectedRoute.module.css';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const content = useRef<HTMLDivElement>(null);
  const revalidating =
    session.status === 'checking' && session.label !== undefined;
  useLayoutEffect(() => {
    if (!revalidating) return;
    // Modal dialogs escape ancestor inertness: block them explicitly as well.
    const dialogs = Array.from(
      content.current?.querySelectorAll('dialog') ?? [],
    );
    const previous = dialogs.map((dialog) => Boolean(dialog.inert));
    dialogs.forEach((dialog) => {
      dialog.inert = true;
    });
    return () => {
      dialogs.forEach((dialog, index) => {
        dialog.inert = previous[index]!;
      });
    };
  }, [revalidating]);
  if (session.status === 'checking' && !revalidating)
    return (
      <main className={styles.loading}>
        <p role="status">Comprobando sesión…</p>
      </main>
    );
  if (session.status === 'anonymous' || session.status === 'connection-error')
    return <Navigate to="/login" replace state={{ authRequired: true }} />;
  return (
    <>
      {revalidating && <p role="status">Comprobando sesión…</p>}
      <div
        ref={content}
        className={guardStyles.content}
        inert={revalidating}
        aria-busy={revalidating}
      >
        {children}
      </div>
    </>
  );
}
