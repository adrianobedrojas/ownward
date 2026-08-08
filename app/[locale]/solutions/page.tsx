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
      ? "Explora inteligencia gratuita de Ownward y herramientas opcionales de pago para promoción, ejecución, transacciones, automatización y capacidad adicional."
      : "Explore free Ownward intelligence and optional paid tools for promotion, execution, transactions, automation, and additional capacity.",
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

        <p className="mt-2 max-w-4xl text-slate-300">
          {isSpanish
            ? "Empieza con la inteligencia gratuita y las herramientas premium opcionales que ya están disponibles. Las soluciones futuras aparecen por separado para que puedas distinguir claramente lo que puedes usar hoy."
            : "Start with free intelligence and optional premium tools that are available today. Upcoming solutions are separated so you can clearly see what you can use now."}
        </p>
      </header>

      <SolutionsCatalogClient locale={safeLocale} solutions={solutions} />
    </div>
  );
}
