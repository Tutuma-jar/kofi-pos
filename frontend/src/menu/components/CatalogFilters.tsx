import type { Category } from '../api/menu-client';
import styles from './Menu.module.css';
import { Button } from '../../shared/components/Button';
export type Filters = { search: string; category: string; state: string };
export function CatalogFilters({
  categories,
  filters,
  onChange,
}: {
  categories: Category[];
  filters: Filters;
  onChange: (value: Filters) => void;
}) {
  return (
    <div className={styles.filters}>
      <label>
        Buscar por nombre
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Nombre del producto"
        />
      </label>
      <label>
        Categoría
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
        >
          <option value="">Todas las categorías</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Estado
        <select
          value={filters.state}
          onChange={(e) => onChange({ ...filters, state: e.target.value })}
        >
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </label>
      {(filters.search || filters.category || filters.state) && (
        <Button
          onClick={() => onChange({ search: '', category: '', state: '' })}
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
