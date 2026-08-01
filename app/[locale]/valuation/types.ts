export interface ValuationEstimate {
  id: string;
  user_id: string;
  name: string;
  annual_revenue: number | null;
  base_earnings: number | null;
  owner_compensation: number;
  interest_addback: number;
  depreciation_addback: number;
  amortization_addback: number;
  onetime_expenses: number;
  nonoperating_income: number;
  normalized_earnings: number | null;
  low_multiple: number;
  base_multiple: number;
  high_multiple: number;
  low_estimate: number | null;
  base_estimate: number | null;
  high_estimate: number | null;
  created_at: string;
  updated_at: string;
}

export interface SaveEstimateInput {
  id?: string;
  name?: string;
  annualRevenue?: number | null;
  baseEarnings?: number | null;
  ownerCompensation?: number;
  interestAddback?: number;
  depreciationAddback?: number;
  amortizationAddback?: number;
  onetimeExpenses?: number;
  nonoperatingIncome?: number;
  normalizedEarnings?: number | null;
  lowMultiple?: number;
  baseMultiple?: number;
  highMultiple?: number;
  lowEstimate?: number | null;
  baseEstimate?: number | null;
  highEstimate?: number | null;
}

export interface EstimateActionResult {
  success: boolean;
  message: string;
  estimate?: ValuationEstimate;
}
