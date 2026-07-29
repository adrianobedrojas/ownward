import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicBusinessPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: listing, error } = await supabase
    .from("business_listings")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !listing) {
    notFound();
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-16 text-slate-100">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl">
        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
          {listing.category}
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">
          {listing.business_name}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {listing.location || "Location not specified"}
        </p>

        {listing.summary ? (
          <p className="mt-6 text-lg leading-8 text-slate-300">{listing.summary}</p>
        ) : (
          <p className="mt-6 text-lg leading-8 text-slate-500 italic">
            No description provided.
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3 border-t border-slate-800 pt-6">
          <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500">Asking price</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {listing.asking_price
                ? `$${Number(listing.asking_price).toLocaleString()}`
                : "Not set"}
            </p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500">Annual revenue</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {listing.annual_revenue
                ? `$${Number(listing.annual_revenue).toLocaleString()}`
                : "Not set"}
            </p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500">Established</p>
            <p className="mt-1 text-sm font-semibold text-emerald-400">
              {listing.year_established || "N/A"}
            </p>
          </article>
        </div>
      </div>
    </main>
  );
}