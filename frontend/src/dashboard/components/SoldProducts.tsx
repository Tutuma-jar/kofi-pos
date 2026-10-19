import { memo } from 'react';
import type { DashboardResponse } from '../api/contract.provisional';
import { money } from '../api/presentation';
import styles from '../pages/DashboardPage.module.css';

export const SoldProducts = memo(function SoldProducts({
  products,
}: {
  products: DashboardResponse['products'];
}) {
  return (
    <section className={styles.products} aria-labelledby="products-title">
      <div className={styles.panelHeading}>
        <h2 id="products-title">Productos vendidos</h2>
        <span className={styles.muted}>Más recientes primero</span>
      </div>
      <div
        className={styles.productScroll}
        tabIndex={0}
        role="region"
        aria-label="Lista completa de productos vendidos"
      >
        <table className={styles.productTable}>
          <caption className={styles.srOnly}>
            Productos del período, ordenados por su venta más reciente
          </caption>
          <colgroup>
            <col />
            <col className={styles.unitsColumn} />
            <col className={styles.revenueColumn} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col">Unidades</th>
              <th scope="col">Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.productId}>
                <th scope="row">{product.currentName}</th>
                <td>{product.unitsSold}</td>
                <td>{money(product.revenueTenths)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});
