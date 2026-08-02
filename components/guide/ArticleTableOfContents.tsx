import type { GuideSectionAnchor } from '@/lib/guide-discovery';

interface ArticleTableOfContentsProps {
  title: string;
  items: GuideSectionAnchor[];
}

export default function ArticleTableOfContents({ title, items }: ArticleTableOfContentsProps) {
  if (items.length === 0) return null;

  const list = (
    <ol className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`} className="text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
            {item.title}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <details className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 lg:hidden print:hidden">
        <summary className="cursor-pointer text-sm font-semibold text-white">{title}</summary>
        <div className="mt-4">{list}</div>
      </details>
      <aside className="sticky top-24 hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-5 lg:block print:hidden">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</h2>
        <div className="mt-4">{list}</div>
      </aside>
    </>
  );
}
