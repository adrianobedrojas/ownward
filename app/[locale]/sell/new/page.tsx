import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { getUserBillingState, checkListingLimit } from "@/lib/billing";
import { createListingDraft } from "../actions";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ListingStudio" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function NewListingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supabase, user } = await requireUser();
  const t = await getTranslations("ListingStudio");
  const tSell = await getTranslations("Sell");

  // Check listing limit
  const billing = await getUserBillingState(supabase, user.id);
  const { count: currentListingCount } = await supabase
    .from("business_listings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("status", "deleted");

  const limitError = checkListingLimit(billing.entitlements, currentListingCount ?? 0);

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-slate-400">
        <Link href={`/${locale}/sell`} className="hover:text-cyan-400 transition">
          {tSell("heroBadge")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">{t("steps.identity")}</span>
      </nav>

      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          {t("intro.badge")}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">{t("intro.title")}</h1>
        <p className="mt-3 text-slate-400">{t("intro.description")}</p>
      </header>

      {limitError ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-6 text-center">
          <p className="font-semibold text-amber-300">{t("intro.noPlan")}</p>
          <Link
            href={`/${locale}/pricing`}
            className="mt-4 inline-block rounded-lg bg-cyan-400 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            {t("intro.upgradeCta")}
          </Link>
        </div>
      ) : (
        <form action={createListingDraft} className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-6">
          {/* Step 1: Identity */}
          <div>
            <h2 className="text-lg font-bold text-white">{t("identity.title")}</h2>
            <p className="mt-1 text-sm text-slate-400">{t("identity.description")}</p>
          </div>

          {/* Legal business name (private) */}
          <div>
            <label htmlFor="business-name" className="block text-sm font-semibold text-slate-300">
              {t("identity.businessNameLabel")}
              <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-normal text-slate-400">
                {t("identity.visibilityPrivate")}
              </span>
            </label>
            <input
              id="business-name"
              name="businessName"
              type="text"
              required
              placeholder={t("identity.businessNamePlaceholder")}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">{t("identity.businessNameHint")}</p>
          </div>

          {/* Confidentiality toggle */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isConfidential"
                value="true"
                id="is-confidential"
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
              />
              <div>
                <span className="block text-sm font-semibold text-slate-300">
                  {t("identity.isConfidentialLabel")}
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  {t("identity.isConfidentialHint")}
                </span>
              </div>
            </label>

            <div id="teaser-title-field" className="mt-4">
              <label htmlFor="teaser-title" className="block text-sm font-semibold text-slate-300">
                {t("identity.teaserTitleLabel")}
                <span className="ml-2 rounded-full bg-cyan-400/10 px-2 py-0.5 text-xs font-normal text-cyan-300">
                  {t("identity.visibilityPublic")}
                </span>
              </label>
              <input
                id="teaser-title"
                name="teaserTitle"
                type="text"
                placeholder={t("identity.teaserTitlePlaceholder")}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">{t("identity.teaserTitleHint")}</p>
            </div>
          </div>

          {/* Confidentiality disclaimer */}
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
            <p className="text-sm font-semibold text-amber-300">{tSell("protectTitle")}</p>
            <p className="mt-1 text-xs text-slate-300">{tSell("protectDescription")}</p>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {t("nav.saveContinue")}
          </button>
        </form>
      )}
    </section>
  );
}
