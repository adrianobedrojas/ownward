interface Props {
  defensiveValue: number;
  expectedValue: number;
  strategicValue: number;
  defensiveMultiple: number;
  expectedMultiple: number;
  strategicMultiple: number;
  currency?: string;
}

function fmt(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ValuationRange({
  defensiveValue,
  expectedValue,
  strategicValue,
  defensiveMultiple,
  expectedMultiple,
  strategicMultiple,
  currency = "USD",
}: Props) {
  const total = strategicValue || 1;
  const defensivePct = (defensiveValue / total) * 100;
  const expectedPct = (expectedValue / total) * 100;

  return (
    <section aria-label="Valuation range" className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
        Preliminary valuation range
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Preliminary planning estimates — not a certified appraisal or guaranteed sale price
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Defensive
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {fmt(defensiveValue, currency)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {defensiveMultiple.toFixed(1)}x normalized earnings
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Pessimistic assumptions
          </p>
        </div>

        <div className="rounded-lg border border-cyan-500/30 bg-cyan-400/5 p-4 ring-1 ring-cyan-400/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            Expected
          </p>
          <p className="mt-2 text-2xl font-bold text-cyan-300">
            {fmt(expectedValue, currency)}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {expectedMultiple.toFixed(1)}x normalized earnings
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Neutral market assumptions
          </p>
        </div>

        <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Strategic
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {fmt(strategicValue, currency)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {strategicMultiple.toFixed(1)}x normalized earnings
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Optimistic / strategic buyer
          </p>
        </div>
      </div>

      {/* Visual bar */}
      <div className="mt-6" aria-hidden="true">
        <div className="relative h-3 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-slate-600/50"
            style={{ width: `${defensivePct}%` }}
          />
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-cyan-400/60"
            style={{ width: `${expectedPct}%` }}
          />
          <div className="absolute left-0 top-0 h-full w-full rounded-full bg-gradient-to-r from-transparent via-transparent to-slate-700/30" />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-600">
          <span>Defensive</span>
          <span>Expected</span>
          <span>Strategic</span>
        </div>
      </div>
    </section>
  );
}
