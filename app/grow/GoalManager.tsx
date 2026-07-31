"use client";

import { useMemo, useRef, useState } from "react";
import { createGoal, deleteGoal, updateGoal } from "./actions";
import {
  CATEGORY_LABELS,
  GOAL_CATEGORIES,
  GOAL_STATUSES,
  STATUS_LABELS,
  type GoalCategory,
  type GoalStatus,
  type GrowthGoal,
} from "./types";

type GoalFilter = "active" | "completed" | "paused" | "cancelled" | "all";

interface FeedbackState {
  type: "success" | "error";
  message: string;
}

interface GoalFormState {
  title: string;
  category: GoalCategory;
  metricName: string;
  metricUnit: string;
  startValue: string;
  currentValue: string;
  targetValue: string;
  deadline: string;
  status: GoalStatus;
  notes: string;
}

const DEFAULT_FORM: GoalFormState = {
  title: "",
  category: "other",
  metricName: "",
  metricUnit: "",
  startValue: "",
  currentValue: "",
  targetValue: "",
  deadline: "",
  status: "active",
  notes: "",
};

function goalToForm(goal: GrowthGoal): GoalFormState {
  return {
    title: goal.title,
    category: goal.category,
    metricName: goal.metric_name ?? "",
    metricUnit: goal.metric_unit ?? "",
    startValue: goal.start_value != null ? String(goal.start_value) : "",
    currentValue: goal.current_value != null ? String(goal.current_value) : "",
    targetValue: goal.target_value != null ? String(goal.target_value) : "",
    deadline: goal.deadline ?? "",
    status: goal.status,
    notes: goal.notes ?? "",
  };
}

function calcProgress(goal: GrowthGoal): number | null {
  const start = goal.start_value;
  const current = goal.current_value;
  const target = goal.target_value;
  if (start == null || current == null || target == null) return null;
  const range = target - start;
  if (range === 0) return current >= target ? 100 : 0;
  const raw = ((current - start) / range) * 100;
  return Math.min(100, Math.max(0, raw));
}

function isOverdue(goal: GrowthGoal): boolean {
  if (!goal.deadline) return false;
  if (goal.status === "completed" || goal.status === "cancelled") return false;
  return new Date(goal.deadline + "T00:00:00") < new Date();
}

function formatDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value + "T00:00:00");
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(d);
}

