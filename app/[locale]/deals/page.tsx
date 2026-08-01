import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/require-user";

export const metadata: Metadata = {
  title: "Deal Rooms | Ownward",
  description:
    "Organize business acquisition discussions, documents, offers, due diligence, and closing tasks.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Label maps
// ─────────────────────────────────────────────────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
  information_review: "Information review",
  due_diligence: "Due diligence",
  offer_review: "Offer review",
  closing: "Closing",
  completed: "Completed",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  closed: "Closed",
  withdrawn: "Withdrawn",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  paused: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  closed: "text-slate-400 bg-slate-800 border-slate-700",
  withdrawn: "text-rose-400 bg-rose-400/10 border-rose-400/30",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default async function DealsPage() {
  const { supabase, user } = await requireUser();

  // ── Fetch deal rooms where the user is an active member ──────────────────
  const { data: memberRows, error: memberError } = await supabase
    .from("deal_room_members")
    .select("deal_room_id")
    .eq("user_id", user.id)
    .eq("membership_status", "active");

  const dealRoomIds = (memberRows ?? []).map((r) => r.deal_room_id as string);

  interface DealRoomRow {
    id: string;
    title: string | null;
    stage: string;
    status: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    created_at: string;
    updated_at: string;
    business_listings: { business_name: string; slug: string | null } | null;
  }

  let rooms: DealRoomRow[] = [];
  let openRequests = 0;
  let totalDocs = 0;

  if (!memberError && dealRoomIds.length > 0) {
    const { data: roomData } = await supabase
      .from("deal_rooms")
      .select(`
        id, title, stage, status, listing_id, buyer_id, seller_id,
        created_at, updated_at,
        business_listings ( business_name, slug )
      `)
      .in("id", dealRoomIds)
      .order("updated_at", { ascending: false });

    rooms = (roomData ?? []) as unknown as DealRoomRow[];

    // Count open requests across all rooms
    const { count: reqCount } = await supabase
      .from("deal_room_requests")
      .select("id", { count: "exact", head: true })
      .in("deal_room_id", dealRoomIds)
      .eq("status", "open");

    // Count non-deleted documents
    const { count: docCount } = await supabase
      .from("deal_room_documents")
      .select("id", { count: "exact", head: true })
      .in("deal_room_id", dealRoomIds)
      .is("deleted_at", null);

    openRequests = reqCount ?? 0;
    totalDocs = docCount ?? 0;
  }

  const activeRooms = rooms.filter((r) => r.status === "active").length;

  // ── Fetch other participant profiles ─────────────────────────────────────
  const otherIds = Array.from(
    new Set(
      rooms.map((r) => (r.buyer_id === user.id ? r.seller_id : r.buyer_id))
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
        (profiles as Array<{ id: string; full_name: string | null }>).map(
          (p) => [p.id, p]
        )
      );
    }
  }

  // ── Per-room open request counts ─────────────────────────────────────────
  const roomRequestCounts: Record<string, number> = {};
  const roomDocCounts: Record<string, number> = {};
  if (dealRoomIds.length > 0) {
    const { data: reqRows } = await supabase
      .from("deal_room_requests")
      .select("deal_room_id")
      .in("deal_room_id", dealRoomIds)
      .eq("status", "open");
    if (reqRows) {
      for (const r of reqRows) {
        roomRequestCounts[r.deal_room_id] = (roomRequestCounts[r.deal_room_id] ?? 0) + 1;
      }
    }

    const { data: docRows } = await supabase
      .from("deal_room_documents")
      .select("deal_room_id")
      .in("deal_room_id", dealRoomIds)
      .is("deleted_at", null);
    if (docRows) {
      for (const d of docRows) {
        roomDocCounts[d.deal_room_id] = (roomDocCounts[d.deal_room_id] ?? 0) + 1;
      }
    }
  }

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Ownward Hub Deal Room
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Organize your business acquisition
            </h1>
            <p className="mt-3 max-w-3xl text-slate-400">
              Keep participants, confidential documents, questions, offers,
              due-diligence tasks, and closing steps organized in one
              transaction workspace.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Active deals</p>
            <p className="mt-2 text-3xl font-bold text-white">{activeRooms}</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Open requests</p>
            <p className="mt-2 text-3xl font-bold text-amber-400">{openRequests}</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Documents shared</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">{totalDocs}</p>
          </article>
        </div>

        {/* Deal rooms list */}
        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                Current transactions
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">Your Deal Rooms</h2>
            </div>
            <Link
              href="/buy"
              className="rounded-lg border border-cyan-400 px-4 py-2 text-center text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              Explore listings
            </Link>
          </div>

          {rooms.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-6 py-14 text-center">
              <h3 className="text-xl font-semibold text-white">No active Deal Rooms</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
                A Deal Room is created by the seller from an active conversation.
                It gives both parties a private workspace for documents, requests,
                and due-diligence tasks.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/messages"
                  className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  View conversations
                </Link>
                <Link
                  href="/buy"
                  className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
                >
                  Browse businesses
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {rooms.map((room) => {
                const listing =
                  (Array.isArray(room.business_listings)
                    ? room.business_listings[0]
                    : room.business_listings) as {
                    business_name: string;
                    slug: string | null;
                  } | null;
                const otherId =
                  room.buyer_id === user.id ? room.seller_id : room.buyer_id;
                const otherName =
                  profileMap[otherId]?.full_name ?? "Ownward member";
                const isSeller = room.seller_id === user.id;
                const reqCount = roomRequestCounts[room.id] ?? 0;
                const docCount = roomDocCounts[room.id] ?? 0;

                return (
                  <li
                    key={room.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-5 transition hover:border-slate-700"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-white truncate">
                          {room.title ?? listing?.business_name ?? "Deal Room"}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {isSeller ? "Buyer" : "Seller"}:{" "}
                          <span className="text-slate-200">{otherName}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLORS[room.status] ?? "text-slate-400 bg-slate-800 border-slate-700"}`}
                        >
                          {STATUS_LABELS[room.status] ?? room.status}
                        </span>
                        <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs text-slate-300">
                          {STAGE_LABELS[room.stage] ?? room.stage}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      {reqCount > 0 && (
                        <span className="text-amber-400">
                          {reqCount} open request{reqCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      <span>{docCount} document{docCount !== 1 ? "s" : ""}</span>
                      <span>Updated {formatDate(room.updated_at)}</span>
                    </div>

                    <div className="mt-4">
                      <Link
                        href={`/deals/${room.id}`}
                        className="inline-block rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                      >
                        Open Deal Room
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Footer links */}
        <section className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Ownward Hub Vault
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              Prepare your business records
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Organize financial, legal, and operating records before deciding
              which documents to share with a potential buyer.
            </p>
            <Link
              href="/documents"
              className="mt-5 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              Open Ownward Hub Vault
            </Link>
          </article>

          <article className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">
              Confidentiality
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              Protect sensitive business information
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Do not share passwords, unrestricted bank information, personal
              identification numbers, or unprotected customer data until
              identity, authorization, security, and professional requirements
              have been appropriately addressed.
            </p>
          </article>
        </section>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="font-semibold text-white">Professional and regulated services</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Ownward Hub&apos;s Deal Room is organizational software. Legal
            agreements, business brokerage, securities, financing, escrow, tax
            decisions, valuations, negotiations, and ownership transfers may
            require licensed or qualified professionals.
          </p>
        </section>
      </section>
    </main>
  );
}
