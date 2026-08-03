'use client';

import { useTranslations } from 'next-intl';
import type { AssessmentQuestion } from '@/lib/business-idea-readiness/types';

interface AssessmentQuestionProps {
  question: AssessmentQuestion;
  questionIndex: number;
  totalQuestions: number;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  onContinue: () => void;
  onBack: () => void;
  showBackButton: boolean;
  isLast: boolean;
  validationError: string | null;
}

export default function AssessmentQuestion({
  question,
  selectedOptionId,
  onSelect,
  onContinue,
  onBack,
  showBackButton,
  isLast,
  validationError,
}: AssessmentQuestionProps) {
  const t = useTranslations('BusinessIdeaReadiness');

  const questionTextKey = `questions.${question.id}.text` as Parameters<typeof t>[0];
  const questionText = t(questionTextKey);

  return (
    <div>
      <fieldset>
        <legend className="text-xl font-semibold text-white leading-snug mb-6">
          {questionText}
        </legend>

        <div className="space-y-3" role="group">
          {question.options.map((option) => {
            const optionLabelKey = `questions.${question.id}.options.${option.id}` as Parameters<typeof t>[0];
            const optionLabel = t(optionLabelKey);
            const isSelected = selectedOptionId === option.id;

            return (
              <label
                key={option.id}
                className={[
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition',
                  isSelected
                    ? 'border-cyan-400 bg-cyan-400/10 text-white'
                    : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-900',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.id}
                  checked={isSelected}
                  onChange={() => onSelect(option.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-400"
                />
                <span className="text-sm leading-6">{optionLabel}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {validationError && (
        <p role="alert" className="mt-3 text-sm text-rose-400">
          {validationError}
        </p>
      )}

      <div className="mt-8 flex items-center gap-4">
        {showBackButton && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            {t('controls.back')}
          </button>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          {isLast ? t('controls.submit') : t('controls.continue')}
        </button>
      </div>
    </div>
  );
}
