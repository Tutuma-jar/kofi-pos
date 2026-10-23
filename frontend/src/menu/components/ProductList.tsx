import { Button } from '../../shared/components/Button';
import { formatPrice } from '../api/menu-client';
import type { Category, Product } from '../api/menu-client';
import styles from './Menu.module.css';
import { ProductThumbnail } from './ProductThumbnail';
export function ProductList({
  products,
  categories,
  pending,
  edit,
  toggle,
}: {
  products: Product[];
  categories: Category[];
  pending: string[];
  edit: (product: Product) => void;
  toggle: (product: Product) => void;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.sr}>Productos del menú</caption>
        <thead>
          <tr>
            <th scope="col">Producto</th>
            <th scope="col">Categoría</th>
            <th scope="col">Precio</th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <div className={styles.product}>
                  <ProductThumbnail product={product} />
                  <div>
                    <strong>{product.name}</strong>
                    <p>{product.description}</p>
                  </div>
                </div>
              </td>
              <td>
                {
                  categories.find((item) => item.id === product.categoryId)
                    ?.name
                }
              </td>
              <td className={styles.price}>
                {formatPrice(product.priceTenths)}
              </td>
              <td>
                <span
                  className={product.active ? styles.active : styles.inactive}
                >
                  {product.active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td>
                <div className={styles.actions}>
                  <Button
                    aria-label={`Editar ${product.name}`}
                    disabled={pending.includes(product.id)}
                    onClick={() => edit(product)}
                  >
                    Editar
                  </Button>
                  <Button
                    aria-label={`${product.active ? 'Desactivar' : 'Reactivar'} ${product.name}`}
                    disabled={pending.includes(product.id)}
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
