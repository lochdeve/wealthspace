export type Budget = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateBudgetInput = {
  name: string;
  amount: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  categoryId?: string;
};

export type UpdateBudgetInput = {
  name?: string;
  amount?: string;
  currency?: string;
  periodStart?: string;
  periodEnd?: string;
  categoryId?: string | null;
};
