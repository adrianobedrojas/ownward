interface ProgressPathProps {
  /** The current active step (0-based index or step key). */
  currentStep: ProgressStep;
  /** Optional completion percentages per step (0-100). */
  completionByStep?: Partial<Record<ProgressStep, number>>;
}

export type ProgressStep =
  | 'discover'
  | 'define'
  | 'organize'
  | 'operate'
  | 'grow'
  | 'prepare'
  | 'transact';

const STEPS: { key: ProgressStep; label: string }[] = [
  { key: 'discover', label: 'Discover' },
  { key: 'define', label: 'Define' },
  { key: 'organize', label: 'Organize' },
  { key: 'operate', label: 'Operate' },
  { key: 'grow', label: 'Grow' },
  { key: 'prepare', label: 'Prepare' },
  { key: 'transact', label: 'Transact' },
];

/**
 * Visual Ownward progress path showing the 7-step business journey:
 * Discover → Define → Organize → Operate → Grow → Prepare → Transact
 */
export function OwnwardProgressPath({ currentStep, completionByStep = {} }: ProgressPathProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <nav aria-label="Progress path" className="w-full overflow-x-auto py-2">
      <ol className="flex items-center min-w-max gap-0">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const completion = completionByStep[step.key] ?? (isCompleted ? 100 : 0);

          return (
            <li key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-cyan-400 text-slate-950'
                      : isCurrent
                        ? 'bg-cyan-400/30 border-2 border-cyan-400 text-cyan-300'
                        : 'bg-slate-800 text-slate-500'
                  }`}
                  title={`${step.label}${completion > 0 && !isCompleted ? ` — ${completion}%` : ''}`}
                >
                  {isCompleted ? '✓' : i + 1}
                </div>
                <span
                  className={`mt-1.5 text-xs whitespace-nowrap ${
                    isCurrent ? 'text-cyan-300 font-semibold' : isCompleted ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  className={`h-0.5 w-8 mx-1 transition-colors ${isCompleted ? 'bg-cyan-400' : 'bg-slate-700'}`}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
