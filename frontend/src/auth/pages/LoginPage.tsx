import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../auth-context';
import { Button } from '../../shared/components/Button';
import styles from './Access.module.css';

export function LoginPage() {
  const { client, session } = useAuth();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    document.title = 'Iniciar sesión · Kofi';
    if (session.status === 'anonymous') heading.current?.focus();
  }, [session.status]);
  if (session.status === 'checking')
    return (
      <div className={styles.loading} role="status">
        Comprobando sesión…
      </div>
    );
  if (session.status === 'connection-error')
    return (
      <main className={styles.loading}>
        <p role="alert">
          No pudimos comprobar la sesión. Revisa la conexión y permite el
          almacenamiento del sitio en Chrome o Edge actualizado.
        </p>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </main>
    );
  if (session.status !== 'anonymous')
    return <Navigate to="/dashboard" replace />;
  const notice =
    session.reason === 'closed'
      ? 'Sesión cerrada. Para volver a operar, inicia sesión nuevamente.'
      : session.reason === 'expired'
        ? 'Tu sesión finalizó. Inicia sesión nuevamente.'
        : session.reason === 'required' || location.state?.authRequired === true
          ? 'Inicia sesión para continuar.'
          : '';
  return (
    <main className={styles.page}>
      <aside className={styles.identity} aria-label="Kofi">
        <div className={styles.brand}>kofi</div>
        <div className={styles.intro}>
          <h2>Todo listo para empezar.</h2>
          <p className={styles.muted}>
            Accede al punto de venta con la cuenta de tu equipo.
          </p>
        </div>
        <p className={styles.caption}>Punto de venta</p>
      </aside>
      <section className={styles.work} aria-labelledby="login-heading">
        <form
          className={styles.form}
          aria-busy={pending}
          onSubmit={(event) => {
            event.preventDefault();
            if (inFlight.current) return;
            const form = event.currentTarget;
            const data = new FormData(form);
            setPending(true);
            inFlight.current = true;
            setError('');
            void client
              .login({
                username: String(data.get('username') ?? ''),
                password: String(data.get('password') ?? ''),
              })
              .then((result) => {
                if (result === 'accepted' || result === 'superseded')
                  form.reset();
                else {
                  const password = form.elements.namedItem('password');
                  if (password instanceof HTMLInputElement) password.value = '';
                }
                setPending(false);
                inFlight.current = false;
                if (result === 'incorrect')
                  setError(
                    'Usuario o contraseña incorrectos. Revisa los datos e intenta nuevamente.',
                  );
                if (result === 'connection')
                  setError('No pudimos conectar. Intenta nuevamente.');
                if (String(result) === 'rate-limited')
                  setError(
                    'Demasiados intentos. Espera un momento e intenta nuevamente.',
                  );
                if (String(result) === 'unsupported')
                  setError(
                    'No pudimos proteger esta pestaña. Usa Chrome o Edge actualizado y permite el almacenamiento del sitio.',
                  );
                if (String(result) === 'error')
                  setError('No pudimos iniciar sesión. Intenta nuevamente.');
              })
              .catch(() => {
                setPending(false);
                inFlight.current = false;
                const password = form.elements.namedItem('password');
                if (password instanceof HTMLInputElement) password.value = '';
                setError('No pudimos iniciar sesión. Intenta nuevamente.');
              });
          }}
        >
          <h1 id="login-heading" ref={heading} tabIndex={-1}>
            Iniciar sesión
          </h1>
          <p className={styles.muted}>Ingresa tu usuario y contraseña.</p>
          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}
          {error && (
            <p
              id="login-error"
              className={`${styles.notice} ${styles.error}`}
              role="alert"
            >
              {error}
            </p>
          )}
          <label className={styles.field}>
            Usuario
            <input
              name="username"
              autoComplete="username"
              maxLength={128}
              required
              readOnly={pending}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </label>
          <label className={styles.field}>
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              maxLength={1024}
              required
              readOnly={pending}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </label>
          <Button
            type="submit"
            variant="primary"
            className={styles.submit}
            disabled={pending}
          >
            {pending ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </Button>
          {pending && (
            <p role="status" className={styles.caption}>
              Comprobando los datos de acceso…
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
