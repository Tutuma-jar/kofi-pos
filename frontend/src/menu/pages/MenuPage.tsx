import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../../shared/components/Button';
import { menuClient, MenuError } from '../api/menu-client';
import type {
  Catalog,
  Product,
  ProductInput,
  Scenario,
} from '../api/menu-client';
import { CatalogFilters } from '../components/CatalogFilters';
import type { Filters } from '../components/CatalogFilters';
import { ProductList } from '../components/ProductList';
import { MenuState } from '../components/MenuState';
import { ProductFormDialog } from '../components/ProductFormDialog';
import { ProductForm } from '../components/ProductForm';
import { CategoriesPage } from './CategoriesPage';
import styles from './MenuPage.module.css';
function selectProducts(data: Catalog, filters: Filters) {
  return data.products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(filters.search.trim().toLowerCase()) &&
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
  const { client: auth } = useAuth();
  const [data, setData] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
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
  const [scenario, setScenario] = useState<Scenario>('normal');
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
  }
  async function edit(product: Product) {
    setOpening(true);
    setError('');
    try {
      setEditing(await menuClient.getProduct(product.id));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo cargar el producto.',
      );
    } finally {
      setOpening(false);
    }
  }
  async function toggle(product: Product) {
    setPending((ids) => [...ids, product.id]);
    setError('');
    try {
      await menuClient.setActive(product);
      setNotice(`${product.name}: ${product.active ? 'inactivo' : 'activo'}.`);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo cambiar el estado. Reintenta la acción.',
      );
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
  const products = data ? selectProducts(data, filters) : [];
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
              setEditing('new');
            }}
          >
            Agregar producto
          </Button>
        </div>
      </header>
      {data && (
        <CatalogFilters
          categories={data.categories}
          filters={filters}
          onChange={setFilters}
        />
      )}
      <div className={styles.update}>
        <span role="status">
          {opening
            ? 'Cargando producto…'
            : loading && data
              ? 'Actualizando catálogo…'
              : notice}
        </span>
        <Button disabled={loading} onClick={() => void load()}>
          Actualizar lista
        </Button>
      </div>
      {error && <MenuState message={error} retry={() => void load()} />}
      {loading && !data && <MenuState message="Cargando productos…" />}
      {data && (
        <>
          {!data.categories.length && (
            <MenuState message="Crea una categoría antes de agregar productos" />
          )}
          {!data.categories.length && (
            <Link to="/menu/categories">Crear categoría</Link>
          )}
          {!data.products.length ? (
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
            <MenuState message="Ningún producto coincide con los filtros" />
          ) : (
            <ProductList
              products={products}
              categories={data.categories}
              pending={pending}
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
              conflictMessage={
                notice.startsWith('Este producto cambió') ? notice : ''
              }
              onCategories={() => setCategoriesOpen(true)}
              onCancel={close}
              onSaved={() => {
                setEditing(null);
                setDraft(undefined);
                setNotice('Producto guardado.');
                void load();
              }}
              onConflict={(current) => {
                setDraft(undefined);
                setEditing(current);
                void menuClient
                  .list()
                  .then(setData)
                  .catch(() => undefined);
                setNotice(
                  'Este producto cambió mientras lo editabas. Revisa la versión actual y vuelve a aplicar tus cambios.',
                );
              }}
            />
          </ProductFormDialog>
        ))}
      <details className={styles.demo}>
        <summary>Datos simulados · escenarios de demostración</summary>
        <label>
          Escenario de Menú
          <select
            value={scenario}
            onChange={(event) => {
              const value = event.target.value as Scenario;
              setScenario(value);
              menuClient.setScenario(value);
              void load();
            }}
          >
            <option value="normal">Catálogo inicial (restablecer)</option>
            <option value="empty">Catálogo vacío</option>
            <option value="no-categories">Sin categorías</option>
            <option value="connection">Error de conexión</option>
            <option value="slow">Respuesta demorada</option>
            <option value="save-error">Error al guardar</option>
            <option value="conflict">
              Conflicto en la siguiente operación
            </option>
            <option value="image-error">Error al cargar imagen nueva</option>
          </select>
        </label>
        <Button onClick={() => auth.unauthorized()}>
          Simular sesión finalizada
        </Button>
      </details>
    </section>
  );
}
