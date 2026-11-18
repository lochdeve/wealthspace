import { apiRequest } from '@/lib/api/client';
import { toQueryString } from '@/lib/api/query';
import type { Budget, CreateBudgetInput, UpdateBudgetInput } from '@/lib/api/budget-types';

export function listBudgets(
  spaceId: string,
  query?: { periodFrom?: string; periodTo?: string },
): Promise<Budget[]> {
  const qs = toQueryString({
    periodFrom: query?.periodFrom,
    periodTo: query?.periodTo,
  });
  return apiRequest<Budget[]>(`/spaces/${spaceId}/budgets${qs}`, { method: 'GET' });
}

export function listBudgetsWithCookie(
  spaceId: string,
  cookieHeader: string,
  query?: { periodFrom?: string; periodTo?: string },
): Promise<Budget[]> {
  const qs = toQueryString({
    periodFrom: query?.periodFrom,
    periodTo: query?.periodTo,
  });
  return apiRequest<Budget[]>(`/spaces/${spaceId}/budgets${qs}`, {
    method: 'GET',
    cookieHeader,
  });
}

export function createBudget(spaceId: string, data: CreateBudgetInput): Promise<Budget> {
  return apiRequest<Budget>(`/spaces/${spaceId}/budgets`, {
    method: 'POST',
    body: data,
  });
}

export function updateBudget(
  spaceId: string,
  budgetId: string,
  data: UpdateBudgetInput,
): Promise<Budget> {
  return apiRequest<Budget>(`/spaces/${spaceId}/budgets/${budgetId}`, {
    method: 'PATCH',
    body: data,
  });
}

export function deleteBudget(spaceId: string, budgetId: string): Promise<void> {
  return apiRequest<void>(`/spaces/${spaceId}/budgets/${budgetId}`, {
    method: 'DELETE',
  });
}