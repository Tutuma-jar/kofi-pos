import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../shared/components/Button';
import { menuClient, MenuError } from '../api/menu-client';
import type { Catalog, Product, ProductInput } from '../api/menu-client';
import { CatalogFilters } from '../components/CatalogFilters';
import type { Filters } from '../components/CatalogFilters';
import { ProductList } from '../components/ProductList';
import { MenuState } from '../components/MenuState';
import { ProductFormDialog } from '../components/ProductFormDialog';
import { ProductForm } from '../components/ProductForm';
import { CategoriesPage } from './CategoriesPage';
import styles from './MenuPage.module.css';
// Same comparison as the backend name key: trim, NFC and lower case; no accent equivalence.
const searchKey = (text: string) => text.trim().normalize('NFC').toLowerCase();
function selectProducts(data: Catalog, filters: Filters) {
  const search = searchKey(filters.search);
  return data.products
    .filter(
      (p) =>
        searchKey(p.name).includes(search) &&
        (!filters.category || p.categoryId === filters.category) &&
        (!filters.state || p.active === (filters.state === 'active')),
    )
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        a.name.localeCompare(b.name, 'es'),
    );
}
export function MenuPage() {
  const [data, setData] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [operationError, setOperationError] = useState<{
    message: string;
    label: string;
    retry: () => void;
  } | null>(null);
  const [conflictMessage, setConflictMessage] = useState('');
  const [undo, setUndo] = useState<{
    id: string;
    name: string;
    active: boolean;
  } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    category: '',
    state: '',
  });
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [draft, setDraft] = useState<ProductInput & { priceText?: string }>();
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [opening, setOpening] = useState(false);
  const dirty = useRef(false);
  const saving = useRef(false);
  const summary = useRef<HTMLParagraphElement>(null);
  async function load() {
    setLoading(true);
    setError('');
    try {
      setData(await menuClient.list());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No pudimos consultar el catálogo.',
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
        if (active) setData(value);
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
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => {
      if (dirty.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, []);
  function close() {
    if (saving.current) return;
    if (
      dirty.current &&
      !window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?')
    )
      return;
    dirty.current = false;
    setEditing(null);
    setDraft(undefined);
    setConflictMessage('');
  }
  async function edit(product: Product) {
    setOpening(true);
    setOperationError(null);
    setNotice('');
    try {
      setEditing(await menuClient.getProduct(product.id));
      setDraft(undefined);
      setConflictMessage('');
    } catch (reason) {
      setOperationError({
        message:
          reason instanceof Error
            ? reason.message
            : 'No se pudo cargar el producto.',
        label: `Reintentar abrir ${product.name}`,
        retry: () => void edit(product),
      });
    } finally {
      setOpening(false);
    }
  }
  async function toggle(product: Product) {
    const previousFocus = document.activeElement;
    const focusedProduct = previousFocus
      ?.closest('[data-product-id]')
      ?.getAttribute('data-product-id');
    setPending((ids) => [...ids, product.id]);
    setOperationError(null);
    setNotice('');
    setUndo(null);
    try {
      await menuClient.setActive(product);
      setNotice(`${product.name}: ${product.active ? 'inactivo' : 'activo'}.`);
      setUndo({ id: product.id, name: product.name, active: product.active });
      await load();
      if (focusedProduct === product.id) {
        requestAnimationFrame(() => {
          if (!previousFocus?.isConnected) summary.current?.focus();
        });
      }
    } catch (reason) {
      setOperationError({
        message:
          reason instanceof Error
            ? reason.message
            : 'No se pudo cambiar el estado. Reintenta la acción.',
        label: `Reintentar cambio de estado de ${product.name}`,
        retry: () => void changeActivation(product.id, !product.active),
      });
      if (reason instanceof MenuError && reason.code === 'CONFLICT') {
        try {
          setData(await menuClient.list());
        } catch {
          /* Conservar datos anteriores y error. */
        }
      }
    } finally {
      setPending((ids) => ids.filter((id) => id !== product.id));
    }
  }
  async function changeActivation(id: string, active: boolean) {
    setUndoing(true);
    setOperationError(null);
    try {
      // Fetch the current version so a retry/undo never inverts a stale state.
      const current = await menuClient.getProduct(id);
      if (current.active !== active) await toggle(current);
      else {
        setNotice(`${current.name}: ${active ? 'activo' : 'inactivo'}.`);
        setUndo(null);
        await load();
      }
    } catch (reason) {
      setOperationError({
        message:
          reason instanceof Error
            ? reason.message
            : 'No se pudo consultar el producto.',
        label: 'Reintentar cambio de estado',
        retry: () => void changeActivation(id, active),
      });
    } finally {
      setUndoing(false);
    }
  }
  const products = data ? selectProducts(data, filters) : [];
  const filtered = !!(filters.search || filters.category || filters.state);
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Administración de Menú</h1>
          <p>Tu catálogo, al día.</p>
        </div>
        <div className={styles.actions}>
          <Link to="/menu/categories">Categorías</Link>
          <Button
            variant="primary"
            disabled={!data?.categories.length || opening}
            onClick={() => {
              setDraft(undefined);
              setConflictMessage('');
              setNotice('');
              setEditing('new');
            }}
          >
            Agregar producto
          </Button>
        </div>
      </header>
      {data && (
        <>
          <CatalogFilters
            categories={data.categories}
            filters={filters}
            onChange={(next) => {
              setFilters(next);
              setNotice('');
            }}
          />
        </>
      )}
      <div className={styles.update}>
        {data && (
          <p
            ref={summary}
            tabIndex={-1}
            className={styles.summary}
            aria-live="polite"
          >
            {products.length} de {data.products.length} productos
            {filtered ? ' · Filtros aplicados' : ''}
          </p>
        )}
        <Button disabled={loading} onClick={() => void load()}>
          Actualizar lista
        </Button>
      </div>
      <div className={styles.feedback}>
        <span role="status">
          {opening
            ? 'Cargando producto…'
            : loading && data
              ? 'Actualizando catálogo…'
              : notice}
        </span>
        {undo && (
          <Button
            disabled={undoing || loading || pending.length > 0}
            onClick={() => void changeActivation(undo.id, undo.active)}
          >
            Deshacer cambio de {undo.name}
          </Button>
        )}
      </div>
      {error && <MenuState message={error} retry={() => void load()} />}
      {operationError && (
        <MenuState
          message={operationError.message}
          retry={operationError.retry}
          retryLabel={operationError.label}
        />
      )}
      {loading && !data && <MenuState message="Cargando productos…" />}
      {data && (
        <>
          {!data.categories.length && (
            <MenuState message="Crea una categoría antes de agregar productos" />
          )}
          {!data.categories.length && (
            <Link to="/menu/categories">Crear categoría</Link>
          )}
          {!data.categories.length ? null : !data.products.length ? (
            <>
              <MenuState message="Aún no hay productos. Agrega el primero para empezar a vender." />
              <Button
                disabled={!data.categories.length}
                onClick={() => setEditing('new')}
              >
                Agregar el primer producto
              </Button>
            </>
          ) : !products.length ? (
            <div>
              <MenuState message="Ningún producto coincide con los filtros" />
              <Button
                onClick={() =>
                  setFilters({ search: '', category: '', state: '' })
                }
              >
                Mostrar todos los productos
              </Button>
            </div>
          ) : (
            <ProductList
              products={products}
              categories={data.categories}
              pending={pending}
              busy={undoing}
              edit={(p) => void edit(p)}
              toggle={(p) => void toggle(p)}
            />
          )}
        </>
      )}
      {editing &&
        data &&
        (categoriesOpen ? (
          <ProductFormDialog
            title="Administrar categorías"
            onCancel={() => {
              setCategoriesOpen(false);
              void load();
            }}
          >
            <div className={styles.categoryPanel}>
              <CategoriesPage
                onBack={() => {
                  setCategoriesOpen(false);
                  void load();
                }}
              />
            </div>
          </ProductFormDialog>
        ) : (
          <ProductFormDialog
            title={editing === 'new' ? 'Agregar producto' : 'Editar producto'}
            onCancel={close}
          >
            <ProductForm
              key={
                editing === 'new' ? 'new' : `${editing.id}-${editing.version}`
              }
              product={editing === 'new' ? undefined : editing}
              categories={data.categories}
              draft={draft}
              onDraft={setDraft}
              onDirty={(value) => {
                dirty.current = value;
              }}
              onBusy={(value) => {
                saving.current = value;
              }}
              conflictMessage={conflictMessage}
              onCategories={() => setCategoriesOpen(true)}
              onCancel={close}
              onSaved={() => {
                setEditing(null);
                setDraft(undefined);
                setConflictMessage('');
                setNotice('Producto guardado.');
                void load();
              }}
              onConflict={(current, localDraft) => {
                setDraft(localDraft);
                setEditing(current);
                void menuClient
                  .list()
                  .then(setData)
                  .catch(() => undefined);
                setConflictMessage(
                  'Conservamos tus cambios para compararlos con la versión actual.',
                );
              }}
            />
          </ProductFormDialog>
        ))}
    </section>
  );
}
