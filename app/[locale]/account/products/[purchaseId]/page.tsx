import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
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
    title: t("detail.pageTitle"),
    description: t("detail.pageDescription"),
  };
}

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; purchaseId: string }>;
}) {
  const { locale, purchaseId } = await params;
  const t = await getTranslations({ locale, namespace: "AccountProducts" });
  const { supabase, user } = await requireUser();

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, product_key, payment_status, fulfillment_status, created_at")
    .eq("id", purchaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!purchase) {
    notFound();
  }

  const product = getProduct(purchase.product_key);
  const productName = product
    ? locale === "es"
      ? product.nameEs
      : product.nameEn
    : purchase.product_key;

  const backHref = `/${locale === "es" ? "es/" : ""}account/products`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href={backHref} className="text-sm text-indigo-300 hover:text-indigo-200">
        {t("detail.backToPurchases")}
      </Link>

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">{productName}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {new Date(purchase.created_at).toLocaleDateString(locale === "es" ? "es-US" : "en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">{t("detail.paymentStatusLabel")}</dt>
            <dd className="text-slate-200">{purchase.payment_status}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("detail.fulfillmentStatusLabel")}</dt>
            <dd className="text-slate-200">{purchase.fulfillment_status}</dd>
          </div>
        </dl>

        <p className="mt-6 text-sm text-slate-400">{t("detail.entitlementNote")}</p>
      </div>
    </div>
  );
}
