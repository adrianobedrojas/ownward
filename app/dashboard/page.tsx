import type { Metadata } from "next";
import Link from "next/link";
import { deleteListingDraft, publishListing, unpublishListing } from "./actions";
import { requireUser } from "@/lib/require-user";
import FeaturedListingButton from "@/components/FeaturedListingButton";

export const metadata: Metadata = {
  title: "Dashboard | Ownward Hub",
  description: "Manage your business listing drafts, account settings, and secure deal rooms.",
};

interface SearchParams {
  success?: string;
  featured?: string;
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
    .select(
      "id,user_id,business_name,slug,category,location,status,is_public,published_at,created_at,featured_until,asking_price,annual_revenue,summary"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch seller-side conversation stats (for listings they own)
  const listingIds = (listings ?? []).map((l) => l.id);
  let newInquiries = 0;
  let activeConversations = 0;
  let unreadMessages = 0;

  if (listingIds.length > 0) {
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, status, last_message_at, seller_last_read_at")
      .in("listing_id", listingIds)
      .eq("seller_id", user.id);

    if (convs) {
      newInquiries = convs.filter((c) => c.status === "new").length;
      activeConversations = convs.filter((c) =>
        ["new", "active", "qualified", "nda_requested", "deal_room"].includes(c.status)
      ).length;
      unreadMessages = convs.filter((c) => {
        if (!c.last_message_at) return false;
        if (!c.seller_last_read_at) return true;
        return new Date(c.last_message_at) > new Date(c.seller_last_read_at);
      }).length;
    }
  }

  const now = new Date();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Success / featured banners */}
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

      {params.featured === "processing" && (
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
          <p className="font-semibold">Payment received — promotion pending</p>
          <p className="text-sm text-amber-300/80 mt-1">
            Your featured listing will become active once Stripe confirms the payment.
            This usually takes a few seconds. Refresh this page to see the updated status.
          </p>
        </div>
      )}
      {params.featured === "canceled" && (
        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-300">
          <p className="font-semibold">Checkout canceled</p>
          <p className="text-sm text-slate-400 mt-1">
            Your listing was not featured. You can try again at any time.
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
            Your Business Listings &amp; Vault
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
            {listings?.map((listing) => {
              const isActiveFeatured =
                listing.featured_until &&
                new Date(listing.featured_until) > now;

              const featuredUntilDate = listing.featured_until
                ? new Date(listing.featured_until)
                : null;

              const daysRemaining = featuredUntilDate
                ? Math.ceil(
                    (featuredUntilDate.getTime() - now.getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : 0;

              return (
                <article
                  key={listing.id}
                  className={`flex flex-col justify-between rounded-xl border bg-slate-900 p-6 ${
                    isActiveFeatured
                      ? "border-amber-500/40"
                      : "border-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                        {listing.category}
                      </span>
                      <div className="flex items-center gap-2">
                        {isActiveFeatured && (
                          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                            ★ Featured
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {new Date(listing.created_at).toLocaleDateString()}
                        </span>
                      </div>
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

                    {/* Featured promotion info */}
                    {isActiveFeatured && featuredUntilDate && (
                      <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
                        <p>
                          Featured until{" "}
                          {featuredUntilDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {daysRemaining > 0 && (
                            <span className="ml-1 text-amber-400/70">
                              ({daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining)
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Draft/unpublished: explain they must publish first */}
                    {listing.status !== "published" && (
                      <p className="mt-4 text-xs text-slate-500">
                        Publish this listing to enable featured placement.
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

                      {/* Feature / Featured badge */}
                      {listing.status === "published" && (
                        isActiveFeatured ? null : (
                          <FeaturedListingButton listingId={listing.id} />
                        )
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
              );
            })}
          </div>
        )}
      </section>

      {/* Seller: Buyer Interest Section */}
      {listingIds.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Buyer Interest</h2>
            <Link
              href="/messages"
              className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              View all messages →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider">New inquiries</p>
              <p className="mt-2 text-3xl font-bold text-white">{newInquiries}</p>
              <p className="mt-1 text-sm text-slate-400">Awaiting your reply</p>
            </div>
            <div className={`rounded-xl border p-5 ${unreadMessages > 0 ? "border-cyan-500/30 bg-cyan-400/5" : "border-slate-800 bg-slate-900"}`}>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Unread messages</p>
              <p className={`mt-2 text-3xl font-bold ${unreadMessages > 0 ? "text-cyan-300" : "text-white"}`}>
                {unreadMessages}
              </p>
              <p className="mt-1 text-sm text-slate-400">Across all conversations</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Active conversations</p>
              <p className="mt-2 text-3xl font-bold text-white">{activeConversations}</p>
              <p className="mt-1 text-sm text-slate-400">Open buyer discussions</p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
