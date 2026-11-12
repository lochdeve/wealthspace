import { apiRequest } from '@/lib/api/client';
import { toQueryString } from '@/lib/api/query';
import type { Category, CategoryType, CreateCategoryInput } from '@/lib/api/finance-types';

export function listCategories(spaceId: string, type?: CategoryType): Promise<Category[]> {
  const qs = toQueryString({ type });
  return apiRequest<Category[]>(`/spaces/${spaceId}/categories${qs}`, { method: 'GET' });
}

export function listCategoriesWithCookie(
  spaceId: string,
  cookieHeader: string,
  type?: CategoryType,
): Promise<Category[]> {
  const qs = toQueryString({ type });
  return apiRequest<Category[]>(`/spaces/${spaceId}/categories${qs}`, {
    method: 'GET',
    cookieHeader,
  });
}

export function createCategory(spaceId: string, data: CreateCategoryInput): Promise<Category> {
  return apiRequest<Category>(`/spaces/${spaceId}/categories`, {
    method: 'POST',
    body: data,
  });
}
