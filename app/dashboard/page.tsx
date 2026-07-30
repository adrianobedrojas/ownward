import type { Metadata } from "next";
import Link from "next/link";
import { deleteListingDraft, publishListing, unpublishListing } from "./actions";
import { requireUser } from "@/lib/require-user";

export const metadata: Metadata = {
  title: "Dashboard | Ownward Hub",
  description: "Manage your business listing drafts, account settings, and secure deal rooms.",
};

interface SearchParams {
  success?: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();

  // Fetch listings belonging to the authenticated user
  const { data: listings, error } = await supabase
    .from("business_listings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Success Banner */}
      {params.success === "draft-saved" && (
        <div className="mb-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
          <p className="font-semibold">Draft saved successfully!</p>
          <p className="text-sm text-emerald-400/80 mt-1">
            Your business listing draft has been securely stored in your dashboard.
          </p>
        </div>
      )}
      {params.success === "onboarding-complete" && (
        <div className="mb-8 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-cyan-200">
          <p className="font-semibold">Onboarding complete!</p>
          <p className="text-sm text-cyan-300/80 mt-1">
            Your workspace has been set up. You can now manage listings and documents.
          </p>
        </div>
      )}
      {params.success === "password-updated" && (
        <div className="mb-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
          <p className="font-semibold">Password updated!</p>
          <p className="text-sm text-emerald-400/80 mt-1">
            Your new password has been saved.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward Hub Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Your Business Listings & Vault
          </h1>
          <p className="mt-2 text-slate-300">
            Manage your sale drafts, track preparation progress, and review your assets.
          </p>
        </div>

        <div>
          <Link
            href="/sell"
            className="inline-flex items-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            + Create New Listing
          </Link>
        </div>
      </div>

      {/* Listings Section */}
      <section className="mt-12">
        <h2 className="text-xl font-bold text-white mb-6">Saved Listing Drafts</h2>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
            <p>Error loading listings: {error.message}</p>
          </div>
        )}

        {!error && (!listings || listings.length === 0) ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">You haven&apos;t created any listing drafts yet.</p>
            <Link
              href="/sell"
              className="mt-4 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              Start Your First Listing
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listings?.map((listing) => (
              <article
                key={listing.id}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-6"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                      {listing.category}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(listing.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-white">
                    {listing.business_name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {listing.location || "Location not specified"}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Asking Price</p>
                      <p className="font-semibold text-white">
                        {listing.asking_price
                          ? `$${Number(listing.asking_price).toLocaleString()}`
                          : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Annual Revenue</p>
                      <p className="font-semibold text-white">
                        {listing.annual_revenue
                          ? `$${Number(listing.annual_revenue).toLocaleString()}`
                          : "Not set"}
                      </p>
                    </div>
                  </div>

                  {listing.summary && (
                    <p className="mt-4 text-sm text-slate-300 line-clamp-2">
                      {listing.summary}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                  <span className="text-xs font-medium uppercase text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
                    {listing.status}
                  </span>

                  <div className="flex items-center gap-4">
                    {listing.is_public && listing.slug && (
                      <Link
                        href={`/b/${listing.slug}`}
                        className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
                      >
                        View public page
                      </Link>
                    )}

                    {listing.status === "published" ? (
                      <form action={unpublishListing}>
                        <input type="hidden" name="listingId" value={listing.id} />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-amber-400 transition hover:text-amber-300"
                        >
                          Unpublish
                        </button>
                      </form>
                    ) : (
                      <form action={publishListing}>
                        <input type="hidden" name="listingId" value={listing.id} />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-emerald-400 transition hover:text-emerald-300"
                        >
                          Publish
                        </button>
                      </form>
                    )}

                    <form action={deleteListingDraft}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-rose-400 transition hover:text-rose-300"
                      >
                        Delete draft
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
