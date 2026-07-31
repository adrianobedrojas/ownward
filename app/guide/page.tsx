// app/guide/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ownward Guide — Business Guidance, Tools, and Stories",
  description:
    "Practical guidance, tools, and stories for people building, growing, buying, or selling a small business.",
};

const categories = [
  {
    slug: "run",
    name: "1. Run a business",
    description: "Practical material for existing owners on organization, records, operations, and reducing owner dependence.",
    cta: "Access your business dashboard to manage tasks, customers, documents, and key metrics.",
    ctaLink: "/dashboard",
    ctaLabel: "Open dashboard",
  },
  {
    slug: "grow",
    name: "2. Grow a business",
    description: "Strategies on customer profitability, value drivers, recurring revenue, and 90-day growth planning.",
    cta: "Set measurable growth goals and track progress toward them with the 90-day planner.",
    ctaLink: "/grow",
    ctaLabel: "Open growth planner",
  },
  {
    slug: "value",
    name: "3. Business valuation",
    description: "Breakdowns of SDE, EBITDA multiples, revenue vs. profit, and valuation estimation factors.",
    cta: "Build a preliminary valuation scenario using your own financial inputs.",
    ctaLink: "/valuation",
    ctaLabel: "Estimate business value",
  },
  {
    slug: "sell",
    name: "4. Selling a business",
    description: "Step-by-step guidance on confidential listings, due diligence, NDAs, CIMs, and closing.",
    cta: "Prepare your business for sale or create a confidential listing.",
    ctaLink: "/sell",
    ctaLabel: "Create listing draft",
  },
  {
    slug: "buy",
    name: "5. Buying a business",
    description: "How to evaluate listings, verify revenue, spot red flags, and navigate due diligence.",
    cta: "Browse active business listings and search by category or location.",
    ctaLink: "/buy",
    ctaLabel: "Browse marketplace",
  },
  {
    slug: "stories",
    name: "6. Owner stories & founder notes",
    description: "Real-world lessons, behind-the-scenes building notes, and relatable scenarios from business owners.",
    cta: "Read stories and lessons from owners who have built, grown, bought, or sold businesses.",
    ctaLink: "/guide/stories",
    ctaLabel: "Browse stories",
  },
];

const situations = [
  { label: "Start or organize a business", href: "/guide/run" },
  { label: "Grow an existing business", href: "/guide/grow" },
  { label: "Understand what a business is worth", href: "/guide/value" },
  { label: "Prepare a business for sale", href: "/guide/sell" },
  { label: "Find a business to buy", href: "/guide/buy" },
  { label: "Learn from other owners", href: "/guide/stories" },
];

export default function GuideIndexPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 text-slate-100">
      {/* Hero Section */}
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Ownward Guide
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Practical guidance, tools, and stories for business owners
        </h1>
        <p className="mt-4 text-lg leading-7 text-slate-300">
          Understand your business, strengthen its core, know its value, and buy or sell with greater confidence.
        </p>
      </div>

      {/* Situation Selector */}
      <section className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white">What are you trying to do?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {situations.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-white"
            >
              <span>{item.label}</span>
              <span className="text-cyan-400">&rarr;</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Primary Categories Grid */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-white">Primary Content Categories</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <article
              key={cat.slug}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700 hover:bg-slate-900"
            >
              <div>
                <h3 className="text-xl font-semibold text-white">{cat.name}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{cat.description}</p>
              </div>

              <div className="mt-6 border-t border-slate-800 pt-4">
                <p className="text-xs font-medium text-cyan-400">{cat.cta}</p>
                <div className="mt-3 flex items-center gap-4">
                  {cat.slug !== "stories" && (
                    <Link
                      href={`/guide/${cat.slug}`}
                      className="inline-block text-sm font-semibold text-white hover:text-cyan-300"
                    >
                      Browse category &rarr;
                    </Link>
                  )}
                  <Link
                    href={cat.ctaLink}
                    className="inline-block text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    {cat.ctaLabel} &rarr;
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
