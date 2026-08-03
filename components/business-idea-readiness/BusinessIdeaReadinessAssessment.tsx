'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { QUESTIONS } from '@/lib/business-idea-readiness/questions';
import { computeScore } from '@/lib/business-idea-readiness/scoring';
import { buildRecommendations, buildSevenDayPlanKey } from '@/lib/business-idea-readiness/recommendations';
import {
  loadOrDefault,
  saveBusinessIdeaReadinessState,
  clearBusinessIdeaReadinessState,
} from '@/lib/business-idea-readiness/storage';
import type {
  AssessmentStatus,
  ScoreResult,
  RecommendationResult,
} from '@/lib/business-idea-readiness/types';
import AssessmentIntro from './AssessmentIntro';
import AssessmentProgress from './AssessmentProgress';
import AssessmentQuestion from './AssessmentQuestion';
import AssessmentResults from './AssessmentResults';

// ─── Reducer ──────────────────────────────────────────────────────────────────

interface AssessmentState {
  status: AssessmentStatus;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  hydrated: boolean;
  validationError: string | null;
}

type AssessmentAction =
  | { type: 'hydrate'; status: AssessmentStatus; currentQuestionIndex: number; answers: Record<string, string> }
  | { type: 'start' }
  | { type: 'select'; optionId: string }
  | { type: 'continue'; isLast: boolean }
  | { type: 'back' }
  | { type: 'complete' }
  | { type: 'restart' }
  | { type: 'set_validation_error'; message: string | null };

function makeDefault(): AssessmentState {
  return {
    status: 'intro',
    currentQuestionIndex: 0,
    answers: {},
    hydrated: false,
    validationError: null,
  };
}

function reducer(state: AssessmentState, action: AssessmentAction): AssessmentState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        status: action.status,
        currentQuestionIndex: action.currentQuestionIndex,
        answers: action.answers,
        hydrated: true,
      };
    case 'start':
      return { ...state, status: 'in_progress', currentQuestionIndex: 0, validationError: null };
    case 'select': {
      const qId = QUESTIONS[state.currentQuestionIndex].id;
      return {
        ...state,
        answers: { ...state.answers, [qId]: action.optionId },
        validationError: null,
      };
    }
    case 'continue': {
      const qId = QUESTIONS[state.currentQuestionIndex].id;
      if (!state.answers[qId]) {
        // Caller should set validation error separately
        return state;
      }
      if (action.isLast) {
        return { ...state, status: 'complete', validationError: null };
      }
      return {
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        validationError: null,
      };
    }
    case 'back':
      return {
        ...state,
        currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1),
        validationError: null,
      };
    case 'restart':
      return makeDefault();
    case 'set_validation_error':
      return { ...state, validationError: action.message };
    default:
      return state;
  }
}

export default function BusinessIdeaReadinessAssessment() {
  const t = useTranslations('BusinessIdeaReadiness');
  const [state, dispatch] = useReducer(reducer, undefined, makeDefault);
  const questionRef = useRef<HTMLDivElement>(null);

  const { status, currentQuestionIndex, answers, hydrated, validationError } = state;

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = loadOrDefault();
    dispatch({
      type: 'hydrate',
      status: stored.status,
      currentQuestionIndex: stored.currentQuestionIndex,
      answers: stored.answers,
    });
  }, []);

  // Persist to storage whenever state changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    saveBusinessIdeaReadinessState({
      version: 1,
      status,
      currentQuestionIndex,
      answers,
    });
  }, [status, currentQuestionIndex, answers, hydrated]);

  const totalQuestions = QUESTIONS.length;
  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const handleStart = useCallback(() => {
    dispatch({ type: 'start' });
  }, []);

  const handleSelect = useCallback((optionId: string) => {
    dispatch({ type: 'select', optionId });
  }, []);

  const handleContinue = useCallback(() => {
    const questionId = QUESTIONS[currentQuestionIndex].id;
    if (!answers[questionId]) {
      dispatch({ type: 'set_validation_error', message: t('validation.selectAnswer') });
      return;
    }
    dispatch({ type: 'continue', isLast: isLastQuestion });
    requestAnimationFrame(() => {
      questionRef.current?.focus();
    });
  }, [currentQuestionIndex, answers, isLastQuestion, t]);

  const handleBack = useCallback(() => {
    dispatch({ type: 'back' });
    requestAnimationFrame(() => {
      questionRef.current?.focus();
    });
  }, []);

  const handleRestart = useCallback(() => {
    if (!window.confirm(t('controls.restartConfirm'))) return;
    clearBusinessIdeaReadinessState();
    dispatch({ type: 'restart' });
  }, [t]);

  // Don't render until hydrated to avoid SSR/client mismatch
  if (!hydrated) {
    return null;
  }

  if (status === 'intro') {
    return <AssessmentIntro onStart={handleStart} />;
  }

  if (status === 'complete') {
    const scores: ScoreResult = computeScore(answers);
    const recommendations: RecommendationResult = buildRecommendations({
      scores,
      obstacleAnswer: answers['q11'] ?? null,
      weeklyTimeAnswer: answers['q12'] ?? null,
      validationAnswer: answers['q5'] ?? null,
      sevenDayActionAnswer: answers['q9'] ?? null,
    });
    const planKey = buildSevenDayPlanKey(
      scores.weakestDimension,
      answers['q11'] ?? null,
      answers['q12'] ?? null,
    );

    return (
      <AssessmentResults
        scores={scores}
        recommendations={recommendations}
        sevenDayPlanKey={planKey}
        onRestart={handleRestart}
      />
    );
  }

  // in_progress
  return (
    <div className="mx-auto max-w-2xl">
      <AssessmentProgress
        currentIndex={currentQuestionIndex}
        totalQuestions={totalQuestions}
        dimensionKey={currentQuestion.dimension}
      />
      {/* Focusable wrapper for keyboard focus management */}
      <div
        ref={questionRef}
        tabIndex={-1}
        className="outline-none"
      >
        <AssessmentQuestion
          question={currentQuestion}
          questionIndex={currentQuestionIndex}
          totalQuestions={totalQuestions}
          selectedOptionId={answers[currentQuestion.id] ?? null}
          onSelect={handleSelect}
          onContinue={handleContinue}
          onBack={handleBack}
          showBackButton={currentQuestionIndex > 0}
          isLast={isLastQuestion}
          validationError={validationError}
        />
      </div>

      {/* Restart link */}
      <div className="mt-8 border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={handleRestart}
          className="text-xs text-slate-500 hover:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          {t('controls.restart')}
        </button>
      </div>
    </div>
  );
}
