import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ValuationWizard } from "./ValuationWizard";

export const metadata: Metadata = {
  title: "Business Valuation",
  description:
    "Generate a preliminary business valuation with normalized earnings, risk analysis, and value drivers.",
};

const INDUSTRY_LABELS: Record<string, string> = {
  services: "Professional services",
  "home-services": "Home services",
  food: "Food and beverage",
  retail: "Retail",
  construction: "Construction",
  marketing: "Marketing",
  technology: "Technology",
  other: "Other",
};

function fmt(value: number | null) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function StatusBadge({ status }: { status: string }) {
  const cfg =
    status === "calculated"
      ? "bg-emerald-500/20 text-emerald-400"
      : status === "archived"
      ? "bg-slate-800 text-slate-500"
      : "bg-amber-500/20 text-amber-400";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${cfg}`}
    >
      {status}
    </span>
  );
}

export default async function ValuationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let recentReports: {
    id: string;
    business_name: string | null;
    industry: string | null;
    status: string;
    expected_value: number | null;
    confidence_score: number | null;
    updated_at: string;
  }[] = [];

  if (user) {
    const { data } = await supabase
      .from("valuation_reports")
      .select(
        "id, business_name, industry, status, expected_value, confidence_score, updated_at"
      )
      .eq("user_id", user.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(10);

    recentReports = data ?? [];
  }

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward Valuation
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Preliminary business valuation
          </h1>

          <p className="mt-4 text-lg leading-8 text-slate-300">
            Enter your financial, operational, and risk information to generate
            a preliminary valuation range, confidence score, and actionable
            improvement plan.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="font-semibold text-amber-300">
            Preliminary planning tool — educational use only
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            This tool produces estimates for planning purposes. Results are not
            a certified appraisal, fairness opinion, investment recommendation,
            or guaranteed sale price. Consult a qualified advisor before making
            significant financial decisions.
          </p>
        </div>

        {/* Report history */}
        {user && recentReports.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                Your valuation reports
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60">
                    <th className="px-4 py-3 text-left font-semibold text-slate-400">
                      Business
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-400">
                      Expected value
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-400">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-400">
                      Updated
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 bg-slate-900">
                  {recentReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">
                          {report.business_name ?? "Untitled report"}
                        </p>
                        {report.industry && (
                          <p className="text-xs text-slate-500">
                            {INDUSTRY_LABELS[report.industry] ?? report.industry}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                        {fmt(report.expected_value)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {report.confidence_score !== null ? (
                          <span
                            className={`font-semibold ${
                              report.confidence_score >= 75
                                ? "text-emerald-400"
                                : report.confidence_score >= 50
                                ? "text-cyan-400"
                                : "text-amber-400"
                            }`}
                          >
                            {report.confidence_score}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {new Date(report.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {report.status === "calculated" ? (
                          <Link
                            href={`/valuation/${report.id}`}
                            className="text-xs font-semibold text-cyan-400 transition hover:text-cyan-300"
                          >
                            Open →
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-600">Draft</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Wizard */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <h2 className="mb-4 text-xl font-bold text-white">
              {user ? "Start a new report" : "Preview the valuation wizard"}
            </h2>

            {!user && (
              <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-400/5 p-4">
                <p className="text-sm text-cyan-300">
                  <Link
                    href="/login"
                    className="font-semibold underline underline-offset-2"
                  >
                    Sign in
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/signup"
                    className="font-semibold underline underline-offset-2"
                  >
                    create a free account
                  </Link>{" "}
                  to save drafts and generate full reports.
                </p>
              </div>
            )}

            <ValuationWizard />
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                What you&apos;ll get
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "Defensive, expected, and strategic value range",
                  "Confidence score based on evidence quality",
                  "Normalized earnings reconciliation",
                  "Customer concentration analysis",
                  "Owner dependence analysis",
                  "Value DNA scorecard (8 dimensions)",
                  "Buyer lens (3 buyer types)",
                  "Value bridge improvement scenarios",
                  "Risk map and recommended actions",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-slate-300"
                  >
                    <span className="mt-0.5 text-cyan-400" aria-hidden="true">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-base font-bold text-white">
                Documents improve accuracy
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Store tax returns, financial statements, and contracts in your
                Ownward Vault to support your valuation evidence.
              </p>
              <Link
                href="/documents"
                className="mt-4 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
              >
                Open Ownward Vault
              </Link>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs leading-5 text-slate-500">
                Valuation multiples are preliminary planning assumptions based
                on commonly cited industry survey ranges. They do not represent
                actual market transaction data and should be treated as rough
                planning guidance only.
              </p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
