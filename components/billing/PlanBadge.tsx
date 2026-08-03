import type { BillingPlan } from '@/lib/billing';

interface PlanBadgeProps {
  plan: BillingPlan;
  className?: string;
}

const PLAN_STYLES: Record<BillingPlan, string> = {
  free: 'bg-slate-700 text-slate-300',
  starter: 'bg-cyan-500/20 text-cyan-300',
  builder: 'bg-violet-500/20 text-violet-300',
  pro: 'bg-amber-500/20 text-amber-300',
};

const PLAN_LABELS: Record<BillingPlan, string> = {
  free: 'Explorer',
  starter: 'Starter',
  builder: 'Builder',
  pro: 'Pro',
};

/** Small badge indicating the user's current billing plan. */
export function PlanBadge({ plan, className = '' }: PlanBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_STYLES[plan]} ${className}`}
    >
      {PLAN_LABELS[plan]}
    </span>
  );
}
