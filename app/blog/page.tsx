// app/blog/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function BlogIndexPage() {
  const supabase = await createClient();

  // Fetch all published posts ordered by creation date
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  return (
    <main className="max-w-4xl mx-auto px-4 py-16 text-slate-100">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-white">Ownward Hub Blog</h1>
        <p className="mt-4 text-lg text-slate-300">
          Insights, guides, and updates on running, growing, buying, and selling small businesses.
        </p>
      </div>

      {error || !posts || posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
          No blog posts found yet. Check back soon!
        </div>
      ) : (
        <div className="grid gap-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl transition hover:border-slate-700 hover:bg-slate-900"
            >
              <Link href={`/blog/${post.slug}`} className="block group">
                <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
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
                
                <h2 className="text-2xl font-semibold text-white group-hover:text-cyan-400 transition">
                  {post.title}
                </h2>

                {post.description && (
                  <p className="mt-3 text-slate-300 leading-7">
                    {post.description}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-cyan-400 group-hover:underline">
                  Read article &rarr;
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
