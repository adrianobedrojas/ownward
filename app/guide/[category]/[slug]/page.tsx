import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GuideShareControls from "@/components/GuideShareControls";
import SbaLoanReadinessCheck from "@/components/SbaLoanReadinessCheck";
import { getGuideArticle, getGuideCategory, guideArticles } from "@/lib/guide-content";

interface GuideArticlePageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateStaticParams() {
  return guideArticles.map((article) => ({
    category: article.category,
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: GuideArticlePageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const article = getGuideArticle(category, slug);

  if (!article) {
    return {};
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ownwardhub.com";
  const canonicalUrl = new URL(`/guide/${article.category}/${article.slug}`, siteUrl).toString();

  return {
    title: article.title,
    description: article.metadataDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: article.title,
      description: article.metadataDescription,
      url: canonicalUrl,
      type: "article",
    },
  };
}

export default async function GuideArticlePage({ params }: GuideArticlePageProps) {
  const { category, slug } = await params;
  const article = getGuideArticle(category, slug);
  const catInfo = getGuideCategory(category);

  if (!article || !catInfo) {
    notFound();
  }

  const canonicalUrl = new URL(
    `/guide/${article.category}/${article.slug}`,
    "https://ownwardhub.com",
  ).toString();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 text-slate-100">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Ownward Guide · {catInfo.title}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-300">{article.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
          <span>{article.readingTime}</span>
          {article.lastReviewed && (
            <span>Last reviewed {article.lastReviewed}</span>
          )}
        </div>
        <div className="mt-5">
          <GuideShareControls
            title={article.title}
            description={article.description}
            canonicalUrl={canonicalUrl}
          />
        </div>

        <hr className="my-8 border-slate-800" />

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Introduction</h2>
          {article.introduction.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-7 text-slate-300 sm:text-base">
              {paragraph}
            </p>
          ))}
        </section>

        {article.interactiveTool === "sba-readiness" && <SbaLoanReadinessCheck />}

        <div className="mt-10 space-y-10">
          {article.sections.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-slate-300 sm:text-base">
                  {paragraph}
                </p>
              ))}

              {section.bullets && (
                <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-slate-300 sm:text-base">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}

              {section.steps && (
                <ol className="list-decimal space-y-2 pl-6 text-sm leading-7 text-slate-300 sm:text-base">
                  {section.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-950/50 p-5 sm:p-6">
          <h2 className="text-2xl font-semibold text-white">30-day action plan</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300 sm:text-base">
            {article.actionPlan.map((item) => (
              <li key={item.week} className="rounded-lg border border-slate-800 px-4 py-3">
                <span className="font-semibold text-white">{item.week}:</span>{" "}
                {item.focus}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-white">Checklist</h2>
          <ul className="mt-4 space-y-3" aria-label="Article checklist">
            {article.checklist.map((item) => (
              <li key={item}>
                <label className="flex items-start gap-3 rounded-lg border border-slate-800 px-4 py-3 text-sm leading-6 text-slate-300 sm:text-base">
                  <input
                    type="checkbox"
                    disabled
                    aria-label={item}
                    className="mt-1 h-4 w-4 accent-cyan-400"
                  />
                  <span>{item}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        {article.sources && article.sources.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-white">Official sources</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              SBA policy and lender requirements can change. Verify the applicable rules with an
              SBA-participating lender before making a financial or relocation decision.
            </p>
            <ul className="mt-4 space-y-2">
              {article.sources.map((source) => (
                <li key={source.href}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm text-cyan-300 hover:text-cyan-200 hover:underline"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10 border-t border-slate-800 pt-6">
          <GuideShareControls
            title={article.title}
            description={article.description}
            canonicalUrl={canonicalUrl}
          />
        </div>

        <section className="mt-10 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={article.categoryCtaHref}
            className="inline-flex items-center text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            ← {article.categoryCtaLabel}
          </Link>
          <Link
            href={article.ownwardCtaHref}
            className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            {article.ownwardCtaLabel}
          </Link>
        </section>
      </article>
    </main>
  );
}
