'use client';

import { useReducer, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  startBusinessSteps,
  getDefaultPlan,
  parsePlanFromStorage,
  getPlanProgress,
  exportPlanAsText,
  exportPlanAsJson,
  START_BUSINESS_STORAGE_KEY,
  type StartBusinessPlan,
} from '@/lib/start-business';

interface StartBusinessPlannerProps {
  locale: string;
  isSignedIn: boolean;
  showWelcome: boolean;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

interface PlannerState {
  plan: StartBusinessPlan;
  currentStep: number;
  showSummary: boolean;
  showResetConfirm: boolean;
  welcomeDismissed: boolean;
  /** null = not yet hydrated from localStorage */
  hydrated: boolean;
}

type PlannerAction =
  | { type: 'hydrate'; plan: StartBusinessPlan }
  | { type: 'field'; stepId: string; fieldId: string; value: string }
  | { type: 'next'; totalSteps: number }
  | { type: 'back' }
  | { type: 'reset_confirm' }
  | { type: 'reset_cancel' }
  | { type: 'reset' }
  | { type: 'dismiss_welcome' }
  | { type: 'go_to_step'; index: number }
  | { type: 'show_summary' };

function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, plan: action.plan, hydrated: true };
    case 'field': {
      const stepData = state.plan[action.stepId as keyof StartBusinessPlan] as unknown as Record<string, string>;
      return {
        ...state,
        plan: {
          ...state.plan,
          [action.stepId]: { ...stepData, [action.fieldId]: action.value },
        },
      };
    }
    case 'next':
      if (state.currentStep < action.totalSteps - 1) {
        return { ...state, currentStep: state.currentStep + 1 };
      }
      return { ...state, showSummary: true };
    case 'back':
      if (state.showSummary) return { ...state, showSummary: false };
      if (state.currentStep > 0) return { ...state, currentStep: state.currentStep - 1 };
      return state;
    case 'reset_confirm':
      return { ...state, showResetConfirm: true };
    case 'reset_cancel':
      return { ...state, showResetConfirm: false };
    case 'reset':
      return { ...state, plan: getDefaultPlan(), currentStep: 0, showSummary: false, showResetConfirm: false };
    case 'dismiss_welcome':
      return { ...state, welcomeDismissed: true };
    case 'go_to_step':
      return { ...state, currentStep: action.index, showSummary: false };
    case 'show_summary':
      return { ...state, showSummary: true };
    default:
      return state;
  }
}

