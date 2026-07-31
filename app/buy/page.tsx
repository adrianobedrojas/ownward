import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { capitalizeFirst } from "@/lib/documents";

export const metadata: Metadata = {
  title: "Buy Businesses | Ownward Hub",
  description:
    "Discover small businesses for sale and find what you want to own next.",
};

interface SearchParams {
  search?: string;
  category?: string;
  location?: string;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const searchQuery = params.search?.trim() || "";
  const categoryQuery = params.category || "";
  const locationQuery = params.location?.trim() || "";

  const supabase = await createClient();
  const now = new Date().toISOString();

  // Base filter: public + published
  let query = supabase
    .from("business_listings")
    .select("*")
    .eq("is_public", true)
    .eq("status", "published");

  if (searchQuery) {
    query = query.ilike("business_name", `%${searchQuery}%`);
  }

  if (categoryQuery) {
    query = query.eq("category", categoryQuery);
  }

  if (locationQuery) {
    query = query.ilike("location", `%${locationQuery}%`);
  }

  const { data: allListings = [], error } = await query
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching marketplace listings:", error.message);
  }

  const listings = allListings ?? [];

  // Split into featured (active promotion) and normal
  const featuredListings = listings.filter(
    (l) => l.featured_until && new Date(l.featured_until) > new Date(now)
  );
  const featuredIds = new Set(featuredListings.map((l) => l.id));
  const normalListings = listings.filter((l) => !featuredIds.has(l.id));

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Ownward Market
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Businesses for sale
            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Discover small-business opportunities and find what you want to
              own next.
            </p>
          </div>

          <Link
            href="/sell"
            className="rounded-lg bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Sell a business
          </Link>
        </div>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-white">
            Search opportunities
          </h2>

          <form method="get" className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <label
                htmlFor="search"
                className="block text-sm font-semibold text-slate-300"
              >
                Business
              </label>

              <input
                id="search"
                name="search"
                type="search"
                defaultValue={searchQuery}
                placeholder="Search businesses"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-semibold text-slate-300"
              >
                Category
              </label>

              <select
                id="category"
                name="category"
                defaultValue={categoryQuery}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300"
              >
                <option value="">All categories</option>
                <option value="services">Services</option>
                <option value="food">Food and beverage</option>
                <option value="retail">Retail</option>
                <option value="construction">Construction</option>
                <option value="marketing">Marketing</option>
                <option value="technology">Technology</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-semibold text-slate-300"
              >
                Location
              </label>

              <input
                id="location"
                name="location"
                type="text"
                defaultValue={locationQuery}
                placeholder="City, state, or remote"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Search
              </button>
            </div>
          </form>
        </section>

        {/* Featured listings section */}
        {featuredListings.length > 0 && (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Featured opportunities
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Promoted listings from verified sellers.
                </p>
              </div>
              <p className="text-sm text-slate-500">
                {featuredListings.length} featured
              </p>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {featuredListings.map((business) => (
                <article
                  key={business.id}
                  className="flex flex-col rounded-xl border border-amber-500/40 bg-slate-900 p-6 ring-1 ring-amber-500/10 transition hover:border-amber-400"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                      {business.category
                        ? capitalizeFirst(business.category)
                        : "Other"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                        ★ Featured
                      </span>
                      <span className="text-xs text-slate-500">Promoted</span>
                    </div>
                  </div>

                  <h3 className="mt-5 text-xl font-semibold text-white">
                    {business.business_name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {business.location}
                  </p>

                  <p className="mt-4 flex-1 text-sm leading-6 text-slate-300">
                    {business.summary || "No summary provided yet."}
                  </p>

                  <div className="mt-6 grid grid-cols-3 gap-3 border-y border-slate-800 py-4">
                    <div>
                      <p className="text-xs text-slate-500">Asking price</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {business.asking_price
                          ? `$${Number(business.asking_price).toLocaleString()}`
                          : "Not set"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Revenue</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {business.annual_revenue
                          ? `$${Number(business.annual_revenue).toLocaleString()}`
                          : "Not set"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Established</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-400">
                        {business.year_established || "N/A"}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/b/${business.slug}`}
                    className="mt-5 rounded-lg bg-amber-400/10 px-4 py-3 text-center text-sm font-semibold text-amber-300 transition hover:bg-amber-400 hover:text-slate-950"
                  >
                    View details
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* All business opportunities section */}
        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                All business opportunities
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Active listings available on the Ownward marketplace.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {listings.length} listing{listings.length !== 1 ? "s" : ""} found
            </p>
          </div>

          {listings.length === 0 ? (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
              <p className="text-lg font-semibold text-white">No businesses found</p>
              <p className="mt-2 text-sm text-slate-400">
                Try adjusting your search filters or check back later for new opportunities.
              </p>
            </div>
          ) : normalListings.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">
              All matching listings are featured above.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {normalListings.map((business) => (
                <article
                  key={business.id}
                  className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-400"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                      {business.category
                        ? capitalizeFirst(business.category)
                        : "Other"}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-semibold text-white">
                    {business.business_name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {business.location}
                  </p>

                  <p className="mt-4 flex-1 text-sm leading-6 text-slate-300">
                    {business.summary || "No summary provided yet."}
                  </p>

                  <div className="mt-6 grid grid-cols-3 gap-3 border-y border-slate-800 py-4">
                    <div>
                      <p className="text-xs text-slate-500">Asking price</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {business.asking_price
                          ? `$${Number(business.asking_price).toLocaleString()}`
                          : "Not set"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Revenue</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {business.annual_revenue
                          ? `$${Number(business.annual_revenue).toLocaleString()}`
                          : "Not set"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Established</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-400">
                        {business.year_established || "N/A"}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/b/${business.slug}`}
                    className="mt-5 rounded-lg bg-cyan-400/10 px-4 py-3 text-center text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950"
                  >
                    View details
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              For buyers
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white">
              Find what you want to own next
            </h2>

            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li>Search businesses by category, location, and price.</li>
              <li>Compare financial and operating information.</li>
              <li>Request access to confidential business documents.</li>
              <li>Organize offers and due-diligence tasks.</li>
            </ul>
            <Link
              href="/guide/buy/sba-loan-qualification"
              className="mt-6 inline-block text-sm font-semibold text-cyan-300 hover:underline"
            >
              Explore SBA loan qualification and lender readiness &rarr;
            </Link>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              For sellers
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white">
              Prepare and present your business
            </h2>

            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li>Create a confidential business listing.</li>
              <li>Organize financial and operating records.</li>
              <li>Prepare documents for buyer due diligence.</li>
              <li>Connect with interested potential buyers.</li>
            </ul>

            <Link
              href="/sell"
              className="mt-6 inline-block rounded-lg border border-cyan-400 px-5 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              Start preparing to sell
            </Link>
          </article>
        </section>
      </section>
    </main>
  );
}
