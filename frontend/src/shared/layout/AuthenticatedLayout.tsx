import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import type { ReactNode } from 'react';
import { Button } from '../components/Button';
import styles from './Layout.module.css';

export function AuthenticatedLayout({
  children,
  title,
  accountLabel,
  onLogout,
  logoutDisabled = false,
  contentInert = false,
  statusSlot,
  footerSlot,
  bounded = false,
}: {
  children: ReactNode;
  title: string;
  accountLabel: string;
  onLogout: () => void;
  logoutDisabled?: boolean;
  contentInert?: boolean;
  statusSlot?: ReactNode;
  footerSlot?: ReactNode;
  bounded?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [narrow, setNarrow] = useState(
    () => window.matchMedia('(max-width: 760px)').matches,
  );
  const toggle = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const focusOnClose = useRef<'toggle' | 'content' | null>(null);
  const close = () => {
    dialog.current?.close();
    focusOnClose.current = 'toggle';
    setOpen(false);
  };
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const change = () => {
      dialog.current?.close();
      focusOnClose.current = 'toggle';
      setOpen(false);
      setNarrow(query.matches);
    };
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!open) {
      if (focusOnClose.current === 'toggle') toggle.current?.focus();
      if (focusOnClose.current === 'content') content.current?.focus();
      focusOnClose.current = null;
      return;
    }
    if (!narrow) return;
    const element = dialog.current;
    const previous = document.body.style.overflow;
    element?.showModal();
    closeButton.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = previous;
    };
  }, [open, narrow]);
  const navigation = (modal: boolean) => (
    <div className={styles.sidebar}>
      {modal && (
        <>
          <Button className={styles.close} ref={closeButton} onClick={close}>
            Cerrar navegación
          </Button>
          <h2 className={styles.modalTitle} id="navigation-title">
            Navegación
          </h2>
        </>
      )}
      <div className={styles.brand}>kofi</div>
      <nav aria-label="Principal">
        <NavLink
          to="/dashboard"
          className={styles.link}
          onClick={() => {
            dialog.current?.close();
            focusOnClose.current = 'content';
            setOpen(false);
          }}
        >
          Dashboard
        </NavLink>
      </nav>
      <div className={styles.footer}>
        <p>{accountLabel}</p>
        <Button
          className={styles.logout}
          disabled={logoutDisabled}
          onClick={() => {
            close();
            onLogout();
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
  return (
    <div className={[styles.shell, bounded ? styles.bounded : ''].join(' ')}>
      <a href="#main-content" className={styles.skip} inert={narrow && open}>
        Ir al contenido
      </a>
      {!narrow && (
        <aside id="shared-navigation" className={styles.rail} hidden={!open}>
          {open && navigation(false)}
        </aside>
      )}
      {narrow && (
        <dialog
          id="shared-navigation"
          className={styles.dialog}
          ref={dialog}
          aria-labelledby="navigation-title"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Tab') return;
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                'button:not(:disabled), a[href]',
              ),
            );
            const first = items[0];
            const last = items.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
        >
          {open && navigation(true)}
        </dialog>
      )}
      <div className={styles.main} inert={narrow && open}>
        <header className={styles.header}>
          <button
            className={styles.toggle}
            ref={toggle}
            aria-label={open ? 'Cerrar navegación' : 'Abrir navegación'}
            aria-expanded={open}
            aria-controls="shared-navigation"
            onClick={() => {
              if (open) close();
              else setOpen(true);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M3 5h14M3 10h14M3 15h14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
          <span>
            Punto de venta <span aria-hidden="true">/</span> {title}
          </span>
        </header>
        <main id="main-content" ref={content} tabIndex={-1}>
          {statusSlot}
          <div className={styles.content} inert={contentInert}>
            {children}
          </div>
          {footerSlot}
        </main>
      </div>
    </div>
  );
}
