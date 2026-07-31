import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { capitalizeFirst } from "@/lib/documents";

export const metadata: Metadata = {
  title: "Ownward Hub | All-in-One Business Platform",
  description:
    "Manage your business, understand its value, prepare for a future sale, or discover your next opportunity—all through one connected platform.",
};

export default async function HomePage() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // Fetch up to 3 active featured listings for the homepage preview
  const { data: featuredListings = [] } = await supabase
    .from("business_listings")
    .select("id, slug, business_name, category, location, summary, asking_price, annual_revenue, featured_until")
    .eq("is_public", true)
    .eq("status", "published")
    .gt("featured_until", now)
    .order("featured_until", { ascending: false })
    .limit(3);

  // If fewer than 3 featured, fill with newest non-featured published listings
  const featuredIds = new Set((featuredListings ?? []).map((l) => l.id));
  let fillListings: typeof featuredListings = [];

  if ((featuredListings ?? []).length < 3) {
    const needed = 3 - (featuredListings ?? []).length;
    const { data: newer = [] } = await supabase
      .from("business_listings")
      .select("id, slug, business_name, category, location, summary, asking_price, annual_revenue, featured_until")
      .eq("is_public", true)
      .eq("status", "published")
      .not("id", "in", `(${[...featuredIds, "00000000-0000-0000-0000-000000000000"].join(",")})`)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(needed);
    fillListings = newer ?? [];
  }

  const previewListings = [...(featuredListings ?? []), ...fillListings];
  const hasLiveListings = previewListings.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* 1. Hero Section */}
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              All-in-One Business Platform
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Run, grow, buy or sell a business—all in one place.
            </h1>
            <p className="mt-4 text-lg leading-7 text-slate-300">
              Manage your business, understand its value, prepare for a future sale, or discover your next opportunity—all through one connected platform.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/buy"
                className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Explore businesses
              </Link>
              <Link
                href="/sell"
                className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 font-semibold text-white transition hover:border-cyan-400 hover:bg-slate-800"
              >
                Sell a business
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border border-slate-800 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                Run your business
              </Link>
            </div>

            <div className="mt-5">
              <Link
                href="/guide"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:underline"
              >
                Learn how Ownward Hub works &rarr;
              </Link>
            </div>
          </div>

          {/* Right-Side Visual Product Preview */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs font-mono text-slate-400">ownwardhub.com/preview</span>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-2 rounded-lg bg-slate-950 p-1 text-center text-xs font-semibold text-slate-400">
              <span className="rounded-md bg-cyan-400/10 py-2 text-cyan-300">Run</span>
              <span className="py-2 hover:text-white">Grow</span>
              <span className="py-2 hover:text-white">Buy</span>
              <span className="py-2 hover:text-white">Sell</span>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Estimated Business Value</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">$845,000</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <span>Sale-readiness score: 82%</span>
                  <span className="text-cyan-400 font-medium">Strong Operations</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs text-slate-400">Monthly Revenue</p>
                  <p className="mt-1 text-lg font-semibold text-white">$42,500</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs text-slate-400">Vault Documents</p>
                  <p className="mt-1 text-lg font-semibold text-cyan-300">24 Uploaded</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Ownership Journey (Routing System) */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Choose Your Path</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Where are you on your business journey?</h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-cyan-400">
            <div>
              <span className="inline-block rounded-lg bg-cyan-400/10 p-3 text-2xl">🏢</span>
              <h3 className="mt-4 text-xl font-semibold text-white">Run</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Organize customers, documents, invoices, financial records, and daily operations.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-lg bg-slate-800 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Explore business tools
            </Link>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-cyan-400">
            <div>
              <span className="inline-block rounded-lg bg-cyan-400/10 p-3 text-2xl">📈</span>
              <h3 className="mt-4 text-xl font-semibold text-white">Grow</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Track performance, identify value drivers, and build a stronger business.
              </p>
            </div>
            <Link
              href="/pricing"
              className="mt-6 inline-block rounded-lg bg-slate-800 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Explore growth tools
            </Link>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-cyan-400">
            <div>
              <span className="inline-block rounded-lg bg-cyan-400/10 p-3 text-2xl">🔍</span>
              <h3 className="mt-4 text-xl font-semibold text-white">Buy</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Discover opportunities, compare businesses, and organize due diligence.
              </p>
            </div>
            <Link
              href="/buy"
              className="mt-6 inline-block rounded-lg bg-slate-800 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Browse businesses
            </Link>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-cyan-400">
            <div>
              <span className="inline-block rounded-lg bg-cyan-400/10 p-3 text-2xl">🤝</span>
              <h3 className="mt-4 text-xl font-semibold text-white">Sell</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Understand your value, prepare documentation, and connect with potential buyers.
              </p>
            </div>
            <Link
              href="/sell"
              className="mt-6 inline-block rounded-lg bg-slate-800 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Prepare to sell
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Featured Opportunities (Live Marketplace Preview) */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 border-t border-slate-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Marketplace Preview</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Explore business opportunities</h2>
          </div>
          <Link href="/buy" className="text-sm font-semibold text-cyan-400 hover:underline">
            View all listings &rarr;
          </Link>
        </div>

        {!hasLiveListings ? (
          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
            <p className="text-lg font-semibold text-white">No listings yet</p>
            <p className="mt-2 text-sm text-slate-400">
              Be the first to list your business on Ownward Hub.
            </p>
            <Link
              href="/sell"
              className="mt-6 inline-block rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              List your business
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {previewListings.map((listing) => {
              const isFeatured =
                listing.featured_until &&
                new Date(listing.featured_until) > new Date(now);
              return (
                <article
                  key={listing.id}
                  className={`rounded-2xl border bg-slate-900/60 p-6 ${
                    isFeatured
                      ? "border-amber-500/40 ring-1 ring-amber-500/10"
                      : "border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                      {listing.category ? capitalizeFirst(listing.category) : "Other"}
                    </span>
                    {isFeatured && (
                      <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                        ★ Featured
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">
                    {listing.business_name}
                  </h3>
                  {listing.location && (
                    <p className="mt-1 text-xs text-slate-400">{listing.location}</p>
                  )}
                  <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                    {listing.summary || ""}
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Asking Price</p>
                      <p className="font-semibold text-white">
                        {listing.asking_price
                          ? `$${Number(listing.asking_price).toLocaleString()}`
                          : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Annual Revenue</p>
                      <p className="font-semibold text-white">
                        {listing.annual_revenue
                          ? `$${Number(listing.annual_revenue).toLocaleString()}`
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                  {listing.slug && (
                    <Link
                      href={`/b/${listing.slug}`}
                      className="mt-5 block rounded-lg bg-cyan-400/10 px-4 py-2.5 text-center text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950"
                    >
                      View details
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Platform Capabilities */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Platform Capabilities</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Everything you need in one unified ecosystem</h2>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
            <h3 className="text-xl font-bold text-white">Business Operations</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Manage CRM relationships, generate professional invoices, track daily tasks, handle business money, and secure records in your Vault.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
            <h3 className="text-xl font-bold text-white">Business Value</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Organize your financial metrics, track valuation insights, monitor value drivers, and measure your ongoing sale readiness.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
            <h3 className="text-xl font-bold text-white">Transactions</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Publish confidential listings, connect with verified buyers, manage due-diligence requests, and collaborate inside secure deal rooms.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Free Interactive Resource Banner */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 p-8 sm:p-12 text-center shadow-xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">How prepared is your business for what comes next?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            Take our free interactive assessment to check your documentation, financial organization, and sale readiness.
          </p>
          <Link
            href="/valuation"
            className="mt-6 inline-block rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Take the free sale-readiness check
          </Link>
        </div>
      </section>

      {/* 6. Learn with Ownward (Featured Articles) */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 border-t border-slate-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Learn with Ownward Hub</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Practical guidance and real-world lessons</h2>
          </div>
          <Link href="/guide" className="text-sm font-semibold text-cyan-400 hover:underline">
            Explore the Ownward Guide &rarr;
          </Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-cyan-400 uppercase">Valuation Guide</span>
              <h3 className="mt-2 font-bold text-white">How Much Is Your Business Worth?</h3>
              <p className="mt-2 text-xs text-slate-400">Learn what affects value and how buyers evaluate your business.</p>
            </div>
            <Link href="/guide/value" className="mt-4 text-xs font-semibold text-cyan-300 hover:underline">
              Read article &rarr;
            </Link>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-cyan-400 uppercase">Selling Guide</span>
              <h3 className="mt-2 font-bold text-white">Preparing Your Business for Sale</h3>
              <p className="mt-2 text-xs text-slate-400">Understand the records, systems, and documents buyers request.</p>
            </div>
            <Link href="/guide/sell" className="mt-4 text-xs font-semibold text-cyan-300 hover:underline">
              Read article &rarr;
            </Link>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-cyan-400 uppercase">Financing Guide</span>
              <h3 className="mt-2 font-bold text-white">Could You Qualify for an SBA Loan?</h3>
              <p className="mt-2 text-xs text-slate-400">Understand eligibility, lender underwriting, residency rules, and the documents buyers should prepare.</p>
            </div>
            <Link href="/guide/buy/sba-loan-qualification" className="mt-4 text-xs font-semibold text-cyan-300 hover:underline">
              Read article &rarr;
            </Link>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-cyan-400 uppercase">Owner Story</span>
              <h3 className="mt-2 font-bold text-white">The Owner-Dependence Problem</h3>
              <p className="mt-2 text-xs text-slate-400">Why a profitable business can still be difficult to transfer.</p>
            </div>
            <Link href="/guide/stories" className="mt-4 text-xs font-semibold text-cyan-300 hover:underline">
              Read story &rarr;
            </Link>
          </article>
        </div>
      </section>

      {/* 7. How Ownward Works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Simple Process</p>
          <h2 className="mt-2 text-3xl font-bold text-white">How Ownward Hub works</h2>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <div className="text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/10 font-bold text-cyan-300 text-lg">1</span>
            <h3 className="mt-4 font-bold text-white text-lg">Create your profile</h3>
            <p className="mt-2 text-sm text-slate-400">Set up your business or buyer profile in minutes.</p>
          </div>
          <div className="text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/10 font-bold text-cyan-300 text-lg">2</span>
            <h3 className="mt-4 font-bold text-white text-lg">Organize & explore</h3>
            <p className="mt-2 text-sm text-slate-400">Organize company records or browse verified market opportunities.</p>
          </div>
          <div className="text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/10 font-bold text-cyan-300 text-lg">3</span>
            <h3 className="mt-4 font-bold text-white text-lg">Execute with clarity</h3>
            <p className="mt-2 text-sm text-slate-400">Grow, prepare, buy, or sell with complete confidence.</p>
          </div>
        </div>
      </section>

      {/* 8. Pricing Preview */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Transparent Plans</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Choose the right plan for your goals</h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Starter</h3>
              <p className="mt-4 text-3xl font-bold text-white">$5<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="mt-2 text-sm text-slate-400">Essential organization and document vault features.</p>
            </div>
            <Link href="/pricing" className="mt-8 block rounded-lg border border-slate-700 py-3 text-center text-sm font-semibold text-white hover:border-cyan-400 transition">
              View Starter
            </Link>
          </div>

          <div className="rounded-2xl border border-cyan-400 bg-slate-900 p-8 flex flex-col justify-between shadow-xl shadow-cyan-950/20">
            <div>
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">Most Popular</span>
              <h3 className="mt-4 text-lg font-bold text-white">Builder</h3>
              <p className="mt-4 text-3xl font-bold text-white">$10<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="mt-2 text-sm text-slate-400">Advanced growth tracking, valuation tools, and CRM workflows.</p>
            </div>
            <Link href="/pricing" className="mt-8 block rounded-lg bg-cyan-400 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-cyan-300 transition">
              View Builder
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Pro</h3>
              <p className="mt-4 text-3xl font-bold text-white">$20<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="mt-2 text-sm text-slate-400">Full transaction suite, deal rooms, and buyer matching.</p>
            </div>
            <Link href="/pricing" className="mt-8 block rounded-lg border border-slate-700 py-3 text-center text-sm font-semibold text-white hover:border-cyan-400 transition">
              View Pro
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Final Call to Action */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 text-center border-t border-slate-900">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Own what comes next.</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-cyan-400 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Create account
          </Link>
          <Link
            href="/buy"
            className="rounded-lg border border-slate-700 bg-slate-900 px-6 py-3.5 font-semibold text-white transition hover:border-cyan-400 hover:bg-slate-800"
          >
            Explore businesses
          </Link>
        </div>
      </section>
    </div>
  );
}
