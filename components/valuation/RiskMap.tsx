import type { RiskFactor } from "@/lib/valuation/types";

interface Props {
  risks: RiskFactor[];
}

const SEVERITY_CONFIG = {
  high: {
    label: "High",
    containerClass: "border-rose-500/30 bg-rose-500/5",
    badgeClass: "bg-rose-500/20 text-rose-400",
    dotClass: "bg-rose-400",
  },
  medium: {
    label: "Medium",
    containerClass: "border-amber-500/30 bg-amber-500/5",
    badgeClass: "bg-amber-500/20 text-amber-400",
    dotClass: "bg-amber-400",
  },
  low: {
    label: "Low",
    containerClass: "border-slate-700 bg-slate-950/40",
    badgeClass: "bg-slate-800 text-slate-400",
    dotClass: "bg-slate-500",
  },
};

export function RiskMap({ risks }: Props) {
  const high = risks.filter((r) => r.severity === "high");
  const medium = risks.filter((r) => r.severity === "medium");
  const low = risks.filter((r) => r.severity === "low");

  const ordered = [...high, ...medium, ...low];

  return (
    <section
      aria-label="Risk map"
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
        Material risks
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Identified from your inputs — each may affect buyer pricing or deal terms
      </p>

      {ordered.length === 0 ? (
        <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-sm font-semibold text-emerald-400">No significant risks identified</p>
          <p className="mt-1 text-xs text-slate-400">
            Based on your inputs, this business does not have obvious material risk factors. Continue building documentation to maintain this position.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {/* Summary counts */}
          <div className="flex items-center gap-3 flex-wrap">
            {high.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
                {high.length} high
              </span>
            )}
            {medium.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                {medium.length} medium
              </span>
            )}
            {low.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500" aria-hidden="true" />
                {low.length} low
              </span>
            )}
          </div>

          {ordered.map((risk) => {
            const config = SEVERITY_CONFIG[risk.severity];
            return (
              <article
                key={risk.label}
                className={`rounded-lg border p-4 ${config.containerClass}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${config.dotClass}`}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-white">
                        {risk.label}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.badgeClass}`}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-400">
                      {risk.description}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
