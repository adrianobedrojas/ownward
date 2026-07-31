"use client";

import { useState } from "react";

type Answer = "yes" | "no" | "notsure" | null;

interface Question {
  id: string;
  text: string;
  group: "eligibility" | "repayment" | "acquisition";
}

const QUESTIONS: Question[] = [
  // Eligibility gate
  {
    id: "q1",
    text: "Are all applicable direct and indirect owners U.S. citizens or U.S. nationals?",
    group: "eligibility",
  },
  {
    id: "q2",
    text: "Do those owners have their principal residence in the United States or a U.S. territory?",
    group: "eligibility",
  },
  {
    id: "q3",
    text: "Is the applicant an operating, for-profit business located in the United States?",
    group: "eligibility",
  },
  {
    id: "q4",
    text: "Does the business appear to meet SBA size and business-type requirements?",
    group: "eligibility",
  },
  // Repayment and buyer readiness
  {
    id: "q5",
    text: "Can the business's documented cash flow reasonably support the proposed debt?",
    group: "repayment",
  },
  {
    id: "q6",
    text: "Have you reviewed your personal credit and existing debts?",
    group: "repayment",
  },
  {
    id: "q7",
    text: "Do you have documented funds for the buyer contribution, expenses, and post-closing reserves?",
    group: "repayment",
  },
  {
    id: "q8",
    text: "Can you explain how your background prepares you to operate the business?",
    group: "repayment",
  },
  // Acquisition file
  {
    id: "q9",
    text: "Do you have the target company's tax returns and current financial statements?",
    group: "acquisition",
  },
  {
    id: "q10",
    text: "Have you reviewed the purchase terms, lease, licenses, customer concentration, and transition risks?",
    group: "acquisition",
  },
];

const GROUP_LABELS: Record<Question["group"], string> = {
  eligibility: "Eligibility gate",
  repayment: "Repayment and buyer readiness",
  acquisition: "Acquisition file",
};

const GROUPS: Question["group"][] = ["eligibility", "repayment", "acquisition"];

type ResultState =
  | "eligibility-issue"
  | "eligibility-verify"
  | "build-file"
  | "ready"
  | null;

function computeResult(answers: Record<string, Answer>): ResultState {
  const eligibilityIds = ["q1", "q2", "q3", "q4"];
  const allAnswered = QUESTIONS.every((q) => answers[q.id] != null);

  if (!allAnswered) return null;

  // Check eligibility gate
  for (const id of eligibilityIds) {
    if (answers[id] === "no") return "eligibility-issue";
  }
  for (const id of eligibilityIds) {
    if (answers[id] === "notsure") return "eligibility-verify";
  }

  // Eligibility appears clear — check repayment + acquisition
  const nonEligibilityIds = QUESTIONS.filter((q) => q.group !== "eligibility").map((q) => q.id);
  const weakAnswers = nonEligibilityIds.filter(
    (id) => answers[id] === "no" || answers[id] === "notsure",
  );

  if (weakAnswers.length >= 2) return "build-file";

  return "ready";
}

function computeNextActions(answers: Record<string, Answer>): string[] {
  const actions: string[] = [];

  const actionMap: Record<string, string> = {
    q1: "Confirm citizenship and ownership documentation for all direct and indirect owners.",
    q2: "Verify that the principal residence requirement is met and that documentation is available.",
    q3: "Confirm the business is operating, for-profit, and located in the United States.",
    q4: "Check the current SBA size standards and ineligible business-type list.",
    q5: "Obtain financial statements and test whether cash flow covers the expected debt service.",
    q6: "Pull personal credit reports and list existing debts and monthly obligations.",
    q7: "Document the source of funds for the buyer contribution and estimate post-closing liquidity.",
    q8: "Prepare a resume and written summary of relevant management and industry experience.",
    q9: "Collect at least three years of target-company tax returns and current financial statements.",
    q10: "Review purchase agreement terms, lease transferability, licenses, and customer concentration with qualified counsel.",
  };

  for (const q of QUESTIONS) {
    if (answers[q.id] === "no" || answers[q.id] === "notsure") {
      const action = actionMap[q.id];
      if (action) actions.push(action);
    }
  }

  return actions.slice(0, 3);
}

const answeredCount = (answers: Record<string, Answer>) =>
  Object.values(answers).filter((v) => v !== null).length;

