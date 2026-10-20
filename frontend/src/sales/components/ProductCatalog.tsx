import { useEffect, useRef, useState } from 'react';
import { Button } from '../../shared/components/Button';
import { formatMoney } from '../api/amounts';
import type { Product } from '../api/contract.provisional';
import { useSales } from '../state/sales-context';
import styles from '../pages/SalesPage.module.css';

function ProductImage({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  return product.image && !failed ? (
    <img
      className={styles.image}
      src={product.image}
      alt=""
      onError={() => setFailed(true)}
    />
  ) : (
    <span className={styles.placeholder}>Sin imagen</span>
  );
}
function ProductDetails({
  product,
  close,
}: {
  product: Product;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className={styles.dialog}
      ref={dialog}
      aria-labelledby="product-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <h2 id="product-title">{product.name}</h2>
      <p>{product.description}</p>
      <p>{formatMoney(product.priceTenths)}</p>
      <Button onClick={close} autoFocus>
        Cerrar detalle
      </Button>
    </dialog>
  );
}
export function ProductCatalog() {
  const { state, add, open } = useSales();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState<Product | null>(null);
  const disabled = state.busy || state.phase !== 'editing';
  const query = search.normalize('NFC').trim().toLocaleLowerCase('es');
  const products =
    state.catalog?.products.filter(
      (p) =>
        p.active &&
        (!category || p.categoryId === category) &&
        p.name.normalize('NFC').toLocaleLowerCase('es').includes(query),
    ) ?? [];
  const categories =
    state.catalog?.categories.filter((c) =>
      state.catalog?.products.some((p) => p.active && p.categoryId === c.id),
    ) ?? [];
  return (
    <section
      className={styles.catalog}
      aria-label="Catálogo para vender"
      aria-busy={state.catalogStatus === 'loading'}
    >
      <label className={styles.search}>
        Buscar productos
        <input
          type="search"
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div
        className={styles.categories}
        role="group"
        aria-label="Filtrar por categoría"
      >
        <button aria-pressed={!category} onClick={() => setCategory('')}>
          Todos
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div
        className={styles.catalogScroll}
        tabIndex={0}
        aria-label="Productos disponibles"
      >
        {state.catalogStatus === 'loading' ? (
          <div className={styles.empty} role="status">
            <h2>Cargando productos…</h2>
            <p>Consultando el catálogo simulado.</p>
          </div>
        ) : state.catalogStatus === 'error' ? (
          <div className={styles.empty} role="alert">
            <h2>No pudimos cargar el catálogo</h2>
            <p>
              No es un catálogo vacío. Comprueba la conexión y vuelve a
              consultar.
            </p>
            <Button onClick={() => void open()} disabled={state.busy}>
              Reintentar consulta
            </Button>
          </div>
        ) : !state.catalog?.products.length ? (
          <div className={styles.empty} role="status">
            <h2>No hay productos disponibles</h2>
            <p>El catálogo no tiene productos activos para vender.</p>
          </div>
        ) : !products.length ? (
          <div className={styles.empty} role="status">
            <h2>Sin resultados</h2>
            <p>Prueba otro nombre o categoría.</p>
            <Button
              onClick={() => {
                setSearch('');
                setCategory('');
              }}
            >
              Limpiar búsqueda y filtros
            </Button>
          </div>
        ) : (
          <div className={styles.products}>
            {products.map((product) => {
              const quantity = state.lines.find(
                (line) => line.product.id === product.id,
              )?.quantity;
              return (
                <article className={styles.product} key={product.id}>
                  <button
                    className={styles.addProduct}
                    disabled={disabled}
                    onClick={() => add(product)}
                    aria-label={`Agregar ${product.name}`}
                  >
                    <ProductImage product={product} />
                    <span className={styles.productName}>{product.name}</span>
                    <span className={styles.productPrice}>
                      {formatMoney(product.priceTenths)}
                    </span>
                    <span className={styles.addLabel}>
                      {quantity
                        ? `${quantity} en el pedido · Agregar`
                        : 'Agregar al pedido'}
                    </span>
                  </button>
                  <button
                    className={styles.detailsButton}
                    onClick={() => setDetails(product)}
                    aria-label={`Ver descripción de ${product.name}`}
                  >
                    Ver detalle
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
      <p className={styles.catalogHint}>
        Seleccionar productos no registra una venta.
      </p>
      {details && (
        <ProductDetails product={details} close={() => setDetails(null)} />
      )}
    </section>
  );
}
