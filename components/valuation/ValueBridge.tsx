import type { ValueBridgeScenario } from "@/lib/valuation/types";

interface Props {
  expectedValue: number;
  scenarios: ValueBridgeScenario[];
  currency?: string;
}

function fmt(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ValueBridge({ expectedValue, scenarios, currency = "USD" }: Props) {
  const maxModeled = Math.max(expectedValue, ...scenarios.map((s) => s.modeledValue));

  return (
    <section
      aria-label="Value bridge scenarios"
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
        Value bridge
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Modeled improvement scenarios — illustrative planning estimates only, not guaranteed
      </p>

      <div className="mt-6 space-y-4">
        {/* Current expected value */}
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-white">Current expected value</span>
            <span className="font-bold tabular-nums text-cyan-300">
              {fmt(expectedValue, currency)}
            </span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-slate-800" aria-hidden="true">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{ width: `${(expectedValue / maxModeled) * 100}%` }}
            />
          </div>
        </div>

        {scenarios.length === 0 && (
          <p className="text-sm text-slate-500">
            No improvement scenarios identified. Your business already performs well across key value drivers.
          </p>
        )}

        {scenarios.map((scenario) => (
          <div key={scenario.label}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex-1 min-w-0 pr-4">
                <span className="font-medium text-slate-300">{scenario.label}</span>
                <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                  {scenario.description}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold tabular-nums text-emerald-400">
                  {fmt(scenario.modeledValue, currency)}
                </p>
                <p className="text-xs text-emerald-600">
                  +{fmt(scenario.deltaAmount, currency)}
                </p>
              </div>
            </div>
            <div className="mt-2 h-3 rounded-full bg-slate-800" aria-hidden="true">
              <div
                className="h-full rounded-full bg-emerald-400/60"
                style={{ width: `${(scenario.modeledValue / maxModeled) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {scenarios.length > 0 && (
        <div className="mt-5 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
          <p className="text-xs leading-5 text-amber-300/80">
            <strong>Important:</strong> Modeled improvements are illustrative scenarios derived from planning assumptions. They do not represent guaranteed value increases and depend on execution, market conditions, and buyer perception. Consult a qualified advisor before acting on these estimates.
          </p>
        </div>
      )}
    </section>
  );
}
