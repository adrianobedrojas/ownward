interface UsageMeterProps {
  /** Human-readable label for this metric. */
  label: string;
  /** Current usage value. */
  current: number;
  /** Maximum allowed value. */
  limit: number;
  /** Unit label appended after the count (e.g. "docs", "MB"). */
  unit?: string;
}

/**
 * Usage state thresholds (not color-only — also reflected in text).
 * < 70%  → normal
 * 70-89% → approaching
 * 90-99% → nearly full
 * ≥ 100% → reached
 */
function getUsageState(current: number, limit: number) {
  if (limit === 0) return 'reached';
  const pct = (current / limit) * 100;
  if (pct >= 100) return 'reached';
  if (pct >= 90) return 'nearly-full';
  if (pct >= 70) return 'approaching';
  return 'normal';
}

const BAR_COLORS = {
  normal: 'bg-cyan-500',
  approaching: 'bg-amber-400',
  'nearly-full': 'bg-orange-400',
  reached: 'bg-rose-500',
};

const STATE_LABELS = {
  normal: '',
  approaching: 'Approaching limit',
  'nearly-full': 'Nearly full',
  reached: 'Limit reached',
};

/**
 * Reusable usage meter with accessible label and state text.
 * Does not rely on color alone to communicate state.
 */
export function UsageMeter({ label, current, limit, unit }: UsageMeterProps) {
  const state = getUsageState(current, limit);
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 100;
  const stateLabel = STATE_LABELS[state];
  const unitSuffix = unit ? ` ${unit}` : '';
  const ariaLabel = `${label}: ${current}${unitSuffix} of ${limit}${unitSuffix} used${stateLabel ? ` — ${stateLabel}` : ''}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-xs text-slate-400" aria-hidden="true">
          {current}{unitSuffix} / {limit}{unitSuffix}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-slate-700 overflow-hidden"
        role="meter"
        aria-label={ariaLabel}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={limit}
      >
        <div
          className={`h-full rounded-full transition-all ${BAR_COLORS[state]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {stateLabel ? (
        <p className="mt-0.5 text-xs text-slate-400" aria-live="polite">
          {stateLabel}
        </p>
      ) : null}
    </div>
  );
}
