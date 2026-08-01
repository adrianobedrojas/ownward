'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  consentAllowsCategories,
  PRIVACY_CONSENT_CHANGED_EVENT,
  PRIVACY_CONSENT_STORAGE_KEY,
} from '@/lib/privacy-consent';
import { usePrivacyConsent, OpenPrivacyChoicesButton } from '@/components/PrivacyConsent';
import type { AcademyCourse } from '@/lib/academy-content';

// ─── Storage key ─────────────────────────────────────────────────────────────

export const ACADEMY_PROGRESS_STORAGE_KEY = 'ownward_academy_progress_v1';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AcademyProgressData {
  completedLessons: Record<string, string[]>;
  updatedAt: string;
}

// ─── Storage helpers (pure, no side effects) ─────────────────────────────────

function parseProgress(raw: string | null): AcademyProgressData {
  const empty: AcademyProgressData = { completedLessons: {}, updatedAt: '' };
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return empty;
    const completedLessons: Record<string, string[]> = {};
    if (parsed.completedLessons && typeof parsed.completedLessons === 'object') {
      for (const [slug, ids] of Object.entries(parsed.completedLessons)) {
        if (Array.isArray(ids) && ids.every((id) => typeof id === 'string')) {
          completedLessons[slug] = ids;
        }
      }
    }
    return {
      completedLessons,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return empty;
  }
}

function readProgress(): AcademyProgressData {
  try {
    const raw = window.localStorage.getItem(ACADEMY_PROGRESS_STORAGE_KEY);
    return parseProgress(raw);
  } catch {
    return { completedLessons: {}, updatedAt: '' };
  }
}

function writeProgress(data: AcademyProgressData): void {
  try {
    window.localStorage.setItem(
      ACADEMY_PROGRESS_STORAGE_KEY,
      JSON.stringify(data),
    );
  } catch {
    // storage unavailable — silently ignore
  }
}

function removeProgress(): void {
  try {
    window.localStorage.removeItem(ACADEMY_PROGRESS_STORAGE_KEY);
  } catch {
    // storage unavailable — silently ignore
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface CourseProgressState {
  /** Null means not yet hydrated */
  data: AcademyProgressData | null;
  confirming: boolean;
}

type ProgressAction =
  | { type: 'hydrate'; data: AcademyProgressData }
  | { type: 'toggle'; courseSlug: string; lessonId: string; validIds: string[] }
  | { type: 'reset'; courseSlug: string }
  | { type: 'confirm_reset' }
  | { type: 'cancel_reset' }
  | { type: 'clear' };

function progressReducer(
  state: CourseProgressState,
  action: ProgressAction,
): CourseProgressState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, data: action.data };

    case 'toggle': {
      if (!state.data) return state;
      const current = state.data.completedLessons[action.courseSlug] ?? [];
      const isComplete = current.includes(action.lessonId);
      const next = isComplete
        ? current.filter((id) => id !== action.lessonId)
        : [...current, action.lessonId].filter((id) =>
            action.validIds.includes(id),
          );
      const nextData: AcademyProgressData = {
        completedLessons: { ...state.data.completedLessons, [action.courseSlug]: next },
        updatedAt: new Date().toISOString(),
      };
      writeProgress(nextData);
      return { ...state, data: nextData };
    }

    case 'reset':
      return { ...state, confirming: true };

    case 'confirm_reset': {
      if (!state.data) return { ...state, confirming: false };
      return { ...state, data: null, confirming: false };
    }

    case 'cancel_reset':
      return { ...state, confirming: false };

    case 'clear':
      return { ...state, data: null };

    default:
      return state;
  }
}

// ─── useAcademyProgress ───────────────────────────────────────────────────────

