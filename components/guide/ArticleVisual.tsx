import type { GuideArticleVisual } from '@/lib/guide-content';

interface ArticleVisualProps {
  visual: GuideArticleVisual;
}

export default function ArticleVisual({ visual }: ArticleVisualProps) {
  return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50 print:border-slate-300 print:bg-white">
      <div className="border-b border-slate-800 px-5 py-4 print:border-slate-300">
        <h3 className="text-lg font-semibold text-white print:text-slate-900">{visual.title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-300 print:text-slate-700">{visual.caption}</p>
      </div>
      <div
        aria-label={visual.accessibleLabel}
        aria-description={visual.accessibleDescription}
        className="p-5"
      >
        {visual.kind === 'formula' ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 font-mono text-sm text-cyan-100 print:border-slate-300 print:bg-slate-100 print:text-slate-900">
              {visual.expression}
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {visual.terms.map((term) => (
                <div key={term.term} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:border-slate-300 print:bg-white">
                  <dt className="text-sm font-semibold text-white print:text-slate-900">{term.term}</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-300 print:text-slate-700">{term.meaning}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : 'steps' in visual ? (
          <ol className={`grid gap-3 ${visual.kind === 'timeline' ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-5'}`}>
            {visual.steps.map((step, index) => (
              <li key={`${step.label}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:border-slate-300 print:bg-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-sm font-semibold text-cyan-300 print:border print:border-slate-400 print:bg-white print:text-slate-900">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold text-white print:text-slate-900">{step.label}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300 print:text-slate-700">{step.detail}</p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="space-y-4">
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 print:border-slate-300">
                    <th className="px-3 py-2 font-semibold text-white print:text-slate-900">Model</th>
                    {visual.columns.map((column) => (
                      <th key={column} className="px-3 py-2 font-semibold text-white print:text-slate-900">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visual.rows.map((row) => (
                    <tr key={row.label} className="border-b border-slate-800/70 align-top print:border-slate-300">
                      <th scope="row" className="px-3 py-3 font-semibold text-slate-100 print:text-slate-900">{row.label}</th>
                      {row.values.map((value, index) => (
                        <td key={`${row.label}-${index}`} className="px-3 py-3 text-slate-300 print:text-slate-700">{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 md:hidden">
              {visual.rows.map((row) => (
                <div key={row.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:border-slate-300 print:bg-white">
                  <p className="text-sm font-semibold text-white print:text-slate-900">{row.label}</p>
                  <dl className="mt-3 space-y-2">
                    {visual.columns.map((column, index) => (
                      <div key={`${row.label}-${column}`}>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-slate-600">{column}</dt>
                        <dd className="text-sm leading-6 text-slate-300 print:text-slate-700">{row.values[index]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}
