import { describe, expect, it } from 'vitest';
import type { Category } from '@/lib/api/finance-types';
import { categoryOptionLabel, sortCategoriesForSelect } from '@/lib/finance/category-options';

const base = (overrides: Partial<Category>): Category => ({
  id: 'id',
  type: 'EXPENSE',
  name: 'Name',
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('category-options', () => {
  it('formats nested labels', () => {
    const child = base({ id: 'c', name: 'Luz', parentId: 'p' });
    const all: Category[] = [base({ id: 'p', name: 'Hogar' }), child];
    expect(categoryOptionLabel(child, all)).toBe('Hogar → Luz');
  });

  it('sorts by display label', () => {
    const all: Category[] = [base({ id: 'b', name: 'Zzz' }), base({ id: 'a', name: 'Aaa' })];
    expect(sortCategoriesForSelect(all).map((c) => c.id)).toEqual(['a', 'b']);
  });
});
