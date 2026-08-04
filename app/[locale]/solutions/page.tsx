import type { Metadata } from "next";
import SolutionsCatalogClient from "@/components/solutions/SolutionsCatalogClient";
import { getCatalogSolutions, toPublicSolution } from "@/lib/commerce/products";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isSpanish = locale === "es";

  return {
    title: isSpanish ? "Soluciones Ownward" : "Ownward Solutions",
    description: isSpanish
      ? "Catálogo comercial de Ownward con filtros por objetivos, audiencia y precio."
      : "Ownward commercial catalog with filters by goals, audience, and price.",
  };
}

export default async function SolutionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isSpanish = locale === "es";
  const safeLocale: "en" | "es" = isSpanish ? "es" : "en";

  const solutions = getCatalogSolutions().map((solution) =>
    toPublicSolution(solution, safeLocale)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-white">
          {isSpanish ? "Soluciones Ownward" : "Ownward Solutions"}
        </h1>
        <p className="mt-2 text-slate-300">
          {isSpanish
            ? "Explora todo el catálogo comercial por meta, categoría, audiencia, disponibilidad y precio."
            : "Explore the full commercial catalog by goal, category, audience, availability, and price."}
        </p>
      </header>

      <SolutionsCatalogClient locale={safeLocale} solutions={solutions} />
    </div>
  );
}
