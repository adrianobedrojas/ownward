import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SolutionCheckoutButton from "@/components/solutions/SolutionCheckoutButton";
import { getCatalogSolutionBySlug, toPublicSolution } from "@/lib/commerce/products";

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
          <p className="mt-1 text-sm text-slate-200">{publicSolution.status}</p>
          <p className="mt-1 text-xs text-slate-400">{publicSolution.billingModel}</p>
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
