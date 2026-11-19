import { apiRequest } from '@/lib/api/client';
import type { ContributionResult, CreateContributionInput } from '@/lib/api/contribution-types';

export function createContribution(
  spaceId: string,
  data: CreateContributionInput,
): Promise<ContributionResult> {
  return apiRequest<ContributionResult>(`/spaces/${spaceId}/contributions`, {
    method: 'POST',
    body: data,
  });
}
