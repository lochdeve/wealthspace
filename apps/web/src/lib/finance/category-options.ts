import type { Category } from '@/lib/api/finance-types';

export function categoryOptionLabel(category: Category, all: Category[]): string {
  if (!category.parentId) {
    return category.name;
  }
  const parent = all.find((row) => row.id === category.parentId);
  return parent ? `${parent.name} → ${category.name}` : category.name;
}

export function sortCategoriesForSelect(categories: Category[]): Category[] {
  return [...categories].sort((a, b) =>
    categoryOptionLabel(a, categories).localeCompare(categoryOptionLabel(b, categories), 'es'),
  );
}
