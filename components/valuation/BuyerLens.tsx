import type { BuyerInterpretation } from "@/lib/valuation/types";

interface Props {
  interpretations: BuyerInterpretation[];
  currency?: string;
}

const BUYER_ICONS: Record<BuyerInterpretation["buyerType"], string> = {
  "owner-operator": "👤",
  financial: "📊",
  strategic: "🏢",
};

const BUYER_COLORS: Record<BuyerInterpretation["buyerType"], string> = {
  "owner-operator": "border-slate-700 bg-slate-950/60",
  financial: "border-cyan-500/30 bg-cyan-400/5",
  strategic: "border-amber-500/30 bg-amber-400/5",
};

const BUYER_LABEL_COLORS: Record<BuyerInterpretation["buyerType"], string> = {
  "owner-operator": "text-slate-400",
  financial: "text-cyan-400",
  strategic: "text-amber-400",
};

export function BuyerLens({ interpretations }: Props) {
  return (
    <section
      aria-label="Buyer lens analysis"
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
        Buyer lens
      </p>
      <p className="mt-1 text-xs text-slate-500">
        How different types of buyers may interpret this business — based on your inputs
      </p>

      <div className="mt-5 space-y-4">
        {interpretations.map((interp) => (
          <article
            key={interp.buyerType}
            className={`rounded-lg border p-5 ${BUYER_COLORS[interp.buyerType]}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden="true">
                {BUYER_ICONS[interp.buyerType]}
              </span>
              <div>
                <h3
                  className={`font-semibold ${BUYER_LABEL_COLORS[interp.buyerType]}`}
                >
                  {interp.label}
                </h3>
                <p className="text-xs text-slate-500">
                  Likely multiple range:{" "}
                  <span className="font-semibold text-slate-400">
                    {interp.likelyMultipleRange[0].toFixed(1)}x – {interp.likelyMultipleRange[1].toFixed(1)}x
                  </span>
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              {interp.interpretation}
            </p>

            {interp.primaryConcerns.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Primary concerns
                </p>
                <ul className="mt-2 space-y-1">
                  {interp.primaryConcerns.map((concern) => (
                    <li
                      key={concern}
                      className="flex items-start gap-2 text-xs text-slate-400"
                    >
                      <span className="mt-0.5 text-slate-600" aria-hidden="true">
                        ›
                      </span>
                      {concern}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
