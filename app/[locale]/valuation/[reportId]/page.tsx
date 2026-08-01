import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { getUserBillingState } from "@/lib/billing";
import { ValuationRange } from "@/components/valuation/ValuationRange";
import { ConfidenceMeter } from "@/components/valuation/ConfidenceMeter";
import { NormalizedEarningsTable } from "@/components/valuation/NormalizedEarningsTable";
import { ValueDnaScorecard } from "@/components/valuation/ValueDnaScorecard";
import { BuyerLens } from "@/components/valuation/BuyerLens";
import { ValueBridge } from "@/components/valuation/ValueBridge";
import { RiskMap } from "@/components/valuation/RiskMap";
import type { ValuationResult } from "@/lib/valuation/types";
import type { ValuationLevel } from "@/lib/billing";
import { archiveReportFormAction } from "../actions";

export const metadata: Metadata = {
  title: "Valuation Report",
  description: "View your preliminary business valuation report.",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

interface PageProps {
  params: Promise<{ reportId: string }>;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-1">
      {children}
    </p>
  );
}

function PriorityBadge({ priority }: { priority: "immediate" | "short-term" | "long-term" }) {
  const cfg =
    priority === "immediate"
      ? "bg-rose-500/20 text-rose-400"
      : priority === "short-term"
      ? "bg-amber-500/20 text-amber-400"
      : "bg-slate-800 text-slate-400";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg}`}>
      {priority}
    </span>
  );
}

export default async function ValuationReportPage({ params }: PageProps) {
  const { reportId } = await params;

  if (!isUuid(reportId)) {
    notFound();
  }

  const { supabase, user } = await requireUser();

  // Always verify ownership on the server — never trust user-supplied IDs
  const { data: report } = await supabase
    .from("valuation_reports")
    .select(
      "id, user_id, status, business_name, industry, currency, defensive_value, expected_value, strategic_value, confidence_score, result_snapshot, methodology_version, created_at, updated_at, version, report_level"
    )
    .eq("id", reportId)
    .eq("user_id", user.id)  // ownership check
    .maybeSingle();

  if (!report || report.status !== "calculated") {
    notFound();
  }

  const result = report.result_snapshot as ValuationResult;

  if (!result) {
    notFound();
  }

  const currency = report.currency ?? "USD";

  // Determine effective access level: min(stored report_level, current billing)
  const billing = await getUserBillingState(supabase, user.id);
  const currentLevel = billing.entitlements.valuationLevel;
  const storedLevel = (report.report_level as ValuationLevel | null) ?? "basic";

  // Level precedence: enhanced > detailed > basic > preview
  const levelRank: Record<ValuationLevel, number> = {
    preview: 0,
    basic: 1,
    detailed: 2,
    enhanced: 3,
  };
  const effectiveLevel: ValuationLevel =
    levelRank[currentLevel] < levelRank[storedLevel] ? currentLevel : storedLevel;

  const showDetailed = levelRank[effectiveLevel] >= levelRank["detailed"];
  const showEnhanced = levelRank[effectiveLevel] >= levelRank["enhanced"];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-2">
        <Link
          href="/valuation"
          className="text-sm text-slate-500 transition hover:text-cyan-400"
        >
          ← All reports
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Valuation report
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">
            {report.business_name ?? "Business valuation"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Generated{" "}
            {new Date(result.generatedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · Methodology v{result.methodologyVersion} · Report v{report.version}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <form action={archiveReportFormAction}>
            <input type="hidden" name="reportId" value={report.id} />
            <button
              type="submit"
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
            >
              Archive
            </button>
          </form>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
        <p className="text-sm font-semibold text-amber-300">
          Preliminary planning estimate — educational use only
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {result.disclaimer}
        </p>
      </div>

      {/* Tier indicator for basic reports */}
      {effectiveLevel === "basic" && (
        <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 flex items-start gap-3">
          <span className="shrink-0 text-cyan-400 font-bold text-sm mt-0.5">ℹ</span>
          <div>
            <p className="text-sm font-semibold text-cyan-300">Starter Basic Report</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              This is a basic valuation report included with the Starter plan. It includes a valuation range, confidence indicator, and up to 3 improvement actions.{" "}
              <Link href="/pricing" className="text-cyan-400 hover:text-cyan-300">Upgrade to Builder or Pro</Link>
              {" "}for multi-year weighted analysis, risk maps, buyer lens, and value bridge scenarios.
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-8">
        {/* Core valuation range */}
        <ValuationRange
          defensiveValue={result.defensiveValue}
          expectedValue={result.expectedValue}
          strategicValue={result.strategicValue}
          defensiveMultiple={result.defensiveMultiple}
          expectedMultiple={result.expectedMultiple}
          strategicMultiple={result.strategicMultiple}
          currency={currency}
        />

        {/* Confidence score */}
        <ConfidenceMeter
          score={result.confidenceScore}
          factors={result.confidenceFactors}
          showFactors
        />

        {/* Normalized earnings */}
        <NormalizedEarningsTable
          rows={result.normalizedEarningsRows}
          currency={currency}
        />

        {/* Value DNA — Pro (enhanced) only */}
        {showEnhanced ? (
          <ValueDnaScorecard scores={result.dnaScores} />
        ) : (
          <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Value DNA Scorecard</p>
            <p className="text-slate-400 text-sm mt-2">
              This section is available on the{" "}
              <Link href="/pricing" className="text-cyan-400 hover:text-cyan-300">Pro plan</Link>.
              It shows a multi-dimension value scorecard across growth, risk, earnings quality, and scalability.
            </p>
          </section>
        )}

        {/* Owner dependence — detailed+ */}
        {showDetailed ? (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <SectionHeader>Owner-dependence analysis</SectionHeader>
            <h2 className="text-lg font-bold text-white mb-3">Owner involvement</h2>
            <p className="text-sm leading-6 text-slate-300">
              {result.ownerDependenceNote}
            </p>
          </section>
        ) : (
          <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Owner-dependence analysis</p>
            <p className="text-slate-400 text-sm mt-2">
              Detailed owner and customer dependence analysis is available on the{" "}
              <Link href="/pricing" className="text-cyan-400 hover:text-cyan-300">Builder plan</Link>.
            </p>
          </section>
        )}

        {/* Customer concentration — detailed+ */}
        {showDetailed ? (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <SectionHeader>Customer-concentration analysis</SectionHeader>
            <h2 className="text-lg font-bold text-white mb-3">Customer concentration</h2>
            <p className="text-sm leading-6 text-slate-300">
              {result.customerConcentrationNote}
            </p>
          </section>
        ) : null}

        {/* Risk map — detailed+ */}
        {showDetailed ? (
          <RiskMap risks={result.riskFactors} />
        ) : (
          <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Risk Analysis</p>
            <p className="text-slate-400 text-sm mt-2">
              Detailed risk analysis is available on the{" "}
              <Link href="/pricing" className="text-cyan-400 hover:text-cyan-300">Builder plan</Link>.
            </p>
          </section>
        )}

        {/* Value drivers */}
        {result.valueDrivers.length > 0 && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <SectionHeader>Value drivers</SectionHeader>
            <h2 className="text-lg font-bold text-white mb-4">Positive value drivers</h2>
            <div className="space-y-3">
              {result.valueDrivers.map((driver) => (
                <div
                  key={driver.label}
                  className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4"
                >
                  <span className="mt-0.5 text-emerald-400 shrink-0" aria-hidden="true">✓</span>
                  <div>
                    <p className="font-semibold text-sm text-white">{driver.label}</p>
                    <p className="mt-0.5 text-sm text-slate-400">{driver.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommended actions */}
        {result.recommendedActions.length > 0 && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <SectionHeader>Recommended next actions</SectionHeader>
            <h2 className="text-lg font-bold text-white mb-4">Prioritized actions</h2>
            <div className="space-y-3">
              {result.recommendedActions.map((action) => (
                <div
                  key={action.action}
                  className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start gap-3">
                    <PriorityBadge priority={action.priority} />
                    <div>
                      <p className="font-semibold text-sm text-white">
                        {action.action}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {action.potentialImpact}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Missing evidence */}
        {result.missingEvidence.length > 0 && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <SectionHeader>Missing evidence</SectionHeader>
            <h2 className="text-lg font-bold text-white mb-4">
              Items that would improve confidence
            </h2>
            <div className="space-y-3">
              {result.missingEvidence.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="mt-0.5 text-amber-400 shrink-0" aria-hidden="true">○</span>
                  <div>
                    <p className="font-semibold text-slate-300">{item.label}</p>
                    <p className="mt-0.5 text-slate-500 text-xs">{item.whyItMatters}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link
                href="/documents"
                className="text-sm font-semibold text-cyan-400 transition hover:text-cyan-300"
              >
                Upload documents to Ownward Vault →
              </Link>
            </div>
          </section>
        )}

        {/* Buyer lens — Pro (enhanced) only */}
        {showEnhanced ? (
          <BuyerLens interpretations={result.buyerInterpretations} currency={currency} />
        ) : (
          <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Buyer Lens</p>
            <p className="text-slate-400 text-sm mt-2">
              The Buyer Lens — showing how strategic, financial, and individual buyers would view your business — is available on the{" "}
              <Link href="/pricing" className="text-cyan-400 hover:text-cyan-300">Pro plan</Link>.
            </p>
          </section>
        )}

        {/* Value bridge — Pro (enhanced) only */}
        {showEnhanced ? (
          <ValueBridge
            expectedValue={result.expectedValue}
            scenarios={result.valueBridgeScenarios}
            currency={currency}
          />
        ) : (
          <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Value Bridge</p>
            <p className="text-slate-400 text-sm mt-2">
              The Value Bridge — showing upside scenarios and how to close the gap to your target value — is available on the{" "}
              <Link href="/pricing" className="text-cyan-400 hover:text-cyan-300">Pro plan</Link>.
            </p>
          </section>
        )}

        {/* Adjustments */}
        {result.adjustments.length > 0 && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <SectionHeader>Valuation methods and assumptions</SectionHeader>
            <h2 className="text-lg font-bold text-white mb-4">
              Applied adjustments
            </h2>
            <div className="space-y-2">
              {result.adjustments.map((adj, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 text-sm py-2 border-b border-slate-800/60 last:border-0"
                >
                  <span
                    className={`shrink-0 font-bold w-6 text-center ${
                      adj.direction === "add"
                        ? "text-emerald-400"
                        : adj.direction === "deduct"
                        ? "text-rose-400"
                        : "text-cyan-400"
                    }`}
                  >
                    {adj.direction === "add" ? "+" : adj.direction === "deduct" ? "−" : "×"}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-300">{adj.label}</p>
                    {adj.explanation && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {adj.explanation}
                      </p>
                    )}
                  </div>
                  {adj.direction !== "multiple" && (
                    <span className="ml-auto tabular-nums text-slate-400">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency,
                        maximumFractionDigits: 0,
                      }).format(adj.amount)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-slate-950/60 p-3">
              <p className="text-xs text-slate-500">
                <strong className="text-slate-400">Methodology note:</strong>{" "}
                This report uses the Seller&apos;s Discretionary Earnings (SDE)
                method, which estimates the total economic benefit available to a
                full-time owner-operator. Industry multiples are preliminary planning
                assumptions based on commonly cited survey ranges (BizBuySell, IBBA).
                They do not represent actual transaction data and should be treated
                as rough guidance only.
              </p>
            </div>
          </section>
        )}

        {/* Footer disclaimer */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-xs font-semibold text-slate-400">
            Financial planning disclaimer
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {result.disclaimer} Actual business value and selling price depend on
            many factors including buyer motivation, deal structure, due diligence
            findings, market conditions, and negotiation. This tool does not consider
            tax consequences of a sale. Always consult qualified professionals before
            making decisions.
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Report ID: {report.id} · Generated: {result.generatedAt}
          </p>
        </section>
      </div>
    </main>
  );
}
