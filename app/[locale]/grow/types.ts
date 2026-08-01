export const GOAL_CATEGORIES = [
  "revenue",
  "customers",
  "profitability",
  "recurring_revenue",
  "operations",
  "owner_independence",
  "sale_readiness",
  "marketing",
  "customer_retention",
  "other",
] as const;

export const GOAL_STATUSES = ["active", "completed", "paused", "cancelled"] as const;

export type GoalCategory = (typeof GOAL_CATEGORIES)[number];
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const CATEGORY_LABELS: Record<GoalCategory, string> = {
  revenue: "Revenue",
  customers: "Customers",
  profitability: "Profitability",
  recurring_revenue: "Recurring revenue",
  operations: "Operations",
  owner_independence: "Owner independence",
  sale_readiness: "Sale readiness",
  marketing: "Marketing",
  customer_retention: "Customer retention",
  other: "Other",
};

export const STATUS_LABELS: Record<GoalStatus, string> = {
  active: "Active",
  completed: "Completed",
  paused: "Paused",
  cancelled: "Cancelled",
};

export interface GrowthGoal {
  id: string;
  user_id: string;
  business_id: string | null;
  title: string;
  category: GoalCategory;
  metric_name: string | null;
  metric_unit: string | null;
  start_value: number | null;
  current_value: number | null;
  target_value: number | null;
  deadline: string | null;
  status: GoalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  title: string;
  category?: string;
  metricName?: string | null;
  metricUnit?: string | null;
  startValue?: string | null;
  currentValue?: string | null;
  targetValue?: string | null;
  deadline?: string | null;
  notes?: string | null;
}

export interface UpdateGoalInput extends CreateGoalInput {
  id: string;
  status?: string;
}

export interface GoalActionResult {
  success: boolean;
  message: string;
  goal?: GrowthGoal;
  errors?: Partial<Record<keyof CreateGoalInput | "id" | "status", string>>;
}
