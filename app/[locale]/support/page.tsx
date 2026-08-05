import { requireUser } from "@/lib/require-user";
import { getUserBillingState } from "@/lib/billing";
import { submitSupportRequest } from "./actions";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { SUPPORT_MESSAGE_MAX, SUPPORT_SUBJECT_MAX } from "@/lib/support";

export const metadata: Metadata = {
  title: "Support | Ownward",
  description: "Get help with your Ownward account.",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  reviewing: "Under Review",
  awaiting_user: "Awaiting Your Response",
  resolved: "Resolved",
};

function supportStatusLabel(t: Awaited<ReturnType<typeof getTranslations>>, status: string): string {
  const map: Record<string, string> = {
    submitted: t("status.submitted"),
    reviewing: t("status.reviewing"),
    awaiting_user: t("status.awaiting_user"),
    open: t("status.open"),
    in_progress: t("status.in_progress"),
    waiting_on_user: t("status.waiting_on_user"),
    waiting_on_internal: t("status.waiting_on_internal"),
    resolved: t("status.resolved"),
    closed: t("status.closed"),
    archived: t("status.archived"),
  };
  return map[status] ?? STATUS_LABELS[status] ?? status;
}

export default async function SupportPage({
  params: paramsPromise,
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await paramsPromise;
  const t = await getTranslations({ locale, namespace: "Support" });
  const params = await searchParams;
  const { supabase, user } = await requireUser();

  const billing = await getUserBillingState(supabase, user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const prefillName = (profile as { full_name?: string } | null)?.full_name ?? "";
  const prefillEmail = user.email ?? "";

  // Fetch own support requests
  const { data: requests } = await supabase
    .from("support_requests")
    .select("id, subject, status, created_at, plan_at_submission")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const supportTierLabel =
    billing.plan === "pro"
      ? t("tier.priority")
      : billing.plan === "starter" || billing.plan === "builder"
      ? t("tier.standard")
      : t("tier.general");

  const errorMessage = params.error ? decodeURIComponent(params.error) : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          {supportTierLabel}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">{t("title")}</h1>
        <p className="mt-2 text-slate-400">
          {billing.plan === "free"
            ? t("freeDescription")
            : t("paidDescription", { plan: billing.plan, tier: supportTierLabel })}
        </p>
      </div>

      {params.success && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300 text-sm">
          {t("successPrefix")}{" "}
          <code className="font-mono text-emerald-200 text-xs">{params.success}</code>
        </div>
      )}

      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300 text-sm">
          {errorMessage}
        </div>
      ) : null}

      {/* Request form */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-5">{t("form.submitHeading")}</h2>
        <form
          action={async (formData: FormData) => {
            "use server";
            const result = await submitSupportRequest(formData);
            const { redirect } = await import("next/navigation");
            if ("requestId" in result) {
              redirect(
                `/${locale === "es" ? "es/" : ""}support?success=${encodeURIComponent(result.requestId)}`,
              );
            }
            const message = "message" in result ? result.message : t("errors.unexpected");
            redirect(`/${locale === "es" ? "es/" : ""}support?error=${encodeURIComponent(message)}`);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="locale" value={locale} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t("form.name")}
              </label>
              <input
                name="name"
                type="text"
                defaultValue={prefillName}
                readOnly={!!prefillName}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none read-only:opacity-60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t("form.email")}
              </label>
              <input
                name="email"
                type="email"
                defaultValue={prefillEmail}
                readOnly={!!prefillEmail}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none read-only:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {t("form.category")}
            </label>
            <select
              name="category"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="">{t("form.categoryPlaceholder")}</option>
              <option value="billing">{t("categories.billing")}</option>
              <option value="technical">{t("categories.technical")}</option>
              <option value="feature">{t("categories.feature")}</option>
              <option value="account">{t("categories.account")}</option>
              <option value="security">{t("categories.security")}</option>
              <option value="sales">{t("categories.sales")}</option>
              <option value="compliance">{t("categories.compliance")}</option>
              <option value="other">{t("categories.other")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {t("form.subject")} <span className="text-rose-400">*</span>
            </label>
            <input
              name="subject"
              type="text"
              required
              maxLength={SUPPORT_SUBJECT_MAX}
              placeholder={t("form.subjectPlaceholder")}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {t("form.message")} <span className="text-rose-400">*</span>
            </label>
            <textarea
              name="message"
              rows={5}
              required
              maxLength={SUPPORT_MESSAGE_MAX}
              placeholder={t("form.messagePlaceholder")}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300 transition"
          >
            {t("form.submit")}
          </button>
        </form>
      </section>

      {/* Previous requests */}
      {requests && requests.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">{t("history.heading")}</h2>
          <div className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-white">{r.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString()} ·{" "}
                      <span className="capitalize">{r.plan_at_submission ?? "free"}</span> {t("history.plan")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.status === "resolved" || r.status === "closed"
                        ? "bg-emerald-400/10 text-emerald-400"
                        : r.status === "in_progress"
                        ? "bg-cyan-400/10 text-cyan-400"
                        : r.status === "waiting_on_user"
                        ? "bg-amber-400/10 text-amber-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {supportStatusLabel(t, r.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 font-mono">
                  {t("history.requestId")}: {r.id}
                </p>
                <Link
                  href={`/${locale === "es" ? "es/" : ""}support/${r.id}`}
                  className="mt-3 inline-flex items-center text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  {t("history.viewThread")}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
