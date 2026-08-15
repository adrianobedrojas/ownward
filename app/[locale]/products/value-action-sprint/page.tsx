import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import PurchaseCard from "./PurchaseCard";
import StartTrialButton from "./StartTrialButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "ValueActionSprint",
  });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function ValueActionSprintPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "ValueActionSprint",
  });

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user already purchased this product
  let alreadyPurchased = false;

  if (user) {
    const { data: existing } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_key", "value_action_sprint")
      .eq("payment_status", "paid")
      .maybeSingle();

    alreadyPurchased = Boolean(existing);
  }

  // Check if user has already started a Value Action Sprint
  let hasSprintWorkspace = false;

  if (user) {
    const { data: workspace } = await supabase
      .from("value_action_sprint_workspaces")
      .select("id, access_mode, trial_ends_at")
      .eq("user_id", user.id)
      .maybeSingle();

    hasSprintWorkspace = Boolean(workspace);
  }

  const localePrefix = locale === "es" ? "/es" : "";

  const loginHref = `${localePrefix}/login?next=${localePrefix}/products/value-action-sprint`;

  const productsHref = `${localePrefix}/account/products`;

  const purchaseLabels = {
    purchaseCta: t("purchaseCta"),
    loginCta: t("loginCta"),
    alreadyPurchased: t("alreadyPurchased"),
    openProduct: t("openProduct"),
    processing: t("processing"),
    errorPrefix: t("errorPrefix"),
    unknownError: t("unknownError"),
    networkError: t("networkError"),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-10">
        <span className="inline-block rounded-full bg-indigo-900/50 px-3 py-1 text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-4">
          {t("badge")}
        </span>

        <h1 className="text-4xl font-bold tracking-tight text-slate-100">
          {t("heading")}
        </h1>

        <p className="mt-4 text-xl text-slate-300">
          {t("tagline")}
        </p>
      </div>

      {/* What it is */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">
          {t("whatItIsTitle")}
        </h2>

        <p className="text-slate-400 leading-relaxed">
          {t("whatItIsBody")}
        </p>
      </section>

      {/* What you get */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">
          {t("whatYouGetTitle")}
        </h2>

        <ul className="space-y-2">
          {(t.raw("whatYouGetItems") as string[]).map(
            (item: string, i: number) => (
              <li
                key={i}
                className="flex items-start gap-2 text-slate-400"
              >
                <span className="mt-0.5 text-indigo-400 shrink-0">
                  ✓
                </span>

                <span>{item}</span>
              </li>
            )
          )}
        </ul>
      </section>

      {/* Trial and purchase options */}
      <div className="space-y-6 mb-10">
        {/* Free trial */}
        {!hasSprintWorkspace && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-300">
              Free Trial
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-100">
              Try the first 15 days free
            </h2>

            <p className="mt-2 text-slate-400 leading-relaxed">
              Start your Value Action Sprint with no payment
              required. Your first 15 days are completely free.
            </p>

            <div className="mt-5">
              {user ? (
                <StartTrialButton />
              ) : (
                <a
                  href={loginHref}
                  className="inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500"
                >
                  Start Free 15-Day Sprint
                </a>
              )}
            </div>

            <p className="mt-3 text-xs text-slate-500">
              No payment required to start your free trial.
            </p>
          </div>
        )}

        {/* Paid option */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Continue
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-100">
              Continue the complete Value Action Sprint
            </h2>

            <p className="mt-2 text-slate-400">
              {t("priceNote")}
            </p>
          </div>

          <PurchaseCard
            productKey="value_action_sprint"
            locale={locale}
            isAuthenticated={Boolean(user)}
            alreadyPurchased={alreadyPurchased}
            loginHref={loginHref}
            productsHref={productsHref}
            labels={purchaseLabels}
          />
        </div>
      </div>

      {/* Legal disclaimer */}
      <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-5 py-4 text-sm text-amber-300/80">
        <p className="font-semibold text-amber-200 mb-1">
          {t("disclaimerTitle")}
        </p>

        <p>{t("disclaimerBody")}</p>
      </div>
    </div>
  );
}