const initialState: PlannerState = {
  plan: getDefaultPlan(),
  currentStep: 0,
  showSummary: false,
  showResetConfirm: false,
  welcomeDismissed: false,
  hydrated: false,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function StartBusinessPlanner({ locale, isSignedIn, showWelcome }: StartBusinessPlannerProps) {
  const t = useTranslations('StartBusiness');
  const [state, dispatch] = useReducer(plannerReducer, initialState);
  const topRef = useRef<HTMLDivElement>(null);

  const { plan, currentStep, showSummary, showResetConfirm, welcomeDismissed, hydrated } = state;

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(START_BUSINESS_STORAGE_KEY);
      dispatch({ type: 'hydrate', plan: parsePlanFromStorage(raw) });
    } catch {
      dispatch({ type: 'hydrate', plan: getDefaultPlan() });
    }
  }, []);

  // Auto-save whenever plan changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(START_BUSINESS_STORAGE_KEY, JSON.stringify(plan));
    } catch {
      // localStorage unavailable — silently continue
    }
  }, [plan, hydrated]);

  const handleFieldChange = useCallback((stepId: string, fieldId: string, value: string) => {
    dispatch({ type: 'field', stepId, fieldId, value });
  }, []);

  function handleNext() {
    dispatch({ type: 'next', totalSteps: startBusinessSteps.length });
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleBack() {
    dispatch({ type: 'back' });
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleReset() {
    try {
      localStorage.removeItem(START_BUSINESS_STORAGE_KEY);
    } catch {
      // ok
    }
    dispatch({ type: 'reset' });
  }

  function handleExportText() {
    const text = exportPlanAsText(plan);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'startup-plan.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportJson() {
    const json = exportPlanAsJson(plan);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'startup-plan.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  const progress = getPlanProgress(plan);
  const step = startBusinessSteps[currentStep];
  const stepData = plan[step?.id as keyof StartBusinessPlan] as unknown as Record<string, string>;

  const workspaceHref = isSignedIn ? '/business/new?business_stage=idea' : '/signup';

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 animate-pulse">
          <div className="h-6 w-1/3 rounded bg-slate-700" />
          <div className="mt-4 h-4 w-2/3 rounded bg-slate-700" />
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} className="scroll-mt-20">
      {/* Welcome banner */}
      {showWelcome && !welcomeDismissed && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-5 py-4">
          <p className="text-sm font-medium text-cyan-200">{t('welcomeBanner')}</p>
          <button
            onClick={() => dispatch({ type: 'dismiss_welcome' })}
            aria-label={t('welcomeDismiss')}
            className="shrink-0 rounded-lg border border-cyan-700/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40"
          >
            {t('welcomeDismiss')}
          </button>
        </div>
      )}

      {/* Reset confirm dialog */}
      {showResetConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 id="reset-dialog-title" className="text-lg font-semibold text-white">{t('resetConfirmTitle')}</h2>
            <p className="mt-2 text-sm text-slate-300">{t('resetConfirmDescription')}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleReset}
                className="flex-1 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"
              >
                {t('resetConfirm')}
              </button>
              <button
                onClick={() => dispatch({ type: 'reset_cancel' })}
                className="flex-1 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                {t('resetCancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
        {/* Progress header */}
        <div className="border-b border-slate-800 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-cyan-400">{t('plannerTitle')}</p>
              {!showSummary && (
                <p className="mt-0.5 text-xs text-slate-400">
                  {t('stepOf', { current: currentStep + 1, total: startBusinessSteps.length })}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-300" aria-live="polite">
                {t('progressPercent', { percent: progress })}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={t('progressPercent', { percent: progress })}>
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Step indicators */}
          <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
            {startBusinessSteps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => dispatch({ type: 'go_to_step', index: idx })}
                aria-label={locale === 'es' ? s.titleEs : s.title}
                aria-current={!showSummary && idx === currentStep ? 'step' : undefined}
                className={`h-1.5 flex-1 min-w-[16px] rounded-full transition-colors ${
                  (!showSummary && idx === currentStep) ? 'bg-cyan-400' : idx < currentStep ? 'bg-cyan-800' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Summary view */}
        {showSummary ? (
          <div className="p-5 sm:p-8">
            <h2 className="text-2xl font-bold text-white">{t('planSummaryTitle')}</h2>
            <div className="mt-6 space-y-8">
              {startBusinessSteps.map((stepDef) => {
                const data = plan[stepDef.id as keyof StartBusinessPlan] as unknown as Record<string, string>;
                return (
                  <section key={stepDef.id}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                      {stepDef.stepNumber}. {locale === 'es' ? stepDef.titleEs : stepDef.title}
                    </h3>
                    <div className="mt-3 space-y-3">
                      {stepDef.fields.map((field) => (
                        <div key={field.id} className="rounded-lg border border-slate-800 p-3">
                          <p className="text-xs font-semibold text-slate-400">{locale === 'es' ? field.labelEs : field.label}</p>
                          <p className="mt-1 text-sm text-slate-200 whitespace-pre-wrap">
                            {data?.[field.id]?.trim() || <span className="italic text-slate-500">{t('notFilled')}</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Export / Print */}
            <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-800 pt-6">
              <button
                onClick={handleExportText}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                {t('exportText')}
              </button>
              <button
                onClick={handleExportJson}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                {t('exportJson')}
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                {t('printPlan')}
              </button>
              <button
                onClick={() => dispatch({ type: 'reset_confirm' })}
                className="ml-auto rounded-lg border border-rose-800/40 px-4 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-900/20"
              >
                {t('resetPlan')}
              </button>
            </div>

            {/* Next step CTAs */}
            <div className="mt-8 rounded-xl border border-cyan-800/30 bg-cyan-950/20 p-6">
              <h2 className="text-xl font-semibold text-white">{t('finishTitle')}</h2>
              <p className="mt-2 text-sm text-slate-300">{t('finishDescription')}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {!isSignedIn && (
                  <Link href="/signup" className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
                    {t('ctaCreateAccount')}
                  </Link>
                )}
                <Link href={workspaceHref} className="rounded-lg border border-cyan-700/40 bg-cyan-900/20 px-5 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-900/40">
                  {t('ctaCreateWorkspace')}
                </Link>
                <Link href="/milestones" className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800">
                  {t('ctaAddMilestones')}
                </Link>
                <Link href="/guide/start" className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800">
                  {t('ctaBrowseGuides')}
                </Link>
              </div>
            </div>

            {/* Back button */}
            <div className="mt-6">
              <button onClick={handleBack} className="text-sm font-semibold text-cyan-400 hover:underline">
                ← {t('back')}
              </button>
            </div>
          </div>
        ) : (
          /* Step form */
          <div className="p-5 sm:p-8">
            <h2 className="text-xl font-bold text-white">
              {step.stepNumber}. {locale === 'es' ? step.titleEs : step.title}
            </h2>
            {(locale === 'es' ? step.descriptionEs : step.description) && (
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {locale === 'es' ? step.descriptionEs : step.description}
              </p>
            )}

            {/* Legal/financial disclaimer on relevant steps */}
            {step.id === 'step5' && (
              <div className="mt-4 rounded-lg border border-amber-800/30 bg-amber-900/10 p-3 text-xs text-amber-300/80">
                {t('financialDisclaimer')}
              </div>
            )}
            {step.id === 'step6' && (
              <div className="mt-4 rounded-lg border border-amber-800/30 bg-amber-900/10 p-3 text-xs text-amber-300/80">
                {t('legalDisclaimer')}
              </div>
            )}

            <div className="mt-6 space-y-5">
              {step.fields.map((field) => {
                const fieldLabel = locale === 'es' ? field.labelEs : field.label;
                const fieldPlaceholder = locale === 'es' ? (field.placeholderEs ?? field.placeholder ?? '') : (field.placeholder ?? '');
                const fieldId = `${step.id}-${field.id}`;
                return (
                  <div key={field.id}>
                    <label htmlFor={fieldId} className="block text-sm font-semibold text-slate-300">
                      {fieldLabel}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={fieldId}
                        rows={3}
                        value={stepData?.[field.id] ?? ''}
                        onChange={(e) => handleFieldChange(step.id, field.id, e.target.value)}
                        placeholder={fieldPlaceholder}
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                    ) : (
                      <input
                        id={fieldId}
                        type="text"
                        value={stepData?.[field.id] ?? ''}
                        onChange={(e) => handleFieldChange(step.id, field.id, e.target.value)}
                        placeholder={fieldPlaceholder}
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Storage note */}
            <p className="mt-4 text-xs text-slate-500">{t('plannerStorageNote')}</p>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
              <div className="flex items-center gap-3">
                {currentStep > 0 ? (
                  <button onClick={handleBack} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800">
                    ← {t('back')}
                  </button>
                ) : null}
                <button
                  onClick={() => dispatch({ type: 'reset_confirm' })}
                  className="rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-rose-400"
                >
                  {t('resetPlan')}
                </button>
              </div>
              <button
                onClick={handleNext}
                className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                {currentStep === startBusinessSteps.length - 1 ? t('reviewPlan') : `${t('next')} →`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
