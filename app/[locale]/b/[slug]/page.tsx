import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingInterestPanel from "@/components/ListingInterestPanel";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicBusinessPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: listing, error } = await supabase
    .from("business_listings")
    .select(
      "id, slug, business_name, category, location, summary, asking_price, annual_revenue, year_established, user_id, featured_until"
    )
    .eq("slug", slug)
    .eq("is_public", true)
    .eq("status", "published")
    .maybeSingle();

  if (error || !listing) {
    notFound();
  }

  const isActiveFeatured =
    listing.featured_until && new Date(listing.featured_until) > new Date();

  // Check auth for interest panel
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if already saved
  let initialSaved = false;
  if (user) {
    const { data: saved } = await supabase
      .from("saved_listings")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", listing.id)
      .maybeSingle();
    initialSaved = !!saved;
  }

  // Seller cannot see the interest panel for their own listing
  const isOwner = user?.id === listing.user_id;

  return (
    <main className="max-w-5xl mx-auto px-4 py-16 text-slate-100">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main listing content */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                {listing.category}
              </span>
              {isActiveFeatured && (
                <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-300">
                  ★ Featured · Promoted
                </span>
              )}
            </div>
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
        </div>

        {/* Interest panel — only for non-owners */}
        {!isOwner && (
          <aside className="lg:col-span-1">
            <ListingInterestPanel
              listingId={listing.id}
              listingName={listing.business_name}
              listingSlug={slug}
              isSignedIn={!!user}
              initialSaved={initialSaved}
            />
            <p className="mt-4 text-center text-xs text-slate-500">
              Need more information before you go?{" "}
              <span className="text-slate-400">
                Ask the seller a question or request additional details.
              </span>
            </p>
          </aside>
        )}
      </div>
    </main>
  );
}