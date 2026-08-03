import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserBillingState } from "@/lib/billing";
import { ValuationWizard } from "./ValuationWizard";
import ValuationCalculator from "./ValuationCalculator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Valuation" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: "/valuation",
      languages: {
        en: "/valuation",
        es: "/es/valuation",
      },
    },
  };
}

type Mode = "quick" | "detailed" | "reports";

function parseMode(value: string | undefined): Mode {
  if (value === "quick" || value === "detailed" || value === "reports") {
    return value;
  }
  return "quick";
}

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function fmt(value: number | null) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function ValuationPage({ searchParams }: PageProps) {
  const { mode: rawMode } = await searchParams;
  const mode = parseMode(rawMode);
  const locale = await getLocale();
  const t = await getTranslations("Valuation");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const billing = user
    ? await getUserBillingState(supabase, user.id)
    : null;
  const valuationLevel = billing?.entitlements.valuationLevel ?? "preview";
  const hasPaidAccess = valuationLevel !== "preview";

  // Fetch reports only when needed and user is authenticated
  let recentReports: {
    id: string;
    business_name: string | null;
    industry: string | null;
    status: string;
    expected_value: number | null;
    confidence_score: number | null;
    report_level: string | null;
    updated_at: string;
  }[] = [];

  if (user && (mode === "reports" || mode === "detailed")) {
    const { data } = await supabase
      .from("valuation_reports")
      .select(
        "id, business_name, industry, status, expected_value, confidence_score, report_level, updated_at"
      )
      .eq("user_id", user.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(20);

    recentReports = data ?? [];
  }

  const industryLabels = t.raw("industryLabels") as Record<string, string>;
  const stageList = t.raw("detailedReport.stageList") as string[];
  const whatItems = t.raw("what.items") as string[];

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            {t("title")}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            {mode === "quick"
              ? t("quickSnapshot.heading")
              : mode === "detailed"
              ? t("detailedReport.heading")
              : t("myReports.heading")}
          </h1>
        </div>

        {/* Mode navigation */}
        <div
          role="tablist"
          aria-label={t("title")}
          className="mt-6 flex flex-wrap gap-2"
        >
          {(["quick", "detailed", "reports"] as Mode[]).map((m) => {
            const label =
              m === "quick"
                ? t("modes.quick")
                : m === "detailed"
                ? t("modes.detailed")
                : t("modes.reports");
            return (
              <Link
                key={m}
                href={`/valuation?mode=${m}`}
                role="tab"
                aria-selected={mode === m}
                aria-current={mode === m ? "page" : undefined}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode === m
                    ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/40"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* ─── EDUCATIONAL DISCLAIMER ─── */}
        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="font-semibold text-amber-300">{t("disclaimer.title")}</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {t("disclaimer.body")}
          </p>
        </div>

        {/* ─── RANGE NOTE ─── */}
        <p className="mt-4 text-sm text-slate-400 italic">{t("rangeNote")}</p>

        {/* ─── MODE CONTENT ─── */}

        {/* ══ QUICK VALUE SNAPSHOT ══ */}
        {mode === "quick" && (
          <div className="mt-8">
            {/* Before you begin */}
            <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                {t("beforeYouBegin.title")}
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-300">{t("beforeYouBegin.quickNeeds")}</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-400">
                    <li className="flex gap-2"><span className="text-cyan-400 shrink-0">✓</span>{t("beforeYouBegin.quickNeed1")}</li>
                    <li className="flex gap-2"><span className="text-cyan-400 shrink-0">✓</span>{t("beforeYouBegin.quickNeed2")}</li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="mb-4 text-sm text-slate-400">{t("quickSnapshot.guestNote")}</p>

            <ValuationCalculator
              isAuthenticated={!!user}
              savedEstimates={[]}
            />

            {/* After results: prompt for detailed report */}
            <div className="mt-8 rounded-xl border border-cyan-500/20 bg-cyan-400/5 p-6">
              <h2 className="text-lg font-bold text-white">{t("quickSnapshot.resultCta")}</h2>
              <p className="mt-2 text-sm text-slate-400">{t("quickSnapshot.resultCtaDescription")}</p>
              <Link
                href="/valuation?mode=detailed"
                className="mt-4 inline-block rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                {t("detailedReport.startReport")}
              </Link>
            </div>
          </div>
        )}

        {/* ══ DETAILED VALUATION REPORT ══ */}
        {mode === "detailed" && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              {/* Before you begin */}
              <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                  {t("beforeYouBegin.title")}
                </h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-300">{t("beforeYouBegin.detailedNeeds")}</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-400">
                      {[
                        t("beforeYouBegin.detailedNeed1"),
                        t("beforeYouBegin.detailedNeed2"),
                        t("beforeYouBegin.detailedNeed3"),
                        t("beforeYouBegin.detailedNeed4"),
                        t("beforeYouBegin.detailedNeed5"),
                        t("beforeYouBegin.detailedNeed6"),
                      ].map((need) => (
                        <li key={need} className="flex gap-2">
                          <span className="text-cyan-400 shrink-0">✓</span>{need}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 7 stages overview */}
              <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-5">
                <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                  {t("detailedReport.stages")}
                </p>
                <ol className="mt-3 space-y-1.5">
                  {stageList.map((stage, i) => (
                    <li key={stage} className="flex items-center gap-3 text-sm text-slate-300">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-300">
                        {i + 1}
                      </span>
                      {stage}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Access gating */}
              {!user ? (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-400/5 p-6">
                  <h2 className="text-lg font-bold text-white">{t("detailedReport.guestSignIn")}</h2>
                  <p className="mt-2 text-sm text-slate-400">{t("detailedReport.guestNote")}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href="/login"
                      className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                    >
                      {t("detailedReport.guestSignIn")}
                    </Link>
                    <span className="self-center text-sm text-slate-500">{t("detailedReport.guestOr")}</span>
                    <Link
                      href="/signup"
                      className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-cyan-400 hover:bg-slate-800"
                    >
                      {t("detailedReport.guestCreateAccount")}
                    </Link>
                  </div>
                </div>
              ) : !hasPaidAccess ? (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-6">
                  <h2 className="text-lg font-bold text-white">{t("tiers.upgradePrompt")}</h2>
                  <p className="mt-2 text-sm text-slate-400">{t("detailedReport.freeUserNote")}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href="/valuation?mode=quick"
                      className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {t("modes.quick")}
                    </Link>
                    <Link
                      href="/pricing"
                      className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                    >
                      {t("detailedReport.freeUserUpgrade")}
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">
                      {t("detailedReport.startReport")}
                    </h2>
                    {recentReports.some((r) => r.status === "draft") && (
                      <Link
                        href="/valuation?mode=reports"
                        className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                      >
                        {t("myReports.heading")} →
                      </Link>
                    )}
                  </div>
                  <ValuationWizard />
                </>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                  {t("what.heading")}
                </p>
                <ul className="mt-4 space-y-2">
                  {whatItems.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="mt-0.5 text-cyan-400" aria-hidden="true">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                  {t("tiers.upgradePrompt")}
                </p>
                <ul className="mt-3 space-y-2 text-xs text-slate-400">
                  <li>• {t("tiers.free")}</li>
                  <li>• {t("tiers.starter")}</li>
                  <li>• {t("tiers.builder")}</li>
                  <li>• {t("tiers.pro")}</li>
                </ul>
                <Link
                  href="/pricing"
                  className="mt-4 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
                >
                  {t("report.upgradeAction")}
                </Link>
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-base font-bold text-white">{t("vault.heading")}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{t("vault.description")}</p>
                <Link
                  href="/documents"
                  className="mt-4 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
                >
                  {t("vault.cta")}
                </Link>
              </section>
            </aside>
          </div>
        )}

        {/* ══ MY REPORTS ══ */}
        {mode === "reports" && (
          <div className="mt-8">
            {!user ? (
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-400/5 p-6">
                <h2 className="text-lg font-bold text-white">{t("detailedReport.guestSignIn")}</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/login"
                    className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    {t("detailedReport.guestSignIn")}
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-cyan-400 hover:bg-slate-800"
                  >
                    {t("detailedReport.guestCreateAccount")}
                  </Link>
                </div>
              </div>
            ) : recentReports.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
                <p className="text-lg font-semibold text-white">{t("myReports.emptyTitle")}</p>
                <p className="mt-2 text-sm text-slate-400">{t("myReports.emptyDescription")}</p>
                <Link
                  href="/valuation?mode=detailed"
                  className="mt-6 inline-block rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  {t("myReports.emptyAction")}
                </Link>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">{t("myReports.heading")}</h2>
                  <Link
                    href="/valuation?mode=detailed"
                    className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    {t("detailedReport.newReport")}
                  </Link>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60">
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-400">
                          {t("myReports.business")}
                        </th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-400">
                          {t("myReports.status")}
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-400">
                          {t("myReports.expectedValue")}
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-400">
                          {t("myReports.confidence")}
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-400">
                          {t("myReports.updated")}
                        </th>
                        <th scope="col" className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 bg-slate-900">
                      {recentReports.map((report) => {
                        const statusLabel =
                          report.status === "calculated"
                            ? t("myReports.statusCompleted")
                            : report.status === "archived"
                            ? t("myReports.statusArchived")
                            : t("myReports.statusDraft");
                        const statusCls =
                          report.status === "calculated"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : report.status === "archived"
                            ? "bg-slate-800 text-slate-500"
                            : "bg-amber-500/20 text-amber-400";
                        return (
                          <tr key={report.id} className="hover:bg-slate-800/30">
                            <td className="px-4 py-3">
                              <p className="font-medium text-white">
                                {report.business_name ?? t("myReports.untitledReport")}
                              </p>
                              {report.industry && (
                                <p className="text-xs text-slate-500">
                                  {industryLabels[report.industry] ?? report.industry}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusCls}`}>
                                {statusLabel}
                              </span>
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
                              {new Date(report.updated_at).toLocaleDateString(
                                locale === "es" ? "es-PA" : "en-US"
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {report.status === "calculated" ? (
                                <Link
                                  href={`/valuation/${report.id}`}
                                  className="text-xs font-semibold text-cyan-400 transition hover:text-cyan-300"
                                >
                                  {t("myReports.actionOpen")} →
                                </Link>
                              ) : report.status === "draft" ? (
                                <Link
                                  href="/valuation?mode=detailed"
                                  className="text-xs font-semibold text-amber-400 transition hover:text-amber-300"
                                >
                                  {t("myReports.actionContinue")} →
                                </Link>
                              ) : (
                                <span className="text-xs text-slate-600">{t("myReports.statusArchived")}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