function formatNumber(value: number | null, unit?: string | null) {
  if (value == null) return "—";
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

const STATUS_COLORS: Record<GoalStatus, string> = {
  active: "bg-cyan-400/10 text-cyan-300",
  completed: "bg-emerald-400/10 text-emerald-300",
  paused: "bg-amber-400/10 text-amber-300",
  cancelled: "bg-slate-700 text-slate-400",
};

interface GoalManagerProps {
  initialGoals: GrowthGoal[];
  initialError?: string;
}

export default function GoalManager({ initialGoals, initialError }: GoalManagerProps) {
  const [goals, setGoals] = useState<GrowthGoal[]>(initialGoals);
  const [filter, setFilter] = useState<GoalFilter>("active");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalFormState>(DEFAULT_FORM);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const formRef = useRef<HTMLDivElement>(null);
  const [nowMs] = useState(Date.now);

  const filtered = useMemo(() => {
    const list = filter === "all" ? goals : goals.filter((g) => g.status === filter);
    return [...list].sort((a, b) => {
      if (!a.deadline && b.deadline) return 1;
      if (a.deadline && !b.deadline) return -1;
      if (a.deadline && b.deadline && a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
      return b.created_at.localeCompare(a.created_at);
    });
  }, [goals, filter]);

  const stats = useMemo(() => {
    const active = goals.filter((g) => g.status === "active");
    const completed = goals.filter((g) => g.status === "completed");
    const dueSoon = active.filter((g) => {
      if (!g.deadline) return false;
      const diff = (new Date(g.deadline + "T00:00:00").getTime() - nowMs) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 14;
    });
    const progresses = active.map(calcProgress).filter((p): p is number => p !== null);
    const avgProgress = progresses.length > 0 ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : 0;
    return { activeCount: active.length, completedCount: completed.length, dueSoonCount: dueSoon.length, avgProgress };
  }, [goals, nowMs]);

  function startCreate() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFieldErrors({});
    setFeedback(null);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function startEdit(goal: GrowthGoal) {
    setEditingId(goal.id);
    setForm(goalToForm(goal));
    setFieldErrors({});
    setFeedback(null);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFieldErrors({});
    setFeedback(null);
  }

  function setField<K extends keyof GoalFormState>(key: K, value: GoalFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const input = {
      title: form.title,
      category: form.category,
      metricName: form.metricName || null,
      metricUnit: form.metricUnit || null,
      startValue: form.startValue || null,
      currentValue: form.currentValue || null,
      targetValue: form.targetValue || null,
      deadline: form.deadline || null,
      notes: form.notes || null,
    };

    const result = editingId
      ? await updateGoal({ ...input, id: editingId, status: form.status })
      : await createGoal(input);

    setSubmitting(false);

    if (!result.success) {
      setFeedback({ type: "error", message: result.message });
      if (result.errors) setFieldErrors(result.errors as Record<string, string>);
      return;
    }

    setFeedback({ type: "success", message: result.message });

    if (result.goal) {
      if (editingId) {
        setGoals((prev) => prev.map((g) => (g.id === editingId ? result.goal! : g)));
      } else {
        setGoals((prev) => [result.goal!, ...prev]);
      }
    }

    setShowForm(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
  }

  async function handleDelete(id: string) {
    setSubmitting(true);
    const result = await deleteGoal(id);
    setSubmitting(false);
    setDeleteConfirmId(null);

    if (!result.success) {
      setFeedback({ type: "error", message: result.message });
      return;
    }

    setGoals((prev) => prev.filter((g) => g.id !== id));
    setFeedback({ type: "success", message: "Goal deleted." });
  }

  const filterLabels: Record<GoalFilter, string> = {
    all: "All",
    active: "Active",
    completed: "Completed",
    paused: "Paused",
    cancelled: "Cancelled",
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Ownward Grow</p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">90-Day Growth Planner</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Set measurable growth goals with deadlines, track progress, and focus on what moves your business forward.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="rounded-lg bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          + New goal
        </button>
      </div>

      {/* Global feedback */}
      {feedback && !showForm && (
        <div
          role="status"
          className={`mt-4 rounded-lg p-3 text-sm font-medium ${
            feedback.type === "success" ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Summary cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Active goals</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.activeCount}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Average progress</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">{stats.avgProgress}%</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Due within 14 days</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">{stats.dueSoonCount}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Completed goals</p>
          <p className="mt-2 text-3xl font-bold text-cyan-300">{stats.completedCount}</p>
        </article>
      </div>

      {/* Load error */}
      {initialError && (
        <div role="alert" className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
          {initialError}
        </div>
      )}

      {/* Goal form */}
      {showForm && (
        <div ref={formRef} className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-xl font-bold text-white">{editingId ? "Edit goal" : "New growth goal"}</h2>

          {feedback && (
            <div
              role="status"
              className={`mt-4 rounded-lg p-3 text-sm font-medium ${
                feedback.type === "success" ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            {/* Title */}
            <div>
              <label htmlFor="goal-title" className="block text-sm font-semibold text-slate-300">
                Goal title <span aria-hidden="true" className="text-red-400">*</span>
              </label>
              <input
                id="goal-title"
                type="text"
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Reach $15,000 monthly revenue"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
              />
              {fieldErrors.title && <p className="mt-1 text-xs text-red-400">{fieldErrors.title}</p>}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Category */}
              <div>
                <label htmlFor="goal-category" className="block text-sm font-semibold text-slate-300">Category</label>
                <select
                  id="goal-category"
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value as GoalCategory)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 outline-none focus:border-cyan-400"
                >
                  {GOAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>

              {/* Status (edit only) */}
              {editingId && (
                <div>
                  <label htmlFor="goal-status" className="block text-sm font-semibold text-slate-300">Status</label>
                  <select
                    id="goal-status"
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value as GoalStatus)}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 outline-none focus:border-cyan-400"
                  >
                    {GOAL_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Deadline */}
              <div>
                <label htmlFor="goal-deadline" className="block text-sm font-semibold text-slate-300">Deadline</label>
                <input
                  id="goal-deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setField("deadline", e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 outline-none focus:border-cyan-400"
                />
                {fieldErrors.deadline && <p className="mt-1 text-xs text-red-400">{fieldErrors.deadline}</p>}
              </div>
            </div>

            {/* Metric */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="goal-metric-name" className="block text-sm font-semibold text-slate-300">Metric name</label>
                <input
                  id="goal-metric-name"
                  type="text"
                  value={form.metricName}
                  onChange={(e) => setField("metricName", e.target.value)}
                  placeholder="e.g. Monthly revenue"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>
              <div>
                <label htmlFor="goal-metric-unit" className="block text-sm font-semibold text-slate-300">Unit</label>
                <input
                  id="goal-metric-unit"
                  type="text"
                  value={form.metricUnit}
                  onChange={(e) => setField("metricUnit", e.target.value)}
                  placeholder="e.g. USD, customers, %"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Values */}
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label htmlFor="goal-start" className="block text-sm font-semibold text-slate-300">Starting value</label>
                <input
                  id="goal-start"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={form.startValue}
                  onChange={(e) => setField("startValue", e.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
                {fieldErrors.startValue && <p className="mt-1 text-xs text-red-400">{fieldErrors.startValue}</p>}
              </div>
              <div>
                <label htmlFor="goal-current" className="block text-sm font-semibold text-slate-300">Current value</label>
                <input
                  id="goal-current"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={form.currentValue}
                  onChange={(e) => setField("currentValue", e.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
                {fieldErrors.currentValue && <p className="mt-1 text-xs text-red-400">{fieldErrors.currentValue}</p>}
              </div>
              <div>
                <label htmlFor="goal-target" className="block text-sm font-semibold text-slate-300">Target value</label>
                <input
                  id="goal-target"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={form.targetValue}
                  onChange={(e) => setField("targetValue", e.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
                {fieldErrors.targetValue && <p className="mt-1 text-xs text-red-400">{fieldErrors.targetValue}</p>}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="goal-notes" className="block text-sm font-semibold text-slate-300">Notes</label>
              <textarea
                id="goal-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Context, strategy, or next steps for this goal…"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
              >
                {submitting ? "Saving…" : editingId ? "Save changes" : "Create goal"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="mt-10 flex flex-wrap gap-2">
        {(Object.keys(filterLabels) as GoalFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              filter === f
                ? "bg-cyan-400 text-slate-950"
                : "border border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white"
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Goal list */}
      <div className="mt-6 space-y-4">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-6 py-12 text-center">
            {goals.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold text-white">No growth goals yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                  Create your first goal to start tracking measurable progress toward growing your business.
                </p>
                <button
                  onClick={startCreate}
                  className="mt-6 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
                >
                  Create a growth goal
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-400">No {filter === "all" ? "" : filter} goals found.</p>
            )}
          </div>
        )}

        {filtered.map((goal) => {
          const progress = calcProgress(goal);
          const overdue = isOverdue(goal);

          return (
            <article
              key={goal.id}
              className={`rounded-xl border bg-slate-900 p-5 ${
                overdue ? "border-red-400/40" : "border-slate-800"
              }`}
            >
              {/* Delete confirm */}
              {deleteConfirmId === goal.id ? (
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-sm font-medium text-white">Delete &ldquo;{goal.title}&rdquo;? This cannot be undone.</p>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    disabled={submitting}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
                  >
                    {submitting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="text-sm font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-white">{goal.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[goal.status]}`}>
                          {STATUS_LABELS[goal.status]}
                        </span>
                        {overdue && (
                          <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-xs font-semibold text-red-300">
                            Overdue
                          </span>
                        )}
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                          {CATEGORY_LABELS[goal.category]}
                        </span>
                      </div>
                      {goal.deadline && (
                        <p className="mt-1 text-xs text-slate-500">
                          Due {formatDate(goal.deadline)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => startEdit(goal)}
                        className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(goal.id)}
                        className="text-sm font-semibold text-slate-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {progress !== null && (
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-slate-400">
                        <span>
                          {formatNumber(goal.current_value, goal.metric_unit)} of {formatNumber(goal.target_value, goal.metric_unit)}
                        </span>
                        <span className="font-semibold text-white">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
                        <div
                          className={`h-full rounded-full transition-all ${
                            goal.status === "completed" ? "bg-emerald-400" : "bg-cyan-400"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Values (no progress bar case) */}
                  {progress === null && (goal.start_value != null || goal.current_value != null || goal.target_value != null) && (
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                      {goal.start_value != null && <span>Start: {formatNumber(goal.start_value, goal.metric_unit)}</span>}
                      {goal.current_value != null && <span>Current: {formatNumber(goal.current_value, goal.metric_unit)}</span>}
                      {goal.target_value != null && <span>Target: {formatNumber(goal.target_value, goal.metric_unit)}</span>}
                    </div>
                  )}

                  {goal.notes && (
                    <p className="mt-3 text-sm leading-6 text-slate-400">{goal.notes}</p>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>

      {/* Tasks link */}
      <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="font-semibold text-white">Break goals into tasks</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Once you have a growth goal, use the Tasks section to create specific action steps with deadlines. Tasks and goals stay in sync so you don&apos;t manage two separate lists.
        </p>
        <a
          href="/tasks"
          className="mt-4 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
        >
          Open Tasks →
        </a>
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="font-semibold text-white">Growth recommendations are educational</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Ownward can help organize information, identify possible improvement areas, and track business goals. Results are not guaranteed, and important financial, legal, tax, marketing, or operational decisions may require advice from qualified professionals.
        </p>
      </div>
    </section>
  );
}
