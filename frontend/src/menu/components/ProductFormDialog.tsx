import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import styles from './Menu.module.css';
export function ProductFormDialog({
  children,
  title,
  onCancel,
}: {
  children: ReactNode;
  title: string;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('input, button, select')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="product-form-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="product-form-title">{title}</h2>
      {children}
    </dialog>
  );
}
