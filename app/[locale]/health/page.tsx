import { requireUser } from "@/lib/require-user";
import { getUserBillingState } from "@/lib/billing";
import { HEALTH_QUESTIONS } from "@/lib/health/scoring";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Health Check | Ownward",
  description: "Assess your business health across 6 key categories.",
};

const CATEGORY_LABELS: Record<string, string> = {
  foundation: "Business Foundation",
  financial_org: "Financial Organization",
  customers_revenue: "Customers & Revenue",
  operations: "Operations",
  documents_records: "Documents & Records",
  owner_independence: "Owner Independence",
};

export default async function HealthCheckPage() {
  const { supabase, user } = await requireUser();
  const billing = await getUserBillingState(supabase, user.id);

  if (billing.entitlements.healthLevel === "none") {
    redirect("/pricing?feature=health");
  }

  // Get active business
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_business_id")
    .eq("id", user.id)
    .maybeSingle();

  const activeBizId = profile?.active_business_id;

  // Get businesses
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!businesses || businesses.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-white">Business Health Check</h1>
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
          <p className="text-slate-400">You need a business workspace to run a health check.</p>
          <Link href="/business/new" className="mt-4 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/10 transition">
            Create Business Workspace
          </Link>
        </div>
      </main>
    );
  }

  const selectedBizId = activeBizId ?? businesses[0]?.id;

  // Latest assessment for this business
  const { data: latestAssessment } = await supabase
    .from("business_health_assessments")
    .select("id, overall_score, category_scores, recommendations, completed_at, answers")
    .eq("user_id", user.id)
    .eq("business_id", selectedBizId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Automated signals
  const { count: docCount } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  const { count: txCount } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: milestoneCount } = await supabase
    .from("business_milestones")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  const { data: bizData } = await supabase
    .from("businesses")
    .select("profile_completion")
    .eq("id", selectedBizId)
    .maybeSingle();

  const { count: valuationCount } = await supabase
    .from("valuation_reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "calculated");

  const automatedSignals = [
    {
      label: "Business profile complete",
      value: (bizData?.profile_completion ?? 0) >= 70,
      detail: `${bizData?.profile_completion ?? 0}% complete`,
    },
    {
      label: "Documents uploaded",
      value: (docCount ?? 0) > 0,
      detail: `${docCount ?? 0} document${(docCount ?? 0) !== 1 ? "s" : ""}`,
    },
    {
      label: "Bookkeeping active",
      value: (txCount ?? 0) > 0,
      detail: `${txCount ?? 0} transaction${(txCount ?? 0) !== 1 ? "s" : ""}`,
    },
    {
      label: "Milestones tracked",
      value: (milestoneCount ?? 0) > 0,
      detail: `${milestoneCount ?? 0} milestone${(milestoneCount ?? 0) !== 1 ? "s" : ""}`,
    },
    {
      label: "Valuation generated",
      value: (valuationCount ?? 0) > 0,
      detail: (valuationCount ?? 0) > 0 ? "At least 1 report" : "None yet",
    },
  ];

  // Group questions by category
  const byCategory: Record<string, typeof HEALTH_QUESTIONS> = {};
  for (const q of HEALTH_QUESTIONS) {
    if (!byCategory[q.category]) byCategory[q.category] = [];
    byCategory[q.category].push(q);
  }

  const previousAnswers = (latestAssessment?.answers as Record<string, string>) ?? {};

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Health Check
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Business Health Assessment</h1>
        </div>
      </div>

      {/* Latest result card */}
      {latestAssessment && (
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-slate-400">Latest Assessment</p>
              <p className="text-sm text-slate-500">
                {new Date(latestAssessment.completed_at!).toLocaleDateString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-cyan-400">
                {latestAssessment.overall_score}
                <span className="text-lg text-slate-400">/100</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Overall Score</p>
            </div>
          </div>

          {latestAssessment.category_scores && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(
                latestAssessment.category_scores as Record<string, number>
              ).map(([cat, score]) => (
                <div key={cat} className="rounded-lg bg-slate-800 p-3">
                  <p className="text-xs text-slate-400">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">{score}%</p>
                </div>
              ))}
            </div>
          )}

          {latestAssessment.recommendations &&
            Array.isArray(latestAssessment.recommendations) &&
            latestAssessment.recommendations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-300 mb-2">
                  Top 3 Next Actions
                </p>
                <ol className="space-y-2">
                  {(latestAssessment.recommendations as string[]).map(
                    (r, i) => (
                      <li key={i} className="text-sm text-slate-400 flex gap-2">
                        <span className="shrink-0 text-cyan-400 font-bold">
                          {i + 1}.
                        </span>
                        {r}
                      </li>
                    )
                  )}
                </ol>
              </div>
            )}
        </div>
      )}

      {/* Automated signals — clearly separated from user questions */}
      <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900/50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Automated Signals (from your data)
        </p>
        <div className="space-y-2">
          {automatedSignals.map((s) => (
            <div key={s.label} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{s.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs">{s.detail}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    s.value
                      ? "bg-emerald-400/10 text-emerald-400"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {s.value ? "✓" : "–"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assessment form */}
      <form
        action={async (formData: FormData) => {
          "use server";
          const { redirect } = await import("next/navigation");
          const { saveHealthAssessment } = await import("./actions");
          const result = await saveHealthAssessment(formData);
          if (result.success) {
            redirect(`/health?score=${result.overallScore}`);
          }
        }}
        className="mt-8 space-y-8"
      >
        <input type="hidden" name="business_id" value={selectedBizId} />

        <p className="text-sm text-slate-400">
          Answer the questions below honestly — your score is private and for your own insight.
        </p>

        {Object.entries(byCategory).map(([cat, questions]) => (
          <section key={cat}>
            <h2 className="text-base font-semibold text-white mb-4">
              {CATEGORY_LABELS[cat] ?? cat}
            </h2>
            <div className="space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm text-slate-200 mb-3">{q.text}</p>
                  <div className="flex flex-wrap gap-2">
                    {["yes", "in_progress", "not_yet", "not_applicable"].map(
                      (opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-1.5 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            defaultChecked={
                              (previousAnswers[q.id] ?? "not_yet") === opt
                            }
                            className="accent-cyan-400"
                          />
                          <span className="text-sm text-slate-300 capitalize">
                            {opt.replace("_", " ")}
                          </span>
                        </label>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <button
          type="submit"
          className="w-full rounded-lg bg-cyan-400 py-3 font-semibold text-slate-950 hover:bg-cyan-300 transition"
        >
          Save Assessment
        </button>
      </form>
    </main>
  );
}
