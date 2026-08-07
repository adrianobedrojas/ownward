import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SolutionCheckoutButton from "@/components/solutions/SolutionCheckoutButton";
import { getCatalogSolutionBySlug, toPublicSolution } from "@/lib/commerce/products";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const safeLocale: "en" | "es" = locale === "es" ? "es" : "en";
  const solution = getCatalogSolutionBySlug(slug);

  if (!solution) {
    return {
      title: safeLocale === "es" ? "Solución no encontrada" : "Solution not found",
    };
  }

  const publicSolution = toPublicSolution(solution, safeLocale);

  return {
    title: publicSolution.name,
    description: publicSolution.description,
  };
}

/** Load eligible published+public listings for the authenticated user. */
async function loadEligibleListings(
  locale: "en" | "es"
): Promise<{ options: Array<{ id: string; label: string; description: string; eligible: boolean }>; dashboardHref: string } | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Query published, public listings owned by the user that are not already
    // actively featured (featured_until > now()).
    const { data: listings } = await supabase
      .from("business_listings")
      .select("id, business_name, teaser_title, status, is_public, featured_until")
      .eq("user_id", user.id)
      .eq("status", "published")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    const now = new Date();
    const eligibleListings = (listings ?? []).filter((l) => {
      if (!l.featured_until) return true;
      return new Date(l.featured_until) <= now;
    });

    const options = eligibleListings.map((l) => {
      const name = (l.teaser_title ?? l.business_name ?? l.id) as string;
      return {
        id: l.id as string,
        label: name,
        description: locale === "es" ? "Publicado y elegible" : "Published and eligible",
        eligible: true,
      };
    });

    return { options, dashboardHref: "/sell" };
  } catch {
    return null;
  }
}

const STATUS_LABELS: Record<string, { en: string; es: string }> = {
  active: { en: "Available", es: "Disponible" },
  planned: { en: "Coming soon", es: "Próximamente" },
  coming_soon: { en: "Coming soon", es: "Próximamente" },
  included: { en: "Included", es: "Incluido" },
  contact: { en: "Contact us", es: "Contáctanos" },
};

const BILLING_MODEL_LABELS: Record<string, { en: string; es: string }> = {
  one_time: { en: "One-time purchase", es: "Compra única" },
  free: { en: "Free", es: "Gratis" },
  monthly: { en: "Monthly", es: "Mensual" },
  annual: { en: "Annual", es: "Anual" },
  per_target: { en: "Per item", es: "Por elemento" },
  per_transaction: { en: "Per transaction", es: "Por transacción" },
  included: { en: "Included", es: "Incluido" },
  contact: { en: "Contact us", es: "Contáctanos" },
};

export default async function SolutionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const safeLocale: "en" | "es" = locale === "es" ? "es" : "en";
  const isSpanish = safeLocale === "es";
  const solution = getCatalogSolutionBySlug(slug);

  if (!solution) {
    notFound();
  }

  const publicSolution = toPublicSolution(solution, safeLocale);

  const statusLabel =
    STATUS_LABELS[publicSolution.status]?.[safeLocale] ?? publicSolution.status;
  const billingModelLabel =
    BILLING_MODEL_LABELS[publicSolution.billingModel]?.[safeLocale] ?? publicSolution.billingModel;

  // For listing-targeted products, load eligible listings server-side so
  // customers never see a raw UUID input field.
  let listingTargetOptions: Array<{ id: string; label: string; description: string; eligible: boolean }> | undefined;
  let listingDashboardHref: string | undefined;
  if (publicSolution.requiredTargetType === "listing" && publicSolution.ctaBehavior === "checkout") {
    const result = await loadEligibleListings(safeLocale);
    listingTargetOptions = result?.options ?? [];
    listingDashboardHref = result?.dashboardHref;
  }

  const targetSelectLabel = isSpanish
    ? `Elige el listado para ${publicSolution.name}`
    : `Choose the listing for ${publicSolution.name}`;

  const targetSelectPlaceholder = isSpanish
    ? "Selecciona un listado publicado"
    : "Select a published listing";

  const noEligibleTargetMessage = isSpanish
    ? "Todavía no tienes un listado publicado elegible."
    : "You do not have an eligible published listing yet.";

  const noEligibleTargetLinkText = isSpanish
    ? `Crea o publica un listado antes de comprar ${publicSolution.name}.`
    : `Create or publish a listing before purchasing ${publicSolution.name}.`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-white">{publicSolution.name}</h1>
      <p className="mt-3 text-slate-300">{publicSolution.description}</p>
      <p className="mt-2 text-sm text-slate-400">{publicSolution.outcome}</p>

      <div className="mt-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{isSpanish ? "Precio" : "Price"}</p>
          <p className="mt-1 text-2xl font-semibold text-cyan-300">
            {publicSolution.displayPrice === 0 ? "Free" : `$${publicSolution.displayPrice}`}
          </p>
          <p className="text-sm text-slate-400">{publicSolution.billingContext}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{isSpanish ? "Estado" : "Status"}</p>
          <p className="mt-1 text-sm text-slate-200">{statusLabel}</p>
          <p className="mt-1 text-xs text-slate-400">{billingModelLabel}</p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-lg font-semibold text-white">{isSpanish ? "Entregables" : "Deliverables"}</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
          {publicSolution.deliverables.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-lg font-semibold text-white">{isSpanish ? "Activar" : "Activate"}</h2>
        <div className="mt-3">
          <SolutionCheckoutButton
            productKey={publicSolution.key}
            locale={safeLocale}
            ctaBehavior={publicSolution.ctaBehavior}
            status={publicSolution.status}
            requiredTargetType={publicSolution.requiredTargetType}
            targetOptions={listingTargetOptions}
            targetSelectLabel={publicSolution.requiredTargetType === "listing" ? targetSelectLabel : undefined}
            targetSelectPlaceholder={publicSolution.requiredTargetType === "listing" ? targetSelectPlaceholder : undefined}
            noEligibleTargetMessage={publicSolution.requiredTargetType === "listing" ? noEligibleTargetMessage : undefined}
            noEligibleTargetHref={publicSolution.requiredTargetType === "listing" ? (listingDashboardHref ?? "/sell") : undefined}
            noEligibleTargetLinkText={publicSolution.requiredTargetType === "listing" ? noEligibleTargetLinkText : undefined}
          />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-amber-700/40 bg-amber-950/20 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-200">
          {isSpanish ? "Avisos" : "Disclaimers"}
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-100/90">
          {publicSolution.disclaimers.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
