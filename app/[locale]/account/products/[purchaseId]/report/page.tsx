import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/require-user";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AccountProducts" });

  return {
    title: t("detail.pageTitle"),
    description: t("detail.pageDescription"),
  };
}

export default async function PurchaseReportPage({
  params,
}: {
  params: Promise<{ locale: string; purchaseId: string }>;
}) {
  const { locale, purchaseId } = await params;
  const { supabase, user } = await requireUser();
  const t = await getTranslations({ locale, namespace: "AccountProducts" });

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, product_key, payment_status, fulfillment_status")
    .eq("id", purchaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!purchase) {
    notFound();
  }

  const localePrefix = locale === "es" ? "/es" : "";

  const { data: delivery } = await supabase
    .from("paid_valuation_report_deliveries")
    .select("status, valuation_report_id, business_id")
    .eq("purchase_id", purchase.id)
    .maybeSingle();

  const backHref = `${localePrefix}/account/products`;

  let actionHref: string | null = null;
  let actionLabel = t("actions.processing");

  if (purchase.payment_status === "refunded" || purchase.fulfillment_status === "refunded") {
    actionLabel = t("actions.refunded");
  } else if (delivery?.valuation_report_id) {
    actionLabel = t("actions.viewEnhancedReport");
    actionHref = `${localePrefix}/valuation/${delivery.valuation_report_id}`;
  } else if (delivery?.status === "input_required") {
    actionLabel = t("actions.completeReportInputs");
    actionHref = `${localePrefix}/valuation?mode=detailed&businessId=${delivery.business_id}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href={backHref} className="text-sm text-indigo-300 hover:text-indigo-200">
        {t("detail.backToPurchases")}
      </Link>

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">{t("actions.viewEnhancedReport")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("detail.entitlementNote")}</p>

        <div className="mt-6">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              {actionLabel}
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300">
              {actionLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
