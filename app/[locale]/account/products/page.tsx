import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import ContextualSolutionModule from "@/components/solutions/ContextualSolutionModule";
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
  target_type: string | null;
  target_id: string | null;
};

export default async function AccountProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AccountProducts" });
  const { supabase, user } = await requireUser();

  const { data: purchases } = await supabase
    .from("purchases")
    .select("id, product_key, payment_status, fulfillment_status, amount_total, currency, created_at, target_type, target_id")
    .order("created_at", { ascending: false });

  const items: Purchase[] = purchases ?? [];
  const purchaseIds = items.map((purchase) => purchase.id);

  let entitlementPurchaseIds = new Set<string>();
  const workspaceByPurchaseId = new Map<string, { id: string }>();
  const valuationDeliveryByPurchaseId = new Map<
    string,
    { status: string; valuation_report_id: string | null; business_id: string }
  >();
  const dealRoomAccessByPurchaseId = new Map<
    string,
    { deal_room_id: string; access_status: string; access_expires_at: string }
  >();
  const confidentialLaunchByPurchaseId = new Map<
    string,
    { listing_id: string; status: string }
  >();
  const businessInABoxSetupByPurchaseId = new Map<
    string,
    { id: string; business_id: string; template_key: string; status: string; completed_at: string | null }
  >();

  if (purchaseIds.length > 0) {
    const { data: entitlementGrants } = await supabase
      .from("entitlement_grants")
      .select("purchase_id")
      .eq("status", "active")
      .in("purchase_id", purchaseIds);

    entitlementPurchaseIds = new Set(
      (entitlementGrants ?? []).map((grant) => String(grant.purchase_id))
    );

    const { data: workspaces } = await supabase
      .from("value_action_sprint_workspaces")
      .select("id, purchase_id")
      .in("purchase_id", purchaseIds);

    for (const workspace of workspaces ?? []) {
      workspaceByPurchaseId.set(String(workspace.purchase_id), { id: String(workspace.id) });
    }

    const [valuationDeliveriesRes, dealRoomAccessRes, confidentialLaunchesRes, businessInABoxSetupsRes] = await Promise.all([
      supabase
        .from("paid_valuation_report_deliveries")
        .select("purchase_id, status, valuation_report_id, business_id")
        .in("purchase_id", purchaseIds),
      supabase
        .from("deal_room_paid_access")
        .select("purchase_id, deal_room_id, access_status, access_expires_at")
        .in("purchase_id", purchaseIds),
      supabase
        .from("confidential_sale_launches")
        .select("purchase_id, listing_id, status")
        .in("purchase_id", purchaseIds),
      supabase
        .from("business_in_a_box_setups")
        .select("id, purchase_id, business_id, template_key, status, completed_at")
        .in("purchase_id", purchaseIds),
    ]);

    for (const row of valuationDeliveriesRes.data ?? []) {
      valuationDeliveryByPurchaseId.set(String(row.purchase_id), {
        status: String(row.status),
        valuation_report_id: row.valuation_report_id ? String(row.valuation_report_id) : null,
        business_id: String(row.business_id),
      });
    }

    for (const row of dealRoomAccessRes.data ?? []) {
      dealRoomAccessByPurchaseId.set(String(row.purchase_id), {
        deal_room_id: String(row.deal_room_id),
        access_status: String(row.access_status),
        access_expires_at: String(row.access_expires_at),
      });
    }

    for (const row of confidentialLaunchesRes.data ?? []) {
      confidentialLaunchByPurchaseId.set(String(row.purchase_id), {
        listing_id: String(row.listing_id),
        status: String(row.status),
      });
    }

    for (const row of businessInABoxSetupsRes.data ?? []) {
      businessInABoxSetupByPurchaseId.set(String(row.purchase_id), {
        id: String(row.id),
        business_id: String(row.business_id),
        template_key: String(row.template_key),
        status: String(row.status),
        completed_at: row.completed_at ? String(row.completed_at) : null,
      });
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100 mb-2">
        {t("heading")}
      </h1>
      <p className="text-slate-400 mb-8">{t("subheading")}</p>

      <ContextualSolutionModule
        placement="my_purchases"
        locale={locale === "es" ? "es" : "en"}
        userId={user.id}
      />

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-12 text-center">
          <p className="text-slate-400 text-lg">{t("emptyState")}</p>
          <Link
            href={`/${locale === "es" ? "es/" : ""}solutions`}
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

            const localePrefix = locale === "es" ? "/es" : "";
            const hasEntitlement = entitlementPurchaseIds.has(purchase.id);
            const workspaceHref = `${localePrefix}/account/products/${purchase.id}/workspace`;

            let actionLabel: string | null = null;
            let actionHref: string | null = null;

            const isRefunded =
              purchase.payment_status === "refunded" ||
              purchase.fulfillment_status === "refunded";

            if (isRefunded) {
              actionLabel = t("actions.refunded");
            } else if (
              purchase.payment_status !== "paid" ||
              purchase.fulfillment_status !== "fulfilled"
            ) {
              actionLabel = t("actions.processing");
            } else if (!product) {
              actionLabel = t("actions.noWorkspace");
            } else if (
              product.fulfillmentBehavior === "create_value_action_sprint_workspace" &&
              hasEntitlement &&
              workspaceByPurchaseId.has(purchase.id)
            ) {
              actionLabel = t("actions.openWorkspace");
              actionHref = workspaceHref;
            } else if (
              (product.fulfillmentBehavior === "grant_report_access" ||
                product.fulfillmentBehavior === "grant_enhanced_valuation_report") &&
              hasEntitlement
            ) {
              if (product.key === "enhanced_valuation_report") {
                const delivery = valuationDeliveryByPurchaseId.get(purchase.id);
                if (delivery?.status === "input_required") {
                  actionLabel = t("actions.completeReportInputs");
                  actionHref = `${localePrefix}/valuation?mode=detailed&businessId=${delivery.business_id}`;
                } else if (delivery?.valuation_report_id) {
                  actionLabel = t("actions.viewEnhancedReport");
                  actionHref = `${localePrefix}/account/products/${purchase.id}/report`;
                } else {
                  actionLabel = t("actions.processing");
                }
              } else {
                actionLabel = t("actions.viewReport");
                actionHref = `${localePrefix}/valuation`;
              }
            } else if (product.fulfillmentBehavior === "apply_listing_promotion") {
              actionLabel = t("actions.managePromotion");
              actionHref = `${localePrefix}/dashboard?featured=active`;
            } else if (product.key === "deal_room_90") {
              const paidAccess = dealRoomAccessByPurchaseId.get(purchase.id);
              if (!paidAccess) {
                actionLabel = t("actions.processing");
              } else if (paidAccess.access_status === "expired") {
                actionLabel = t("actions.dealRoomExpired");
                actionHref = `${localePrefix}/deals`;
              } else {
                actionLabel = t("actions.openDealRoom");
                actionHref = `${localePrefix}/deals/${paidAccess.deal_room_id}`;
              }
            } else if (product.key === "confidential_sale_launch") {
              const launch = confidentialLaunchByPurchaseId.get(purchase.id);
              if (!launch) {
                actionLabel = t("actions.processing");
              } else if (launch.status === "refunded") {
                actionLabel = t("actions.refunded");
              } else {
                actionLabel = t("actions.manageConfidentialLaunch");
                actionHref = `${localePrefix}/sell/${launch.listing_id}/edit`;
              }
            } else if (product.key === "business_in_a_box") {
              const setup = businessInABoxSetupByPurchaseId.get(purchase.id);
              if (!setup) {
                actionLabel = t("actions.completeSetup");
              } else if (setup.status === "failed") {
                actionLabel = t("actions.setupFailed");
                actionHref = `${localePrefix}/account/products/${purchase.id}/business-in-a-box`;
              } else if (setup.status === "refunded" || setup.status === "partially_reversed") {
                actionLabel = t("actions.refunded");
                actionHref = `${localePrefix}/account/products/${purchase.id}/business-in-a-box`;
              } else if (setup.status === "completed") {
                actionLabel = t("actions.viewSetup");
                actionHref = `${localePrefix}/account/products/${purchase.id}/business-in-a-box`;
              } else {
                actionLabel = t("actions.processing");
                actionHref = `${localePrefix}/account/products/${purchase.id}/business-in-a-box`;
              }
            } else if (hasEntitlement) {
              actionLabel = t("actions.viewEntitlement");
              actionHref = `${localePrefix}/account/products/${purchase.id}`;
            } else {
              actionLabel = t("actions.noWorkspace");
            }

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

                <div className="mt-4">
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
