/**
 * lib/business-idea-readiness/storage.ts
 *
 * localStorage persistence for the Business Idea Readiness Check.
 *
 * Storage key: `ownward_business_idea_readiness_v1`
 * Stored shape: BusinessIdeaReadinessStorageState
 *
 * Privacy behaviour:
 * • Answers are saved across refresh ONLY when functionality consent is granted.
 * • Without consent the state lives in memory only (not persisted).
 * • No PII is ever stored; only stable option IDs and numeric indices.
 * • Answers are never shared or made public.
 */

import type { BusinessIdeaReadinessStorageState } from './types';
import { hasPrivacyConsent } from '@/lib/privacy-consent';

export const BUSINESS_IDEA_READINESS_STORAGE_KEY = 'ownward_business_idea_readiness_v1';
export const BUSINESS_IDEA_READINESS_STORAGE_VERSION = 1 as const;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function makeDefault(): BusinessIdeaReadinessStorageState {
  return {
    version: 1,
    status: 'intro',
    currentQuestionIndex: 0,
    answers: {},
  };
}

function isValidState(value: unknown): value is BusinessIdeaReadinessStorageState {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.version === 1 &&
    (obj.status === 'intro' ||
      obj.status === 'in_progress' ||
      obj.status === 'complete') &&
    typeof obj.currentQuestionIndex === 'number' &&
    obj.currentQuestionIndex >= 0 &&
    obj.answers !== null &&
    typeof obj.answers === 'object' &&
    !Array.isArray(obj.answers)
  );
}

/**
 * Read persisted state from localStorage.
 * Returns null if not present, invalid, or browser context is unavailable.
 */
export function readBusinessIdeaReadinessState(): BusinessIdeaReadinessStorageState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(BUSINESS_IDEA_READINESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persist state to localStorage if functionality consent is granted.
 * If consent is absent, this is a no-op (caller uses in-memory state).
 */
export function saveBusinessIdeaReadinessState(
  state: BusinessIdeaReadinessStorageState,
): void {
  if (!isBrowser()) return;
  if (!hasPrivacyConsent('functionality')) return;
  try {
    window.localStorage.setItem(
      BUSINESS_IDEA_READINESS_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Quota exceeded or storage unavailable — silently ignore
  }
}

/**
 * Remove persisted state from localStorage.
 */
export function clearBusinessIdeaReadinessState(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(BUSINESS_IDEA_READINESS_STORAGE_KEY);
  } catch {
    // Silently ignore
  }
}

/**
 * Load persisted state or return a default intro state.
 */
export function loadOrDefault(): BusinessIdeaReadinessStorageState {
  return readBusinessIdeaReadinessState() ?? makeDefault();
}
