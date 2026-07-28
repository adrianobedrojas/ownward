// app/guide/[category]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

const categoryTitles: Record<string, { title: string; description: string }> = {
  run: { title: "Run a Business", description: "Practical material for existing owners on organization, records, and operations." },
  grow: { title: "Grow a Business", description: "Strategies on customer profitability, value drivers, and growth planning." },
  value: { title: "Business Valuation", description: "Breakdowns of SDE, EBITDA multiples, and valuation estimation." },
  sell: { title: "Selling a Business", description: "Guidance on confidential listings, due diligence, NDAs, and closing." },
  buy: { title: "Buying a Business", description: "How to evaluate listings, verify revenue, and navigate acquisitions." },
  stories: { title: "Owner Stories & Founder Notes", description: "Real-world lessons and behind-the-scenes building notes." },
  resources: { title: "Interactive Resources & Checklists", description: "Downloadable checklists, calculators, and assessments." },
};

export default async function GuideCategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const catInfo = categoryTitles[category];

  if (!catInfo) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 text-slate-100">
      <div className="mb-8">
        <Link href="/guide" className="text-sm font-semibold text-cyan-400 hover:underline">
          &larr; Back to Ownward Guide
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {catInfo.title}
        </h1>
        <p className="mt-2 text-lg text-slate-300">{catInfo.description}</p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-12 text-center">
        <h2 className="text-xl font-semibold text-white">Articles coming soon</h2>
        <p className="mt-2 text-sm text-slate-400">
          We are actively publishing foundational guides for this category. Check back shortly for our launch articles.
        </p>
      </div>
    </main>
  );
}