export default function SbaLoanReadinessCheck() {
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(QUESTIONS.map((q) => [q.id, null])),
  );
  const [submitted, setSubmitted] = useState(false);

  const progress = answeredCount(answers);
  const total = QUESTIONS.length;
  const pct = Math.round((progress / total) * 100);

  const result: ResultState = submitted ? computeResult(answers) : null;
  const nextActions = submitted ? computeNextActions(answers) : [];

  const handleReset = () => {
    setAnswers(Object.fromEntries(QUESTIONS.map((q) => [q.id, null])));
    setSubmitted(false);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  return (
    <section
      aria-labelledby="sba-pathfinder-heading"
      className="my-8 rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-6 sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
        Interactive Tool
      </p>
      <h2
        id="sba-pathfinder-heading"
        className="mt-2 text-xl font-bold text-white sm:text-2xl"
      >
        SBA Readiness Pathfinder
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Answer ten questions to identify possible eligibility blockers and preparation gaps. This
        tool is educational and does not provide preapproval, approval odds, legal advice, or
        financial advice. Lender standards may exceed the minimum SBA requirements described here,
        and all rules should be verified at the time of application.
      </p>

      {/* Privacy notice */}
      <p className="mt-3 rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2 text-xs text-slate-400">
        <span className="font-semibold text-slate-300">Privacy: </span>
        Your answers remain in your browser session only. Nothing is submitted, saved, or
        transmitted.
      </p>

      {/* Progress bar */}
      <div className="mt-6" aria-label={`${progress} of ${total} questions answered`}>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{progress} of {total} answered</span>
          <span>{pct}%</span>
        </div>
        <div
          className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      {!submitted && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="mt-6 space-y-8"
          noValidate
        >
          {GROUPS.map((group) => {
            const groupQuestions = QUESTIONS.filter((q) => q.group === group);
            const legendId = `legend-${group}`;
            return (
              <fieldset key={group} aria-labelledby={legendId}>
                <legend
                  id={legendId}
                  className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400"
                >
                  {GROUP_LABELS[group]}
                </legend>
                <div className="space-y-4">
                  {groupQuestions.map((q) => {
                    const globalIdx =
                      QUESTIONS.findIndex((item) => item.id === q.id) + 1;
                    return (
                      <div
                        key={q.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                      >
                        <p
                          id={`${q.id}-label`}
                          className="text-sm font-medium text-white"
                        >
                          <span className="mr-2 text-cyan-400">{globalIdx}.</span>
                          {q.text}
                        </p>
                        <div
                          role="group"
                          aria-labelledby={`${q.id}-label`}
                          className="mt-3 flex flex-wrap gap-2"
                        >
                          {(
                            [
                              { value: "yes", label: "Yes" },
                              { value: "no", label: "No" },
                              { value: "notsure", label: "Not sure" },
                            ] as { value: Answer; label: string }[]
                          ).map(({ value, label }) => {
                            const isSelected = answers[q.id] === value;
                            return (
                              <label
                                key={value}
                                className={[
                                  "flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition focus-within:ring-2 focus-within:ring-cyan-400 focus-within:ring-offset-2 focus-within:ring-offset-slate-950",
                                  isSelected
                                    ? value === "yes"
                                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                                      : value === "no"
                                        ? "border-red-500 bg-red-500/10 text-red-300"
                                        : "border-amber-500 bg-amber-500/10 text-amber-300"
                                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500",
                                ].join(" ")}
                              >
                                <input
                                  type="radio"
                                  name={q.id}
                                  value={value ?? ""}
                                  checked={isSelected}
                                  onChange={() =>
                                    setAnswers((prev) => ({
                                      ...prev,
                                      [q.id]: value,
                                    }))
                                  }
                                  className="sr-only"
                                />
                                {label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          <button
            type="submit"
            disabled={progress < total}
            className="mt-2 w-full rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {progress < total
              ? `Answer all questions to see results (${total - progress} remaining)`
              : "See my readiness overview"}
          </button>
        </form>
      )}

      {/* Results */}
      {submitted && result !== null && (
        <div className="mt-6 space-y-6">
          <ResultCard result={result} />

          {nextActions.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-5">
              <h3 className="text-base font-semibold text-white">
                Suggested next three actions
              </h3>
              <ol className="mt-3 space-y-2 pl-4 text-sm leading-6 text-slate-300 list-decimal">
                {nextActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ol>
            </div>
          )}

          <p className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Disclaimer: </span>
            This tool is educational only. It does not constitute legal, financial, lending, or
            approval advice. Results reflect your self-reported answers only and are not reviewed
            by a lender or by Ownward. Verify all applicable SBA rules and lender requirements
            before making a financial, relocation, or legal commitment.
          </p>

          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Reset and start over
          </button>
        </div>
      )}
    </section>
  );
}

function ResultCard({ result }: { result: NonNullable<ResultState> }) {
  if (result === "eligibility-issue") {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
          Eligibility issues detected
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          Address the eligibility issue before treating the transaction as lender-ready. A lender
          cannot solve a fundamental SBA eligibility problem through stronger projections or
          additional paperwork.
        </p>
      </div>
    );
  }

  if (result === "eligibility-verify") {
    return (
      <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-400">
          Eligibility needs verification
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          Verify the unresolved eligibility facts with participating lenders before paying a
          nonrefundable deposit, relocating, or committing to a purchase.
        </p>
      </div>
    );
  }

  if (result === "build-file") {
    return (
      <div className="rounded-xl border border-cyan-500/50 bg-cyan-500/10 p-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Build the lender file
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          The basic path may be open, but the lender file is incomplete. Focus next on cash flow,
          source of funds, credit review, financial records, and transaction documentation.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-5">
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Ready for lender conversations
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-200">
        Your responses indicate that you may be prepared for preliminary lender conversations. This
        is not approval or prequalification. Compare multiple lenders and verify current SBA rules.
      </p>
    </div>
  );
}
