import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/require-user";
import { getProduct } from "@/lib/commerce/products";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AccountProducts" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

type Purchase = {
  id: string;
  product_key: string;
  payment_status: string;
  fulfillment_status: string;
  amount_total: number | null;
  currency: string | null;
  created_at: string;
};

export default async function AccountProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AccountProducts" });
  const { supabase } = await requireUser();

  const { data: purchases } = await supabase
    .from("purchases")
    .select("id, product_key, payment_status, fulfillment_status, amount_total, currency, created_at")
    .order("created_at", { ascending: false });

  const items: Purchase[] = purchases ?? [];
  const purchaseIds = items.map((purchase) => purchase.id);

  let entitlementPurchaseIds = new Set<string>();
  if (purchaseIds.length > 0) {
    const { data: entitlementGrants } = await supabase
      .from("entitlement_grants")
      .select("purchase_id")
      .eq("status", "active")
      .eq("product_key", "value_action_sprint")
      .in("purchase_id", purchaseIds);

    entitlementPurchaseIds = new Set(
      (entitlementGrants ?? []).map((grant) => String(grant.purchase_id))
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100 mb-2">
        {t("heading")}
      </h1>
      <p className="text-slate-400 mb-8">{t("subheading")}</p>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-12 text-center">
          <p className="text-slate-400 text-lg">{t("emptyState")}</p>
          <Link
            href={`/${locale === "es" ? "es/" : ""}products/value-action-sprint`}
            className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            {t("exploreCta")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((purchase) => {
            const product = getProduct(purchase.product_key);
            const productName =
              product
                ? locale === "es"
                  ? product.nameEs
                  : product.nameEn
                : purchase.product_key;

            const formattedAmount =
              purchase.amount_total != null && purchase.currency
                ? new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
                    style: "currency",
                    currency: purchase.currency.toUpperCase(),
                  }).format(purchase.amount_total / 100)
                : null;

            const purchaseDate = new Date(purchase.created_at).toLocaleDateString(
              locale === "es" ? "es-US" : "en-US",
              { year: "numeric", month: "long", day: "numeric" }
            );

            const workspaceHref =
              purchase.product_key === "value_action_sprint" &&
              entitlementPurchaseIds.has(purchase.id)
                ? `/${locale === "es" ? "es/" : ""}account/products/${purchase.id}/workspace`
                : null;

            return (
              <li
                key={purchase.id}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-6"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">{productName}</h2>
                    <p className="mt-1 text-sm text-slate-400">{purchaseDate}</p>
                    {formattedAmount && (
                      <p className="mt-0.5 text-sm text-slate-400">{formattedAmount}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        purchase.payment_status === "paid"
                          ? "bg-emerald-900/50 text-emerald-300"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {t(`paymentStatus.${purchase.payment_status}`, {
                        fallback: purchase.payment_status,
                      })}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        purchase.fulfillment_status === "fulfilled"
                          ? "bg-indigo-900/50 text-indigo-300"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {t(`fulfillmentStatus.${purchase.fulfillment_status}`, {
                        fallback: purchase.fulfillment_status,
                      })}
                    </span>
                  </div>
                </div>

                {workspaceHref &&
                  purchase.payment_status === "paid" &&
                  purchase.fulfillment_status === "fulfilled" && (
                  <div className="mt-4">
                    <Link
                      href={workspaceHref}
                      className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
                    >
                      {t("openProduct")}
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
