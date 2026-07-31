interface Props {
  score: number; // 0–100
  showFactors?: boolean;
  factors?: { factor: string; score: number; weight: number }[];
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

function scoreLabel(score: number) {
  if (score >= 75) return "High confidence";
  if (score >= 55) return "Moderate confidence";
  if (score >= 35) return "Limited confidence";
  return "Low confidence";
}

export function ConfidenceMeter({ score, showFactors = true, factors }: Props) {
  return (
    <section
      aria-label="Confidence score"
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
        Confidence score
      </p>

      <div className="mt-4 flex items-end gap-4">
        <span
          className={`text-5xl font-bold tabular-nums ${scoreColor(score)}`}
          aria-label={`Confidence score: ${score} out of 100`}
        >
          {score}
        </span>
        <div className="mb-1">
          <span className="text-slate-500 text-sm">/ 100</span>
          <p className={`text-sm font-semibold ${scoreColor(score)}`}>
            {scoreLabel(score)}
          </p>
        </div>
      </div>

      {/* Bar */}
      <div className="mt-3" aria-hidden="true">
        <div className="h-2 rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${scoreBarColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Scores above 75 indicate well-documented inputs that support stronger planning confidence. A lower score means key evidence is missing or risk factors are elevated.
      </p>

      {showFactors && factors && factors.length > 0 && (
        <div className="mt-5 space-y-3">
          {factors.map((f) => (
            <div key={f.factor}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{f.factor}</span>
                <span className={`font-semibold tabular-nums ${scoreColor(f.score)}`}>
                  {f.score}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-800" aria-hidden="true">
                <div
                  className={`h-full rounded-full ${scoreBarColor(f.score)}`}
                  style={{ width: `${f.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
