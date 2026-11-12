import type { Category } from '@/lib/api/finance-types';
import { categoryTypeLabel } from '@/lib/finance/labels';
import styles from './finance-forms.module.css';

type CategoryListProps = {
  categories: Category[];
};

export function CategoryList({ categories }: CategoryListProps) {
  if (categories.length === 0) {
    return <p className={styles.meta}>Aún no hay categorías.</p>;
  }

  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return (
    <ul className={styles.list}>
      {sorted.map((category) => (
        <li key={category.id} className={styles.listItem}>
          <div className={styles.listItemHeader}>
            <strong>{category.name}</strong>
            <span className={styles.meta}>{categoryTypeLabel(category.type)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
