import type { BillingPlan, UpgradeErrorCode } from '@/lib/billing';
import { Link } from '@/i18n/navigation';

interface UpgradePromptProps {
  /** The typed error code from the entitlement check. */
  errorCode: UpgradeErrorCode;
  /** Human-readable explanation of what the user accomplished and what was reached. */
  message: string;
  /** The plan that unlocks the feature or increases the limit. */
  suggestedPlan?: BillingPlan;
  /** Current plan (to confirm they're on Explorer/free). */
  currentPlan: BillingPlan;
  /** Locale for locale-aware links. */
  locale: string;
}

const PLAN_NAMES: Record<BillingPlan, string> = {
  free: 'Explorer',
  starter: 'Starter',
  builder: 'Builder',
  pro: 'Pro',
};

/**
 * Contextual upgrade prompt shown when a user hits an entitlement limit.
 * Explains:
 *  1. What they accomplished
 *  2. The limit they reached
 *  3. Their current allowance
 *  4. Which plan increases it
 *  5. That existing data remains safe
 */

export function UpgradePrompt({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  errorCode: _errorCode,
  message,
  suggestedPlan,
  currentPlan,
  locale,
}: UpgradePromptProps) {
  const isExplorer = currentPlan === 'free';
  const nextPlanLabel = suggestedPlan ? PLAN_NAMES[suggestedPlan] : 'a paid plan';

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm"
    >
      <p className="text-amber-200">{message}</p>
      {isExplorer && (
        <p className="mt-1 text-amber-200/70 text-xs">
          Your existing data stays safe and accessible. Upgrade to {nextPlanLabel} to continue.
        </p>
      )}
      <div className="mt-3 flex items-center gap-3">
        <Link
          href={`/${locale}/pricing`}
          className="rounded-lg bg-cyan-400 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300 transition-colors"
        >
          View plans
        </Link>
        <span className="text-xs text-amber-200/60">No data will be deleted</span>
      </div>
    </div>
  );
}
