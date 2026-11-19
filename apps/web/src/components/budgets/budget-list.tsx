'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteBudget } from '@/lib/api/budgets';
import type { Budget } from '@/lib/api/budget-types';
import type { Category } from '@/lib/api/finance-types';
import { financeActionErrorMessage } from '@/lib/finance/finance-messages';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import { Button } from '@/components/ui/button';
import ui from '@/components/ui/ui.module.css';
import styles from '@/app/(app)/app-pages.module.css';

type BudgetListProps = {
  spaceId: string;
  budgets: Budget[];
  categories: Category[];
};

function categoryName(categories: Category[], categoryId?: string): string | null {
  if (categoryId === undefined) {
    return null;
  }
  return categories.find((category) => category.id === categoryId)?.name ?? null;
}

export function BudgetList({ spaceId, budgets, categories }: BudgetListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (budgets.length === 0) {
    return <p className={styles.lead}>No hay presupuestos en este espacio.</p>;
  }

  async function handleDelete(budgetId: string) {
    if (!window.confirm('¿Eliminar este presupuesto?')) {
      return;
    }
    setError(null);
    setPendingId(budgetId);
    try {
      await deleteBudget(spaceId, budgetId);
      router.refresh();
    } catch (err) {
      setError(financeActionErrorMessage(err));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      {error ? (
        <p className={ui.alert} role="alert">
          {error}
        </p>
      ) : null}
      <ul className={styles.spaceGrid}>
        {budgets.map((budget) => {
          const cat = categoryName(categories, budget.categoryId);
          return (
            <li key={budget.id} className={styles.spaceCard}>
              <h3 className={styles.sectionHeading}>{budget.name}</h3>
              <p>
                {formatMoneyAmount(budget.amount, budget.currency)} · {budget.periodStart} —{' '}
                {budget.periodEnd}
              </p>
              {cat ? <p className={styles.lead}>Categoría: {cat}</p> : null}
              <Button
                type="button"
                variant="secondary"
                disabled={pendingId === budget.id}
                onClick={() => handleDelete(budget.id)}
              >
                {pendingId === budget.id ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
