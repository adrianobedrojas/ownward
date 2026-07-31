"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveListing,
  removeSavedListing,
  startConversation,
  sendMessage,
  submitListingInterest,
} from "@/app/actions/messaging";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  listingId: string;
  listingName: string;
  listingSlug: string;
  isSignedIn: boolean;
  initialSaved?: boolean;
}

type ModalMode = "none" | "ask" | "interest" | "request";

const GOAL_OPTIONS = [
  { value: "owner_operator", label: "Owner-operated business" },
  { value: "passive_investment", label: "Passive investment" },
  { value: "strategic_add_on", label: "Strategic add-on" },
  { value: "researching", label: "Still researching options" },
] as const;

const FINANCING_OPTIONS = [
  { value: "cash", label: "Cash purchase" },
  { value: "prequalified", label: "Pre-qualified for financing" },
  { value: "seeking_financing", label: "Seeking financing" },
  { value: "unsure", label: "Not sure yet" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ListingInterestPanel({
  listingId,
  listingName,
  listingSlug,
  isSignedIn,
  initialSaved = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [saved, setSaved] = useState(initialSaved);
  const [modal, setModal] = useState<ModalMode>("none");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Ask-a-question form state
  const [question, setQuestion] = useState("");

  // Interest form state
  const [goal, setGoal] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [timeline, setTimeline] = useState("");
  const [financingStatus, setFinancingStatus] = useState("");
  const [experience, setExperience] = useState("");
  const [initialQuestion, setInitialQuestion] = useState("");

  const returnUrl = `/b/${listingSlug}`;

  function requireAuth() {
    if (!isSignedIn) {
      router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
      return false;
    }
    return true;
  }

  function openModal(mode: ModalMode) {
    if (!requireAuth()) return;
    setError(null);
    setSuccess(null);
    setModal(mode);
  }

  function closeModal() {
    setModal("none");
    setError(null);
    setSuccess(null);
  }

  // ── Save / Unsave ──────────────────────────────────────────────────────────

  function handleToggleSave() {
    if (!requireAuth()) return;
    setError(null);

    const fd = new FormData();
    fd.append("listingId", listingId);

    startTransition(async () => {
      const result = saved
        ? await removeSavedListing(fd)
        : await saveListing(fd);

      if (result.error) {
        setError(result.error);
      } else {
        setSaved(!saved);
      }
    });
  }

  // ── Ask seller a question ──────────────────────────────────────────────────

  function handleAskSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) {
      setError("Please enter your question.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const convResult = await startConversation(listingId);
      if (convResult.error || !convResult.conversationId) {
        setError(convResult.error || "Could not start conversation.");
        return;
      }

      const fd = new FormData();
      fd.append("conversationId", convResult.conversationId);
      fd.append("body", question.trim());
      const msgResult = await sendMessage(fd);

      if (msgResult.error) {
        setError(msgResult.error);
        return;
      }

      setSuccess("Your question was sent! The seller will respond through Ownward.");
      setQuestion("");
      setTimeout(() => {
        closeModal();
        router.push(`/messages/${convResult.conversationId}`);
      }, 1500);
    });
  }

  // ── Submit interest ────────────────────────────────────────────────────────

  function handleInterestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal) {
      setError("Please select your acquisition goal.");
      return;
    }
    setError(null);

    const fd = new FormData();
    fd.append("listingId", listingId);
    fd.append("goal", goal);
    if (budgetMin) fd.append("budget_min", budgetMin);
    if (budgetMax) fd.append("budget_max", budgetMax);
    if (timeline) fd.append("timeline", timeline);
    if (financingStatus) fd.append("financing_status", financingStatus);
    if (experience) fd.append("experience", experience);
    if (initialQuestion) fd.append("initial_question", initialQuestion);

    startTransition(async () => {
      const result = await submitListingInterest(fd);
      if (result.error) {
        setError(result.error);
        return;
      }

      const data = result.data as { conversationId?: string };
      setSuccess("Your interest has been shared with the seller.");
      setTimeout(() => {
        closeModal();
        if (data?.conversationId) {
          router.push(`/messages/${data.conversationId}`);
        }
      }, 1500);
    });
  }

  // ── Request more details ───────────────────────────────────────────────────

  function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) {
      setError("Please enter your request.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const convResult = await startConversation(listingId);
      if (convResult.error || !convResult.conversationId) {
        setError(convResult.error || "Could not start conversation.");
        return;
      }

      const fd = new FormData();
      fd.append("conversationId", convResult.conversationId);
      fd.append("body", question.trim());
      const msgResult = await sendMessage(fd);

      if (msgResult.error) {
        setError(msgResult.error);
        return;
      }

      setSuccess("Your request was sent. The seller will follow up with more details.");
      setQuestion("");
      setTimeout(() => {
        closeModal();
        router.push(`/messages/${convResult.conversationId}`);
      }, 1500);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Action Panel */}
      <section
        aria-label="Buyer actions"
        className="rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-3"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Interested in this business?
        </h2>

        {error && !modal && (
          <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={handleToggleSave}
          disabled={isPending}
          aria-pressed={saved}
          className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition disabled:opacity-60 ${
            saved
              ? "border-cyan-500/50 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
              : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          }`}
        >
          <span aria-hidden="true">{saved ? "★" : "☆"}</span>
          {saved ? "Saved privately" : "Save privately"}
        </button>

        {/* Ask a question */}
        <button
          type="button"
          onClick={() => openModal("ask")}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
        >
          <span aria-hidden="true">💬</span>
          Ask the seller a question
        </button>

        {/* Share interest */}
        <button
          type="button"
          onClick={() => openModal("interest")}
          className="flex w-full items-center gap-3 rounded-xl border border-cyan-500/40 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
        >
          <span aria-hidden="true">🤝</span>
          Share my interest
        </button>

        {/* Request more details */}
        <button
          type="button"
          onClick={() => openModal("request")}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
        >
          <span aria-hidden="true">📋</span>
          Request more details
        </button>

        <p className="pt-1 text-xs text-slate-500">
          Saving is private. The seller is notified only when you contact them directly.
        </p>
      </section>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {modal !== "none" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            modal === "ask"
              ? "Ask the seller a question"
              : modal === "interest"
              ? "Share your interest"
              : "Request more details"
          }
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {modal === "ask"
                  ? "Ask the seller a question"
                  : modal === "interest"
                  ? `Share your interest in ${listingName}`
                  : "Request more details"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {/* Error/Success */}
            {error && (
              <p role="alert" className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
                {error}
              </p>
            )}
            {success && (
              <p role="status" className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
                {success}
              </p>
            )}

            {/* ── Ask a question form ── */}
            {(modal === "ask" || modal === "request") && (
              <form onSubmit={modal === "ask" ? handleAskSubmit : handleRequestSubmit} noValidate>
                <label htmlFor="panel-question" className="block text-sm font-medium text-slate-300 mb-2">
                  {modal === "ask"
                    ? "What would you like to ask the seller?"
                    : "What additional information would you like?"}
                </label>
                <textarea
                  id="panel-question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  required
                  placeholder={
                    modal === "ask"
                      ? "e.g. How dependent is the business on the current owner?"
                      : "e.g. Can you share recent financials or more details about operations?"
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                />
                <p className="mt-1 text-xs text-slate-500 text-right">
                  {question.length}/4000
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    type="submit"
                    disabled={isPending || !question.trim()}
                    className="flex-1 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {isPending ? "Sending…" : "Send"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* ── Share interest form ── */}
            {modal === "interest" && (
              <form onSubmit={handleInterestSubmit} noValidate>
                {/* Goal */}
                <div className="mb-4">
                  <label htmlFor="panel-goal" className="block text-sm font-medium text-slate-300 mb-2">
                    What type of acquisition are you seeking? <span className="text-rose-400" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="panel-goal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">Select…</option>
                    {GOAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Budget */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="panel-budget-min" className="block text-sm font-medium text-slate-300 mb-2">
                      Approximate minimum budget
                    </label>
                    <input
                      id="panel-budget-min"
                      type="number"
                      min="0"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      placeholder="e.g. 200000"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="panel-budget-max" className="block text-sm font-medium text-slate-300 mb-2">
                      Approximate maximum budget
                    </label>
                    <input
                      id="panel-budget-max"
                      type="number"
                      min="0"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      placeholder="e.g. 500000"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div className="mb-4">
                  <label htmlFor="panel-timeline" className="block text-sm font-medium text-slate-300 mb-2">
                    When are you hoping to buy?
                  </label>
                  <input
                    id="panel-timeline"
                    type="text"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    placeholder="e.g. Within 6 months"
                    maxLength={200}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Financing */}
                <div className="mb-4">
                  <label htmlFor="panel-financing" className="block text-sm font-medium text-slate-300 mb-2">
                    What is your financing status?
                  </label>
                  <select
                    id="panel-financing"
                    value={financingStatus}
                    onChange={(e) => setFinancingStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">Select…</option>
                    {FINANCING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Experience */}
                <div className="mb-4">
                  <label htmlFor="panel-experience" className="block text-sm font-medium text-slate-300 mb-2">
                    What relevant experience do you have?
                  </label>
                  <textarea
                    id="panel-experience"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    placeholder="e.g. 10 years in retail management"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Question */}
                <div className="mb-4">
                  <label htmlFor="panel-init-question" className="block text-sm font-medium text-slate-300 mb-2">
                    What would you like to ask the seller?
                  </label>
                  <textarea
                    id="panel-init-question"
                    value={initialQuestion}
                    onChange={(e) => setInitialQuestion(e.target.value)}
                    rows={3}
                    maxLength={4000}
                    placeholder="e.g. How dependent is the business on the current owner?"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Consent copy */}
                <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-xs text-slate-400">
                  Your profile and these answers will be shared with the seller. The seller may respond through Ownward.
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isPending || !goal}
                    className="flex-1 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {isPending ? "Submitting…" : "Share my interest"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
