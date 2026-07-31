import type { Metadata } from "next";
import Link from "next/link";
import { deleteListingDraft, publishListing, unpublishListing } from "./actions";
import { requireUser } from "@/lib/require-user";
import FeaturedListingButton from "@/components/FeaturedListingButton";
import { getUserBillingState } from "@/lib/billing";
import { getNextBestAction } from "@/lib/launchpad/next-best-action";

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

  // ── Billing & Launchpad data ─────────────────────────────────────────────
  const billing = await getUserBillingState(supabase, user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_business_id")
    .eq("id", user.id)
    .maybeSingle();

  const activeBizId = profile?.active_business_id;

  // Business data
  const { count: businessCount } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .is("deleted_at", null);

  const { data: activeBizData } = activeBizId
    ? await supabase
        .from("businesses")
        .select("id, name, profile_completion")
        .eq("id", activeBizId)
        .maybeSingle()
    : { data: null };

  // Milestones
  const { count: milestoneCount } = await supabase
    .from("business_milestones")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  const { data: oldestMilestone } = await supabase
    .from("business_milestones")
    .select("title")
    .eq("user_id", user.id)
    .in("status", ["planned", "in_progress"])
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Documents
  const { count: docCount } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  // Storage
  const { data: storageDocs } = await supabase
    .from("documents")
    .select("filesize")
    .eq("user_id", user.id)
    .is("deleted_at", null);
  const usedBytes = (storageDocs ?? []).reduce(
    (s, d) => s + Number(d.filesize ?? 0),
    0
  );

  // Health assessment
  const { count: healthCount } = await supabase
    .from("business_health_assessments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: latestHealth } = await supabase
    .from("business_health_assessments")
    .select("overall_score, category_scores")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Lowest health category
  let lowestHealthCategory: string | null = null;
  if (latestHealth?.category_scores) {
    const scores = latestHealth.category_scores as Record<string, number>;
    const sorted = Object.entries(scores).sort(([, a], [, b]) => a - b);
    if (sorted.length > 0) lowestHealthCategory = sorted[0][0];
  }

  // Valuation
  const { count: valuationCount } = await supabase
    .from("valuation_reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "calculated");

  // Monthly milestone usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count: milestoneMonthCount } = await supabase
    .from("business_milestones")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth.toISOString());

  // Next Best Action
  const nba = getNextBestAction({
    businessCount: businessCount ?? 0,
    businessCompletion: activeBizData?.profile_completion ?? null,
    hasHealthAssessment: (healthCount ?? 0) > 0,
    milestoneCount: milestoneCount ?? 0,
    documentCount: docCount ?? 0,
    hasValuation: (valuationCount ?? 0) > 0,
    oldestIncompleteMilestone: oldestMilestone?.title ?? null,
    lowestHealthCategory,
  });

  // ── Listings ─────────────────────────────────────────────────────────────

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

      {/* ── Starter Launchpad ─────────────────────────────────────────────── */}
      {billing.plan !== "free" && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              Starter Launchpad
            </h2>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-400 capitalize">
              {billing.plan} Plan
            </span>
          </div>

          {/* Next Best Action */}
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-5 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
              Next Best Action
            </p>
            <h3 className="text-lg font-bold text-white">{nba.title}</h3>
            <p className="text-sm text-slate-400 mt-1">{nba.description}</p>
            <Link
              href={nba.href}
              className="mt-3 inline-flex items-center rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 transition"
            >
              {nba.cta} →
            </Link>
          </div>

          {/* Quick stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Active Business */}
            <Link
              href="/business"
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-cyan-400/40 transition"
            >
              <p className="text-xs text-slate-500 uppercase tracking-wider">Business</p>
              <p className="mt-1 text-xl font-bold text-white truncate">
                {activeBizData?.name ?? (businessCount ?? 0) > 0 ? `${businessCount} workspace${(businessCount ?? 0) !== 1 ? "s" : ""}` : "None"}
              </p>
              {activeBizData && (
                <div className="mt-1.5 h-1 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-400"
                    style={{ width: `${activeBizData.profile_completion ?? 0}%` }}
                  />
                </div>
              )}
            </Link>

            {/* Health Score */}
            <Link
              href="/health"
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-cyan-400/40 transition"
            >
              <p className="text-xs text-slate-500 uppercase tracking-wider">Health</p>
              <p className="mt-1 text-xl font-bold text-white">
                {latestHealth?.overall_score != null
                  ? `${latestHealth.overall_score}/100`
                  : "–"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {(healthCount ?? 0) > 0 ? "Last score" : "Not assessed"}
              </p>
            </Link>

            {/* Milestones */}
            <Link
              href="/milestones"
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-cyan-400/40 transition"
            >
              <p className="text-xs text-slate-500 uppercase tracking-wider">Milestones</p>
              <p className="mt-1 text-xl font-bold text-white">{milestoneCount ?? 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {milestoneMonthCount ?? 0}/{billing.entitlements.milestoneMonthlyLimit} this month
              </p>
            </Link>

            {/* Documents */}
            <Link
              href="/documents"
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-cyan-400/40 transition"
            >
              <p className="text-xs text-slate-500 uppercase tracking-wider">Documents</p>
              <p className="mt-1 text-xl font-bold text-white">{docCount ?? 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                of {billing.entitlements.documentLimit}
              </p>
            </Link>

            {/* Storage */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Storage</p>
              <p className="mt-1 text-xl font-bold text-white">
                {usedBytes < 1024 * 1024
                  ? `${Math.round(usedBytes / 1024)} KB`
                  : `${(usedBytes / (1024 * 1024)).toFixed(1)} MB`}
              </p>
              <div className="mt-1.5 h-1 rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-400"
                  style={{
                    width: `${Math.min(100, (usedBytes / billing.entitlements.storageBytes) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Valuation */}
            <Link
              href="/valuation"
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-cyan-400/40 transition"
            >
              <p className="text-xs text-slate-500 uppercase tracking-wider">Valuation</p>
              <p className="mt-1 text-xl font-bold text-white">
                {(valuationCount ?? 0) > 0 ? "Generated" : "None"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 capitalize">
                {billing.entitlements.valuationLevel} tier
              </p>
            </Link>
          </div>
        </section>
      )}

      {/* Upgrade prompt for free users */}
      {billing.plan === "free" && (
        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold text-slate-300">
            Unlock the full Ownward toolkit
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Upgrade to Starter to get your Business Passport, Milestone Trail, Health Check, Valuation, and more.
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-flex items-center rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 transition"
          >
            See Plans →
          </Link>
        </section>
      )}

      {/* Bookkeeping workspace card */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-white mb-4">Bookkeeping</h2>
        <Link
          href="/money"
          className="block rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-cyan-400/40 transition group"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                Ownward Books
              </p>
              <h3 className="mt-2 text-lg font-bold text-white group-hover:text-cyan-300 transition">
                Bookkeeping workspace
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Track income, expenses, receipts, and invoices. Review monthly records and monitor financial health.
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-400 group-hover:bg-cyan-400/20 transition">
              Open Books →
            </span>
          </div>
        </Link>
      </section>

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
