'use client';

import Link from 'next/link';
import type { Category, CategoryType } from '@/lib/api/finance-types';
import { categoryTypeLabel } from '@/lib/finance/labels';
import { categoryOptionLabel, sortCategoriesForSelect } from '@/lib/finance/category-options';
import { Field } from '@/components/ui/field';
import styles from './finance-forms.module.css';

type CategorySelectFieldProps = {
  id: string;
  spaceId: string;
  categories: Category[];
  categoryType: CategoryType;
  value: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
};

export function CategorySelectField({
  id,
  spaceId,
  categories,
  categoryType,
  value,
  onChange,
  disabled = false,
}: CategorySelectFieldProps) {
  const sorted = sortCategoriesForSelect(categories);
  const categoriesHref = `/spaces/${spaceId}/categories`;
  const typeLabel = categoryTypeLabel(categoryType).toLowerCase();

  if (sorted.length === 0) {
    return (
      <Field
        id={id}
        label="Categoría (opcional)"
        hint={`Aún no hay categorías de ${typeLabel} en este espacio.`}
      >
        <p className={styles.meta}>
          <Link href={categoriesHref}>Crear categorías</Link> y vuelve aquí para clasificar el
          movimiento.
        </p>
      </Field>
    );
  }

  return (
    <Field id={id} label="Categoría (opcional)">
      <select
        id={id}
        className={styles.selectNative}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">Sin categoría</option>
        {sorted.map((category) => (
          <option key={category.id} value={category.id}>
            {categoryOptionLabel(category, categories)}
          </option>
        ))}
      </select>
    </Field>
  );
}
