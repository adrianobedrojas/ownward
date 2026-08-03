/**
 * lib/business-idea-readiness/questions.ts
 *
 * Static question/option definitions for the Business Idea Readiness Check.
 * Pure data — no I/O, no React.
 *
 * Questions Q1–Q10 and Q12 are scored (0–3 points each, max 3).
 * Q11 is a diagnostic obstacle question only (no score contribution).
 *
 * Option IDs are stable identifiers used for storage and scoring.
 */

import type { AssessmentQuestion } from './types';

export const QUESTIONS: AssessmentQuestion[] = [
  // ── Dimension: problem_clarity ─────────────────────────────────────────────
  {
    id: 'q1',
    dimension: 'problem_clarity',
    scored: true,
    maxPoints: 3,
    options: [
      { id: 'not_yet', points: 0 },
      { id: 'general_idea', points: 1 },
      { id: 'clear', points: 2 },
      { id: 'validated', points: 3 },
    ],
  },
  {
    id: 'q2',
    dimension: 'problem_clarity',
    scored: true,
    maxPoints: 3,
    options: [
      { id: 'not_yet', points: 0 },
      { id: 'general_idea', points: 1 },
      { id: 'clear', points: 2 },
      { id: 'validated', points: 3 },
    ],
  },
  // ── Dimension: customer_clarity ────────────────────────────────────────────
  {
    id: 'q3',
    dimension: 'customer_clarity',
    scored: true,
    maxPoints: 3,
    options: [
      { id: 'not_yet', points: 0 },
      { id: 'general_idea', points: 1 },
      { id: 'clear', points: 2 },
      { id: 'validated', points: 3 },
    ],
  },
  {
    id: 'q4',
    dimension: 'customer_clarity',
    scored: true,
    maxPoints: 3,
    options: [
      { id: 'not_yet', points: 0 },
      { id: 'general_idea', points: 1 },
      { id: 'clear', points: 2 },
      { id: 'validated', points: 3 },
    ],
  },
  // ── Dimension: offer_value ─────────────────────────────────────────────────
  {
    id: 'q5',
    dimension: 'offer_value',
    scored: true,
    maxPoints: 3,
    options: [
      { id: 'not_yet', points: 0 },
      { id: 'general_idea', points: 1 },
      { id: 'clear', points: 2 },
      { id: 'validated', points: 3 },
    ],
  },
  {
    id: 'q6',
    dimension: 'offer_value',
    scored: true,
    maxPoints: 3,
    options: [
      { id: 'not_yet', points: 0 },
      { id: 'general_idea', points: 1 },
      { id: 'clear', points: 2 },
      { id: 'validated', points: 3 },
    ],
  },
  // ── Dimension: business_model ──────────────────────────────────────────────
  {
    id: 'q7',
    dimension: 'business_model',
    scored: true,
    maxPoints: 3,
    options: [
      { id: 'not_yet', points: 0 },
      { id: 'general_idea', points: 1 },
      { id: 'clear', points: 2 },
      { id: 'validated', points: 3 },
    ],
  },
  {
    id: 'q8',
    dimension: 'business_model',
    scored: true,
    maxPoints: 3,
    options: [
      { id: 'not_yet', points: 0 },
      { id: 'general_idea', points: 1 },
      { id: 'clear', points: 2 },
      { id: 'validated', points: 3 },
    ],
  },
  // ── Dimension: execution_readiness ────────────────────────────────────────
  {
    id: 'q9',
    dimension: 'execution_readiness',
    scored: true,
    maxPoints: 3,
    options: [
      { id: 'not_yet', points: 0 },
      { id: 'general_idea', points: 1 },
      { id: 'clear', points: 2 },
      { id: 'validated', points: 3 },
    ],
  },
  {
    id: 'q10',
    dimension: 'execution_readiness',
    scored: true,
    maxPoints: 3,
    options: [
      { id: 'not_yet', points: 0 },
      { id: 'general_idea', points: 1 },
      { id: 'clear', points: 2 },
      { id: 'validated', points: 3 },
    ],
  },
  // ── Q11: Diagnostic obstacle only (no score) ──────────────────────────────
  {
    id: 'q11',
    dimension: 'execution_readiness',
    scored: false,
    maxPoints: 0,
    options: [
      { id: 'not_sure_where_to_start' },
      { id: 'customer_research' },
      { id: 'define_offer' },
      { id: 'funding' },
      { id: 'technical_help' },
      { id: 'confidence_accountability' },
      { id: 'organize_idea' },
      { id: 'other' },
    ],
  },
  // ── Q12: Execution readiness / weekly time (scored) ───────────────────────
  {
    id: 'q12',
    dimension: 'execution_readiness',
    scored: true,
    maxPoints: 3,
    options: [
      { id: 'less_than_2h', points: 0 },
      { id: '2_to_5h', points: 1 },
      { id: '5_to_10h', points: 2 },
      { id: 'more_than_10h', points: 3 },
    ],
  },
];

/** Question IDs that are required for the assessment to be complete */
export const REQUIRED_QUESTION_IDS = QUESTIONS.map((q) => q.id);

/** IDs of questions that contribute to scoring */
export const SCORED_QUESTION_IDS = QUESTIONS.filter((q) => q.scored).map((q) => q.id);
