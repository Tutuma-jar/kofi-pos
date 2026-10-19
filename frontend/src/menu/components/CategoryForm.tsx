import { useEffect, useState } from 'react';
import { Button } from '../../shared/components/Button';
import { visibleLength } from '../api/menu-client';
import styles from './Menu.module.css';
export function CategoryForm({
  initial = '',
  busy,
  save,
  cancel,
}: {
  initial?: string;
  busy: boolean;
  save: (name: string) => void;
  cancel: () => void;
}) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState('');
  useEffect(() => {
    if (name === initial) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest('a') &&
        !window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', navigate, true);
    };
  }, [name, initial]);
  return (
    <form
      className={styles.categoryForm}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        if (visibleLength(name) < 1 || visibleLength(name) > 80) {
          setError('Escribe un nombre de 1 a 80 caracteres.');
          e.currentTarget.querySelector('input')?.focus();
        } else save(name);
      }}
    >
      <label htmlFor="category-name">Nombre de categoría</label>
      <input
        id="category-name"
        value={name}
        disabled={busy}
        autoFocus
        aria-invalid={!!error}
        aria-describedby="category-name-error"
        onChange={(e) => setName(e.target.value)}
      />
      <span id="category-name-error" className={styles.error}>
        {error}
      </span>
      <div className={styles.actions}>
        <Button disabled={busy} onClick={cancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar categoría'}
        </Button>
      </div>
    </form>
  );
}
