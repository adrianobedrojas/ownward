// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();

  // Fetch the blog post, ensuring it is published
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error || !post) {
    notFound();
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-slate-100">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          {post.title}
        </h1>

        <div className="mt-4 flex items-center gap-4 text-sm text-slate-400">
          {post.created_at && (
            <time dateTime={post.created_at}>
              {new Date(post.created_at).toLocaleDateString('en-US', {
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
