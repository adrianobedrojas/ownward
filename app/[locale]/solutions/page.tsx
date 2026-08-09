import type { Metadata } from "next";
import SolutionsCatalogClient from "@/components/solutions/SolutionsCatalogClient";
import { createMetadata, getAbsoluteUrl, serializeJsonLd } from "@/lib/seo";
import { getCatalogSolutions, toPublicSolution } from "@/lib/commerce/products";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isSpanish = locale === "es";

  return createMetadata({
    locale,
    pathname: '/solutions',
    title: isSpanish ? 'Soluciones Ownward' : 'Ownward Solutions',
    description: isSpanish
      ? 'Explora inteligencia gratuita de Ownward y herramientas opcionales de pago para promoción, ejecución, transacciones, automatización y capacidad adicional.'
      : 'Explore free Ownward intelligence and optional paid tools for promotion, execution, transactions, automation, and additional capacity.',
  });
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
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isSpanish ? 'Soluciones' : 'Solutions', item: getAbsoluteUrl('/solutions', safeLocale) },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
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
