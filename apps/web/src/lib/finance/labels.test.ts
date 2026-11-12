import { categoryTypeLabel, transactionTypeLabel } from '@/lib/finance/labels';

describe('finance labels', () => {
  it('labels transaction types in Spanish', () => {
    expect(transactionTypeLabel('TRANSFER')).toBe('Transferencia');
  });

  it('labels category types', () => {
    expect(categoryTypeLabel('INCOME')).toBe('Ingreso');
    expect(categoryTypeLabel('EXPENSE')).toBe('Gasto');
  });
});
