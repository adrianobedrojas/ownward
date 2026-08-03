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
  const t = await getTranslations({ locale, namespace: "AccountProductWorkspace" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function ValueActionSprintWorkspacePage({
  params,
}: {
  params: Promise<{ locale: string; purchaseId: string }>;
}) {
  const { locale, purchaseId } = await params;
  const t = await getTranslations({ locale, namespace: "AccountProductWorkspace" });
  const { supabase, user } = await requireUser();

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, product_key, payment_status, fulfillment_status")
    .eq("id", purchaseId)
    .maybeSingle();

  if (
    !purchase ||
    purchase.product_key !== "value_action_sprint" ||
    purchase.payment_status !== "paid"
  ) {
    notFound();
  }

  const { data: entitlementGrant } = await supabase
    .from("entitlement_grants")
    .select("id")
    .eq("purchase_id", purchase.id)
    .eq("user_id", user.id)
    .eq("product_key", "value_action_sprint")
    .eq("status", "active")
    .maybeSingle();

  if (!entitlementGrant) {
    notFound();
  }

  const { data: workspace } = await supabase
    .from("value_action_sprint_workspaces")
    .select("id, status, updated_at")
    .eq("purchase_id", purchase.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const backHref = `/${locale === "es" ? "es/" : ""}account/products`;

  if (purchase.fulfillment_status !== "fulfilled" || !workspace) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href={backHref} className="text-sm text-indigo-300 hover:text-indigo-200">
          {t("backToProducts")}
        </Link>
        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-6">
          <h1 className="text-2xl font-semibold text-slate-100">{t("pendingTitle")}</h1>
          <p className="mt-3 text-slate-400">{t("pendingBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href={backHref} className="text-sm text-indigo-300 hover:text-indigo-200">
        {t("backToProducts")}
      </Link>
      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">{t("heading")}</h1>
        <p className="mt-3 text-slate-400">{t("body")}</p>
        <p className="mt-4 text-sm text-slate-500">
          {t("statusLabel")} {workspace.status}
        </p>
      </div>
    </div>
  );
}
