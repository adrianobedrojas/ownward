import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { getBusinessAccess } from "@/lib/business-access";
import { getBusinessInABoxTemplate } from "@/lib/commerce/business-in-a-box-templates";
import { getBusinessInABoxSetupStatusLabel } from "@/lib/commerce/business-in-a-box-status";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isSpanish = locale === "es";
  return {
    title: isSpanish
      ? "Configuración Business-in-a-Box | Ownward"
      : "Business-in-a-Box Setup | Ownward",
    description: isSpanish
      ? "Revisa el estado de tu configuración de Business-in-a-Box."
      : "Review your Business-in-a-Box setup status.",
  };
}

export default async function BusinessInABoxSetupPage({
  params,
}: {
  params: Promise<{ locale: string; purchaseId: string }>;
}) {
  const { locale, purchaseId } = await params;
  const isSpanish = locale === "es";
  const localePrefix = isSpanish ? "/es" : "";

  const t = {
    heading: isSpanish ? "Configuración Business-in-a-Box" : "Business-in-a-Box Setup",
    back: isSpanish ? "← Volver a Mis Compras" : "← Back to My Purchases",
    setupMissingTitle: isSpanish ? "La configuración está en preparación" : "Setup is being prepared",
    setupMissingBody: isSpanish
      ? "El pago se registró y la activación aún está procesándose."
      : "Your payment is recorded and setup is still processing.",
    business: isSpanish ? "Negocio" : "Business",
    template: isSpanish ? "Plantilla" : "Template",
    status: isSpanish ? "Estado" : "Status",
    completedAt: isSpanish ? "Completado" : "Completed",
    resourcesCreated: isSpanish ? "Recursos creados" : "Resources created",
    resourcesProcessing: isSpanish ? "Recursos en proceso" : "Resources processing",
    failureTitle: isSpanish ? "La configuración falló" : "Setup failed",
    failureGuidance: isSpanish
      ? "Revisa tus recursos actuales y vuelve a intentar desde compras."
      : "Review your existing resources and retry from purchases.",
    refundedTitle: isSpanish ? "Configuración reembolsada" : "Setup refunded",
    refundedBody: isSpanish
      ? "El acceso de compra fue revertido. Los recursos modificados se conservaron."
      : "Purchase access was reversed. Any modified resources were preserved.",
    linksTitle: isSpanish ? "Ir a secciones relacionadas" : "Open related sections",
    openTasks: isSpanish ? "Abrir tareas" : "Open tasks",
    openCustomers: isSpanish ? "Abrir clientes" : "Open customers",
    openMilestones: isSpanish ? "Abrir hitos" : "Open milestones",
    openHealth: isSpanish ? "Abrir salud del negocio" : "Open business health",
    openDocuments: isSpanish ? "Abrir documentos" : "Open documents",
  };

  const { supabase, user } = await requireUser();

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, user_id, product_key, payment_status, fulfillment_status")
    .eq("id", purchaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!purchase || purchase.product_key !== "business_in_a_box") {
    notFound();
  }

  const { data: setup } = await supabase
    .from("business_in_a_box_setups")
    .select(
      "id, business_id, template_key, template_version, status, failure_code, failure_message_safe, completed_at, refunded_at"
    )
    .eq("purchase_id", purchase.id)
    .maybeSingle();

  if (!setup) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link href={`${localePrefix}/account/products`} className="text-sm text-indigo-300 hover:text-indigo-200">
          {t.back}
        </Link>
        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-6">
          <h1 className="text-2xl font-semibold text-slate-100">{t.setupMissingTitle}</h1>
          <p className="mt-2 text-sm text-slate-400">{t.setupMissingBody}</p>
        </div>
      </div>
    );
  }

  const access = await getBusinessAccess(user.id, String(setup.business_id));
  if (!access || access.status !== "active") {
    notFound();
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", setup.business_id)
    .maybeSingle();

  const { data: entitlement } = await supabase
    .from("entitlement_grants")
    .select("id, status")
    .eq("purchase_id", purchase.id)
    .eq("user_id", user.id)
    .eq("product_key", "business_in_a_box")
    .maybeSingle();

  if (setup.status === "completed" && purchase.fulfillment_status === "fulfilled") {
    if (!entitlement || entitlement.status !== "active") {
      notFound();
    }
  }

  const { data: resources } = await supabase
    .from("business_in_a_box_generated_resources")
    .select("id, resource_type, resource_label, detached_on_refund, archived_at")
    .eq("setup_id", setup.id)
    .order("created_at", { ascending: true });

  const template = getBusinessInABoxTemplate(String(setup.template_key));
  const templateName = template
    ? isSpanish
      ? template.name.es
      : template.name.en
    : String(setup.template_key);

  const createdResources = (resources ?? []).filter((row) => row.archived_at === null).length;
  const processingResources = setup.status === "processing" ? Math.max(0, 1) : 0;

  const isFailure = setup.status === "failed";
  const isRefunded = setup.status === "refunded" || setup.status === "partially_reversed";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href={`${localePrefix}/account/products`} className="text-sm text-indigo-300 hover:text-indigo-200">
        {t.back}
      </Link>

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">{t.heading}</h1>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">{t.business}</dt>
            <dd className="text-slate-200">{business?.name ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.template}</dt>
            <dd className="text-slate-200">{templateName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.status}</dt>
            <dd className="text-slate-200">{getBusinessInABoxSetupStatusLabel(isSpanish ? "es" : "en", setup.status)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.completedAt}</dt>
            <dd className="text-slate-200">
              {setup.completed_at
                ? new Date(setup.completed_at).toLocaleDateString(isSpanish ? "es-US" : "en-US")
                : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.resourcesCreated}</dt>
            <dd className="text-slate-200">{createdResources}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.resourcesProcessing}</dt>
            <dd className="text-slate-200">{processingResources}</dd>
          </div>
        </dl>

        {isFailure ? (
          <div className="mt-6 rounded-lg border border-rose-700/40 bg-rose-950/20 p-4">
            <p className="text-sm font-semibold text-rose-200">{t.failureTitle}</p>
            <p className="mt-2 text-xs text-rose-100">{setup.failure_message_safe ?? t.failureGuidance}</p>
          </div>
        ) : null}

        {isRefunded ? (
          <div className="mt-6 rounded-lg border border-amber-700/40 bg-amber-950/20 p-4">
            <p className="text-sm font-semibold text-amber-200">{t.refundedTitle}</p>
            <p className="mt-2 text-xs text-amber-100">{t.refundedBody}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-slate-100">{t.linksTitle}</h2>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href={`${localePrefix}/tasks`} className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-800">
            {t.openTasks}
          </Link>
          <Link href={`${localePrefix}/customers`} className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-800">
            {t.openCustomers}
          </Link>
          <Link href={`${localePrefix}/milestones`} className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-800">
            {t.openMilestones}
          </Link>
          <Link href={`${localePrefix}/health`} className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-800">
            {t.openHealth}
          </Link>
          <Link href={`${localePrefix}/documents`} className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-800">
            {t.openDocuments}
          </Link>
        </div>
      </div>
    </div>
  );
}
