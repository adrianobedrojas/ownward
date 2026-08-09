import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { createMetadata, getAbsoluteUrl, serializeJsonLd } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

const getPublishedPost = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('posts')
    .select('id,slug,title,description,content,created_at,updated_at')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) {
    return {};
  }

  return createMetadata({
    locale,
    pathname: `/blog/${post.slug}`,
    title: post.title,
    description: post.description ?? (locale === 'es' ? 'Artículo del blog de Ownward Hub.' : 'Ownward Hub blog article.'),
    type: 'article',
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) {
    notFound();
  }

  const canonicalUrl = getAbsoluteUrl(`/blog/${post.slug}`, locale === 'es' ? 'es' : 'en');
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Blog',
        item: getAbsoluteUrl('/blog', locale === 'es' ? 'es' : 'en'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: post.title,
        item: canonicalUrl,
      },
    ],
  };
  const blogPostingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description ?? undefined,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    datePublished: post.created_at ?? undefined,
    dateModified: post.updated_at ?? undefined,
    inLanguage: locale === 'es' ? 'es' : 'en',
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-slate-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(blogPostingJsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link href="/blog" className="transition hover:text-white">Blog</Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-200">{post.title}</span>
      </nav>
      <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          {post.title}
        </h1>

        <div className="mt-4 flex items-center gap-4 text-sm text-slate-400">
          {post.created_at && (
            <time dateTime={post.created_at}>
              {new Date(post.created_at).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
          )}
        </div>

        <hr className="my-8 border-slate-800" />

        <div className="prose prose-invert max-w-none text-slate-300 leading-8 space-y-6">
          {post.content}
        </div>
      </article>
    </main>
  );
}
