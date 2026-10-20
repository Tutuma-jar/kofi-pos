import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../shared/components/Button';
import { menuClient, MenuError } from '../api/menu-client';
import type { Category } from '../api/menu-client';
import { CategoryList } from '../components/CategoryList';
import { CategoryForm } from '../components/CategoryForm';
import { MenuState } from '../components/MenuState';
import styles from './CategoriesPage.module.css';
export function CategoriesPage({ onBack }: { onBack?: () => void }) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  async function load() {
    setLoading(true);
    setError('');
    try {
      setCategories((await menuClient.list()).categories);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No pudimos consultar las categorías.',
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    void menuClient
      .list()
      .then((value) => {
        if (active) setCategories(value.categories);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(name: string) {
    setBusy(true);
    setError('');
    setFieldError('');
    setNotice('');
    try {
      await menuClient.saveCategory(
        name,
        editing && editing !== 'new' ? editing : undefined,
      );
      setEditing(null);
      await load();
      setNotice('Categoría guardada.');
    } catch (reason) {
      // Duplicate or length rejections belong to the field, not the page.
      if (reason instanceof MenuError && reason.fields.name) {
        setFieldError(reason.fields.name);
        return;
      }
      setError(
        reason instanceof Error ? reason.message : 'No pudimos guardar.',
      );
      if (reason instanceof MenuError && reason.code === 'CONFLICT') {
        try {
          const latest = (await menuClient.list()).categories;
          setCategories(latest);
          if (editing && editing !== 'new')
            setEditing(latest.find((item) => item.id === editing.id) ?? null);
        } catch {
          /* El conflicto sigue visible y su reintento recarga la lista. */
        }
      }
    } finally {
      setBusy(false);
    }
  }
  async function remove(category: Category) {
    if (
      !window.confirm(
        `¿Eliminar la categoría «${category.name}»? Esta acción no se puede deshacer.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await menuClient.deleteCategory(category);
      await load();
      setNotice('Categoría eliminada.');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'No pudimos eliminar.',
      );
      if (reason instanceof MenuError && reason.code === 'CONFLICT') {
        try {
          setCategories((await menuClient.list()).categories);
        } catch {
          /* El error original sigue visible. */
        }
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.page}>
      {onBack ? (
        <Button
          disabled={busy}
          onClick={() => {
            if (
              !editing ||
              window.confirm('¿Descartar los cambios de la categoría?')
            )
              onBack();
          }}
        >
          Volver al producto
        </Button>
      ) : (
        <Link to="/menu">Volver al menú</Link>
      )}
      <header className={styles.header}>
        <div>
          <h1>Categorías</h1>
          <p>Organiza los productos de tu cafetería.</p>
        </div>
        <Button
          variant="primary"
          disabled={busy || loading || !!editing}
          onClick={() => setEditing('new')}
        >
          Agregar categoría
        </Button>
      </header>
      {editing && (
        <CategoryForm
          key={editing === 'new' ? 'new' : `${editing.id}-${editing.version}`}
          initial={editing === 'new' ? '' : editing.name}
          busy={busy}
          serverError={fieldError}
          onInput={() => setFieldError('')}
          save={(name) => void save(name)}
          cancel={() => {
            if (window.confirm('¿Descartar los cambios de la categoría?')) {
              setFieldError('');
              setEditing(null);
            }
          }}
        />
      )}
      {error && <MenuState message={error} retry={() => void load()} />}
      <p role="status">{notice}</p>
      {loading ? (
        <MenuState message="Cargando categorías…" />
      ) : (
        categories &&
        (categories.length ? (
          <CategoryList
            categories={categories}
            busy={busy || !!editing}
            edit={setEditing}
            remove={(category) => void remove(category)}
          />
        ) : (
          <MenuState message="Aún no hay categorías. Crea la primera para organizar el menú." />
        ))
      )}
    </section>
  );
}
