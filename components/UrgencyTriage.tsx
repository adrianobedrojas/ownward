'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  computeTriageResult,
  type TriageAnswer,
  type TriageAnswers,
} from '@/lib/urgency-triage-logic';

type QuestionKey = 'q1' | 'q2' | 'q3' | 'q4';

const QUESTION_KEYS: QuestionKey[] = ['q1', 'q2', 'q3', 'q4'];

export default function UrgencyTriage() {
  const t = useTranslations('UrgencyTriage');

  const initialAnswers: TriageAnswers = { q1: null, q2: null, q3: null, q4: null };
  const [answers, setAnswers] = useState<TriageAnswers>(initialAnswers);

  function handleAnswer(question: QuestionKey, value: TriageAnswer) {
    setAnswers((prev) => ({ ...prev, [question]: value }));
  }

  function handleReset() {
    setAnswers(initialAnswers);
  }

  const result = computeTriageResult(answers);

  return (
    <section
      aria-labelledby="urgency-triage-heading"
      className="mt-10 rounded-2xl border border-slate-700 bg-slate-900/70 p-6 sm:p-8"
    >
      <h2 id="urgency-triage-heading" className="text-2xl font-semibold text-white">
        {t('heading')}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{t('description')}</p>

      <div className="mt-6 space-y-6">
        {QUESTION_KEYS.map((qKey, index) => {
          const questionText = t(`questions.${qKey}`);
          const currentAnswer = answers[qKey];

          return (
            <fieldset
              key={qKey}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
            >
              <legend className="text-sm font-medium text-slate-200">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
                  {index + 1}
                </span>
                {questionText}
              </legend>
              <div className="mt-3 flex flex-wrap gap-4">
                {(['yes', 'no'] as const).map((value) => {
                  const id = `${qKey}-${value}`;
                  const label = value === 'yes' ? t('yes') : t('no');
                  const isSelected = currentAnswer === value;
                  return (
                    <label
                      key={value}
                      htmlFor={id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition
                        focus-within:ring-2 focus-within:ring-cyan-400 focus-within:ring-offset-2 focus-within:ring-offset-slate-950
                        ${isSelected
                          ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                    >
                      <input
                        type="radio"
                        id={id}
                        name={qKey}
                        value={value}
                        checked={isSelected}
                        onChange={() => handleAnswer(qKey, value)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600 bg-transparent'
                        }`}
                      >
                        {isSelected && <span className="block h-2 w-2 rounded-full bg-slate-950" />}
                      </span>
                      {label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" className="mt-6">
        {result ? (
          <div className="rounded-xl border border-cyan-800/40 bg-cyan-950/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              {t('resultLabel')}
            </p>
            <p className="mt-2 text-base font-semibold text-white">
              {t(`outcomes.${result.outcome}.title`)}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {t(`outcomes.${result.outcome}.message`)}
            </p>
            <p className="mt-3 text-sm italic leading-6 text-slate-300">
              {t(`appendMessages.${result.appendMessage}`)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
        >
          {t('reset')}
        </button>
      </div>
    </section>
  );
}
