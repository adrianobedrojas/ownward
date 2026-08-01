import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/require-user";

export const metadata: Metadata = {
  title: "Messages | Ownward",
  description: "Your Ownward message inbox.",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New inquiry",
  active: "Active",
  qualified: "Buyer qualification",
  nda_requested: "NDA requested",
  deal_room: "Deal room",
  not_a_fit: "Not a fit",
  archived: "Archived",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default async function MessagesPage() {
  const { supabase, user } = await requireUser();

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      status,
      last_message_at,
      buyer_last_read_at,
      seller_last_read_at,
      created_at,
      business_listings (
        business_name,
        slug
      )
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-300">
          <p className="font-semibold">Could not load messages.</p>
          <p className="mt-1 text-sm opacity-80">Please try again later.</p>
        </div>
      </main>
    );
  }

  // Collect other participant ids for profile lookups
  const otherIds = Array.from(
    new Set(
      (conversations ?? []).map((c) =>
        c.buyer_id === user.id ? c.seller_id : c.buyer_id
      )
    )
  );

  let profileMap: Record<string, { full_name: string | null }> = {};
  if (otherIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", otherIds);
    if (profiles) {
      profileMap = Object.fromEntries(
        profiles.map((p: { id: string; full_name: string | null }) => [p.id, p])
      );
    }
  }

  // Fetch latest message per conversation
  const convIds = (conversations ?? []).map((c) => c.id);
  const latestMsgMap: Record<string, { body: string; created_at: string }> = {};
  if (convIds.length > 0) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    if (msgs) {
      for (const m of msgs) {
        if (!latestMsgMap[m.conversation_id]) {
          latestMsgMap[m.conversation_id] = { body: m.body, created_at: m.created_at };
        }
      }
    }
  }

  // Count unread
  function isUnread(c: { buyer_id: string; seller_id: string; last_message_at: string | null; buyer_last_read_at: string | null; seller_last_read_at: string | null }) {
    const lastRead = c.buyer_id === user.id ? c.buyer_last_read_at : c.seller_last_read_at;
    if (!c.last_message_at) return false;
    if (!lastRead) return true;
    return new Date(c.last_message_at) > new Date(lastRead);
  }

  const list = (conversations ?? []) as unknown as Array<{
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    status: string;
    last_message_at: string | null;
    buyer_last_read_at: string | null;
    seller_last_read_at: string | null;
    created_at: string;
    business_listings: { business_name: string; slug: string | null } | { business_name: string; slug: string | null }[] | null;
  }>;

  const totalUnread = list.filter(isUnread).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">Messages</h1>
          {totalUnread > 0 && (
            <p className="mt-1 text-sm text-slate-400">
              {totalUnread} unread conversation{totalUnread !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
          <p className="text-lg font-semibold text-slate-300">No conversations yet</p>
          <p className="mt-2 text-sm text-slate-500">
            When you contact a seller or a buyer reaches out, conversations will appear here.
          </p>
          <Link
            href="/buy"
            className="mt-6 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
          >
            Browse businesses
          </Link>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Conversations">
          {list.map((conv) => {
            const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
            const otherProfile = profileMap[otherId];
            const otherName = otherProfile?.full_name || "Ownward member";
            const isBuyer = conv.buyer_id === user.id;
            const latestMsg = latestMsgMap[conv.id];
            const unread = isUnread(conv);
            const listingRaw = conv.business_listings;
            const listing = (Array.isArray(listingRaw) ? listingRaw[0] : listingRaw) as {
              business_name: string;
              slug: string | null;
            } | null;

            return (
              <li key={conv.id}>
                <Link
                  href={`/messages/${conv.id}`}
                  className={`flex items-start gap-4 rounded-xl border p-4 transition ${
                    unread
                      ? "border-cyan-500/30 bg-cyan-400/5 hover:bg-cyan-400/10"
                      : "border-slate-800 bg-slate-900 hover:bg-slate-800"
                  }`}
                  aria-label={`Conversation about ${listing?.business_name ?? "a listing"} with ${otherName}`}
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0">
                    {unread ? (
                      <span
                        className="block h-2.5 w-2.5 rounded-full bg-cyan-400"
                        aria-label="Unread"
                      />
                    ) : (
                      <span className="block h-2.5 w-2.5 rounded-full bg-slate-700" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate font-semibold ${unread ? "text-white" : "text-slate-200"}`}>
                        {listing?.business_name ?? "Listing"}
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {formatDate(conv.last_message_at ?? conv.created_at)}
                      </span>
                    </div>

                    <p className="mt-0.5 text-sm text-slate-400">
                      {isBuyer ? `Seller: ${otherName}` : `Buyer: ${otherName}`}
                    </p>

                    {latestMsg && (
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {latestMsg.body}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                        {STATUS_LABELS[conv.status] ?? conv.status}
                      </span>
                      {listing?.slug && (
                        <span
                          className="text-xs text-cyan-500 hover:underline"
                          onClick={(e) => e.preventDefault()}
                        >
                          <Link href={`/b/${listing.slug}`} onClick={(e) => e.stopPropagation()}>
                            View listing
                          </Link>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
