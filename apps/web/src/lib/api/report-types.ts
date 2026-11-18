export type ConsumptionAmountByCurrency = {
  currency: string;
  amount: string;
};

export type ConsumptionByCategory = {
  categoryId?: string;
  currency: string;
  amount: string;
};

export type ConsumptionReport = {
  year: number;
  month: number;
  timezone: string;
  periodStartLocal: string;
  periodEndLocal: string;
  totalsByCurrency: ConsumptionAmountByCurrency[];
  byCategory: ConsumptionByCategory[];
};