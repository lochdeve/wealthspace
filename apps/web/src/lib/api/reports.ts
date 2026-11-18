import { apiRequest } from '@/lib/api/client';
import { toQueryString } from '@/lib/api/query';
import type { ConsumptionReport } from '@/lib/api/report-types';

export function getConsumptionReport(
  spaceId: string,
  year: number,
  month: number,
): Promise<ConsumptionReport> {
  const qs = toQueryString({ year: String(year), month: String(month) });
  return apiRequest<ConsumptionReport>(`/spaces/${spaceId}/reports/consumption${qs}`, {
    method: 'GET',
  });
}

export function getConsumptionReportWithCookie(
  spaceId: string,
  year: number,
  month: number,
  cookieHeader: string,
): Promise<ConsumptionReport> {
  const qs = toQueryString({ year: String(year), month: String(month) });
  return apiRequest<ConsumptionReport>(`/spaces/${spaceId}/reports/consumption${qs}`, {
    method: 'GET',
    cookieHeader,
  });
}