export function useAcademyProgress(course: AcademyCourse) {
  const { consent } = usePrivacyConsent();
  const hasFunctionalConsent = consentAllowsCategories(consent, 'functionality');
  const isHydrated = useRef(false);

  const [state, dispatch] = useReducer(progressReducer, {
    data: null,
    confirming: false,
  });

  // Hydrate from localStorage on mount if consent is available
  useEffect(() => {
    if (!hasFunctionalConsent) {
      if (isHydrated.current) {
        dispatch({ type: 'clear' });
      }
      return;
    }
    const data = readProgress();
    dispatch({ type: 'hydrate', data });
    isHydrated.current = true;
  }, [hasFunctionalConsent]);

  // Listen for consent change events to remove data immediately on revocation
  useEffect(() => {
    function handleConsentChange() {
      const raw = (() => {
        try {
          return window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY);
        } catch {
          return null;
        }
      })();
      const consentObj = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;
      const stillHasFunctionality = Boolean(consentObj?.functionality);
      if (!stillHasFunctionality) {
        removeProgress();
        dispatch({ type: 'clear' });
        isHydrated.current = false;
      }
    }
    window.addEventListener(PRIVACY_CONSENT_CHANGED_EVENT, handleConsentChange);
    return () =>
      window.removeEventListener(PRIVACY_CONSENT_CHANGED_EVENT, handleConsentChange);
  }, []);

  const validIds = useMemo(
    () => (course.lessons ?? []).map((l) => l.id),
    [course.lessons],
  );

  const completedIds = useMemo<string[]>(() => {
    if (!state.data) return [];
    const raw = state.data.completedLessons[course.slug] ?? [];
    return raw.filter((id) => validIds.includes(id));
  }, [state.data, course.slug, validIds]);

  const total = validIds.length;
  const completed = new Set(completedIds).size;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  const toggleLesson = useCallback(
    (lessonId: string) => {
      if (!hasFunctionalConsent) return;
      dispatch({ type: 'toggle', courseSlug: course.slug, lessonId, validIds });
    },
    [hasFunctionalConsent, course.slug, validIds],
  );

  const startReset = useCallback(() => dispatch({ type: 'reset', courseSlug: course.slug }), [course.slug]);

  const confirmReset = useCallback(() => {
    if (!state.data) {
      dispatch({ type: 'cancel_reset' });
      return;
    }
    const nextData: AcademyProgressData = {
      completedLessons: { ...state.data.completedLessons, [course.slug]: [] },
      updatedAt: new Date().toISOString(),
    };
    writeProgress(nextData);
    dispatch({ type: 'hydrate', data: nextData });
    dispatch({ type: 'cancel_reset' });
  }, [state.data, course.slug]);

  const cancelReset = useCallback(() => dispatch({ type: 'cancel_reset' }), []);

  return {
    hasFunctionalConsent,
    /** True once hydrated from localStorage */
    isReady: state.data !== null,
    completedIds,
    total,
    completed,
    percent,
    isLessonComplete: (id: string) => completedIds.includes(id),
    toggleLesson,
    confirming: state.confirming,
    startReset,
    confirmReset,
    cancelReset,
  };
}

// ─── AcademyProgressBar ───────────────────────────────────────────────────────

interface AcademyProgressBarProps {
  completed: number;
  total: number;
  percent: number;
}

export function AcademyProgressBar({ completed, total, percent }: AcademyProgressBarProps) {
  const t = useTranslations('Academy');
  return (
    <div className="space-y-1">
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('progressLabel', { completed, total })}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-800"
      >
        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-300 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-slate-400">
        {t('progressLabel', { completed, total })}
      </p>
    </div>
  );
}

// ─── AcademyNoConsentNotice ───────────────────────────────────────────────────

export function AcademyNoConsentNotice() {
  const t = useTranslations('Academy');
  return (
    <div className="rounded-xl border border-amber-800/40 bg-amber-950/30 p-4 text-sm text-amber-200">
      <p>{t('noFunctionalityConsent')}</p>
      <div className="mt-3">
        <OpenPrivacyChoicesButton className="rounded-lg border border-amber-700/50 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:border-amber-500 hover:text-amber-200">
          {t('openPrivacyChoices')}
        </OpenPrivacyChoicesButton>
      </div>
    </div>
  );
}

// ─── LessonCompletionButton ───────────────────────────────────────────────────

interface LessonCompletionButtonProps {
  lessonId: string;
  isComplete: boolean;
  onToggle: (id: string) => void;
  hasFunctionalConsent: boolean;
}

export function LessonCompletionButton({
  lessonId,
  isComplete,
  onToggle,
  hasFunctionalConsent,
}: LessonCompletionButtonProps) {
  const t = useTranslations('Academy');

  if (!hasFunctionalConsent) return null;

  return (
    <button
      type="button"
      onClick={() => onToggle(lessonId)}
      aria-pressed={isComplete}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        isComplete
          ? 'border-cyan-700 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20'
          : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
      }`}
    >
      {isComplete ? t('markIncomplete') : t('markComplete')}
    </button>
  );
}

// ─── CourseProgressCta ───────────────────────────────────────────────────────

interface CourseProgressCtaProps {
  completed: number;
  total: number;
  isReady: boolean;
  hasFunctionalConsent: boolean;
}

export function CourseProgressCta({
  completed,
  total,
  isReady,
  hasFunctionalConsent,
}: CourseProgressCtaProps) {
  const t = useTranslations('Academy');

  if (!hasFunctionalConsent || !isReady) return null;

  if (completed === 0) return <span className="text-sm font-semibold text-cyan-300">{t('startCourse')}</span>;
  if (completed < total) return <span className="text-sm font-semibold text-cyan-300">{t('continueCourse')}</span>;
  return <span className="text-sm font-semibold text-cyan-300">{t('reviewCourse')}</span>;
}

// ─── ResetProgressControl ────────────────────────────────────────────────────

interface ResetProgressControlProps {
  confirming: boolean;
  onStart: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  hasFunctionalConsent: boolean;
  isReady: boolean;
}

export function ResetProgressControl({
  confirming,
  onStart,
  onConfirm,
  onCancel,
  hasFunctionalConsent,
  isReady,
}: ResetProgressControlProps) {
  const t = useTranslations('Academy');

  if (!hasFunctionalConsent || !isReady) return null;

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-300">{t('resetConfirm')}</span>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg border border-red-700/50 px-3 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-900/20"
        >
          {t('resetYes')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-400 transition hover:border-slate-600 hover:text-white"
        >
          {t('resetNo')}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onStart}
      className="text-xs text-slate-500 hover:text-slate-300 transition"
    >
      {t('resetProgress')}
    </button>
  );
}
