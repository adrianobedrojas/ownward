import type { DnaScore } from "@/lib/valuation/types";

interface Props {
  scores: DnaScore[];
}

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 55) return "text-cyan-400";
  if (score >= 35) return "text-amber-400";
  return "text-rose-400";
}

function scoreBarColor(score: number) {
  if (score >= 75) return "bg-emerald-400";
  if (score >= 55) return "bg-cyan-400";
  if (score >= 35) return "bg-amber-400";
  return "bg-rose-400";
}

function overallScore(scores: DnaScore[]) {
  if (scores.length === 0) return 0;
  return Math.round(
    scores.reduce((acc, s) => acc + s.score, 0) / scores.length
  );
}

export function ValueDnaScorecard({ scores }: Props) {
  const overall = overallScore(scores);

  return (
    <section
      aria-label="Value DNA scorecard"
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Value DNA scorecard
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Deterministic scores derived from your inputs — not AI-generated
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-3xl font-bold tabular-nums ${scoreColor(overall)}`}>
            {overall}
          </span>
          <p className="text-xs text-slate-500">/ 100 avg</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {scores.map((s) => (
          <div key={s.dimension}>
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-slate-300">{s.dimension}</span>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${scoreColor(s.score)} bg-slate-800`}
                >
                  {s.label}
                </span>
              </div>
              <span className={`font-bold tabular-nums ${scoreColor(s.score)}`}>
                {s.score}
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-slate-800" aria-hidden="true">
              <div
                className={`h-full rounded-full transition-all ${scoreBarColor(s.score)}`}
                style={{ width: `${s.score}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-600">{s.explanation}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
