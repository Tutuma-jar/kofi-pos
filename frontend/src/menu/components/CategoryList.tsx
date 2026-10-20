import { Button } from '../../shared/components/Button';
import type { Category } from '../api/menu-client';
import styles from './Menu.module.css';
export function CategoryList({
  categories,
  busy,
  edit,
  remove,
}: {
  categories: Category[];
  busy: boolean;
  edit: (category: Category) => void;
  remove: (category: Category) => void;
}) {
  return (
    <ul className={styles.categoryList}>
      {categories.map((category) => (
        <li key={category.id}>
          <strong>{category.name}</strong>
          <div className={styles.actions}>
            <Button
              disabled={busy}
              onClick={() => edit(category)}
              aria-label={`Renombrar ${category.name}`}
            >
              Renombrar
            </Button>
            <Button
              disabled={busy}
              onClick={() => remove(category)}
              aria-label={`Eliminar ${category.name}`}
            >
              Eliminar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
