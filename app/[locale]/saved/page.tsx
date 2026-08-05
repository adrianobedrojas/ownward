import type { Metadata } from "next";
import Link from "next/link";
import ContextualSolutionModule from "@/components/solutions/ContextualSolutionModule";
import { requireUser } from "@/lib/require-user";
import { removeSavedListingAction } from "./actions";

export const metadata: Metadata = {
  title: "Saved Listings | Ownward",
  description: "Your privately saved business listings.",
};

export default async function SavedListingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supabase, user } = await requireUser();

  const { data: saved, error } = await supabase
    .from("saved_listings")
    .select(`
      id,
      listing_id,
      created_at,
      business_listings (
        id,
        business_name,
        location,
        asking_price,
        slug,
        is_public,
        status
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Private
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Saved Listings</h1>
        <p className="mt-2 text-sm text-slate-400">
          Only you can see this list. Sellers are not notified when you save a listing.
        </p>
      </div>

      <ContextualSolutionModule
        placement="saved_listings"
        locale={locale === "es" ? "es" : "en"}
        userId={user.id}
      />

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
          <p>Could not load saved listings. Please try again.</p>
        </div>
      )}

      {!error && (!saved || saved.length === 0) ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
          <p className="text-lg font-semibold text-slate-300">No saved listings yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Browse businesses and save any that interest you. Your saves are always private.
          </p>
          <Link
            href="/buy"
            className="mt-6 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
          >
            Browse businesses
          </Link>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Saved listings">
          {(saved ?? []).map((item) => {
            const listingRaw = item.business_listings;
            const listing = (Array.isArray(listingRaw) ? listingRaw[0] : listingRaw) as {
              id: string;
              business_name: string;
              location: string | null;
              asking_price: number | null;
              slug: string | null;
              is_public: boolean;
              status: string;
            } | null;

            if (!listing) return null;

            const isPublished = listing.is_public && listing.status === "published";

            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-white truncate">
                      {listing.business_name}
                    </h2>
                    {!isPublished && (
                      <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-xs text-amber-400">
                        Unavailable
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {listing.location || "Location not specified"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                    {listing.asking_price && (
                      <span className="text-slate-300">
                        Asking:{" "}
                        <span className="font-semibold text-white">
                          ${Number(listing.asking_price).toLocaleString()}
                        </span>
                      </span>
                    )}
                    <span className="text-slate-500">
                      Saved{" "}
                      {new Date(item.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {isPublished && listing.slug && (
                    <Link
                      href={`/b/${listing.slug}`}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                    >
                      View listing
                    </Link>
                  )}
                  <form action={removeSavedListingAction}>
                    <input type="hidden" name="listingId" value={listing.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-rose-500/30 px-3 py-2 text-sm font-medium text-rose-400 transition hover:bg-rose-500/10"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
