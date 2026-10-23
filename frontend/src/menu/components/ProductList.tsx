import { Button } from '../../shared/components/Button';
import { formatPrice } from '../api/menu-client';
import type { Category, Product } from '../api/menu-client';
import styles from './Menu.module.css';
import { ProductThumbnail } from './ProductThumbnail';
export function ProductList({
  products,
  categories,
  pending,
  busy = false,
  edit,
  toggle,
}: {
  products: Product[];
  categories: Category[];
  pending: string[];
  busy?: boolean;
  edit: (product: Product) => void;
  toggle: (product: Product) => void;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} role="table">
        <caption className={styles.sr}>Productos del menú</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col">Producto</th>
            <th scope="col">Categoría</th>
            <th scope="col">Precio</th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {products.map((product) => (
            <tr key={product.id} role="row" data-product-id={product.id}>
              <td role="cell">
                <div className={styles.product}>
                  <ProductThumbnail product={product} />
                  <div>
                    <strong>{product.name}</strong>
                    <p>{product.description}</p>
                  </div>
                </div>
              </td>
              <td role="cell" data-label="Categoría">
                {
                  categories.find((item) => item.id === product.categoryId)
                    ?.name
                }
              </td>
              <td role="cell" data-label="Precio" className={styles.price}>
                {formatPrice(product.priceTenths)}
              </td>
              <td role="cell" data-label="Estado">
                <span
                  className={product.active ? styles.active : styles.inactive}
                >
                  {product.active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td role="cell" data-label="Acciones">
                <div className={styles.actions}>
                  <Button
                    aria-label={`Editar ${product.name}`}
                    disabled={busy || pending.includes(product.id)}
                    onClick={() => edit(product)}
                  >
                    Editar
                  </Button>
                  <Button
                    aria-label={`${product.active ? 'Desactivar' : 'Reactivar'} ${product.name}`}
                    disabled={busy || pending.includes(product.id)}
                    onClick={() => toggle(product)}
                  >
                    {pending.includes(product.id)
                      ? 'Guardando…'
                      : product.active
                        ? 'Desactivar'
                        : 'Reactivar'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
