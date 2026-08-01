import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import DealRoomClient from "./DealRoomClient";

export const metadata: Metadata = {
  title: "Deal Room | Ownward",
};

interface Props {
  params: Promise<{ dealRoomId: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DealRoomPage({ params }: Props) {
  const { dealRoomId } = await params;
  if (!UUID_RE.test(dealRoomId)) notFound();

  const { supabase, user } = await requireUser();

  // ── Load deal room ──────────────────────────────────────────────────────
  const { data: dealRoom, error: drError } = await supabase
    .from("deal_rooms")
    .select(`
      id, title, stage, status, listing_id, buyer_id, seller_id,
      conversation_id, created_at, updated_at, closed_at,
      business_listings ( business_name, slug )
    `)
    .eq("id", dealRoomId)
    .maybeSingle();

  if (drError || !dealRoom) notFound();

  // ── Verify active membership ────────────────────────────────────────────
  const { data: myMembership } = await supabase
    .from("deal_room_members")
    .select("id, role, membership_status")
    .eq("deal_room_id", dealRoomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!myMembership) {
    // User exists but has no membership row – unknown room
    notFound();
  }

  if (myMembership.membership_status === "removed") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-8">
          <h1 className="text-xl font-bold text-rose-300">Access removed</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your access to this Deal Room has been removed.
          </p>
          <Link
            href="/deals"
            className="mt-6 inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Back to Deal Rooms
          </Link>
        </div>
      </main>
    );
  }

  if (myMembership.membership_status !== "active") {
    notFound();
  }

  const isSeller = myMembership.role === "seller";

  // ── Load members ────────────────────────────────────────────────────────
  const { data: members } = await supabase
    .from("deal_room_members")
    .select("id, user_id, invited_email, role, membership_status, joined_at, created_at")
    .eq("deal_room_id", dealRoomId)
    .order("created_at", { ascending: true });

  // ── Load documents ──────────────────────────────────────────────────────
  const { data: documents } = await supabase
    .from("deal_room_documents")
    .select(
      "id, filename, filetype, filesize, category, description, uploaded_by, created_at"
    )
    .eq("deal_room_id", dealRoomId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // ── Load requests ───────────────────────────────────────────────────────
  const { data: requests } = await supabase
    .from("deal_room_requests")
    .select(
      "id, title, description, category, priority, status, due_date, created_by, assigned_to, created_at, updated_at, completed_at"
    )
    .eq("deal_room_id", dealRoomId)
    .order("created_at", { ascending: false });

  // ── Load activity ───────────────────────────────────────────────────────
  const { data: activity } = await supabase
    .from("deal_room_activity")
    .select("id, actor_id, event_type, metadata, created_at")
    .eq("deal_room_id", dealRoomId)
    .order("created_at", { ascending: false })
    .limit(50);

  // ── Load participant profiles ───────────────────────────────────────────
  const memberUserIds = (members ?? [])
    .map((m) => m.user_id as string | null)
    .filter((id): id is string => !!id);
  const actorIds = (activity ?? []).map((a) => a.actor_id as string);
  const allIds = Array.from(new Set([...memberUserIds, ...actorIds]));

  let profileMap: Record<string, { full_name: string | null }> = {};
  if (allIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", allIds);
    if (profiles) {
      profileMap = Object.fromEntries(
        (profiles as Array<{ id: string; full_name: string | null }>).map(
          (p) => [p.id, p]
        )
      );
    }
  }

  const listing = (
    Array.isArray(dealRoom.business_listings)
      ? dealRoom.business_listings[0]
      : dealRoom.business_listings
  ) as { business_name: string; slug: string | null } | null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Back link */}
      <Link
        href="/deals"
        className="text-sm text-slate-400 transition hover:text-slate-200"
      >
        ← Back to Deal Rooms
      </Link>

      {/* Header */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Ownward Deal Room
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              {dealRoom.title ?? listing?.business_name ?? "Deal Room"}
            </h1>
            {listing && (
              <p className="mt-1 text-sm text-slate-400">
                Listing:{" "}
                {listing.slug ? (
                  <Link
                    href={`/b/${listing.slug}`}
                    className="text-cyan-300 transition hover:underline"
                  >
                    {listing.business_name}
                  </Link>
                ) : (
                  <span className="text-slate-300">{listing.business_name}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/messages/${dealRoom.conversation_id}`}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              View conversation
            </Link>
          </div>
        </div>
      </div>

      {/* Client component handles tabs and interactive features */}
      <DealRoomClient
        dealRoomId={dealRoomId}
        conversationId={dealRoom.conversation_id as string}
        stage={dealRoom.stage as string}
        status={dealRoom.status as string}
        isSeller={isSeller}
        currentUserId={user.id}
        members={(members ?? []) as DealRoomMember[]}
        documents={(documents ?? []) as DealRoomDocument[]}
        requests={(requests ?? []) as DealRoomRequest[]}
        activity={(activity ?? []) as DealRoomActivity[]}
        profileMap={profileMap}
      />
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared types (exported for DealRoomClient)
// ─────────────────────────────────────────────────────────────────────────────
export interface DealRoomMember {
  id: string;
  user_id: string | null;
  invited_email: string | null;
  role: string;
  membership_status: string;
  joined_at: string | null;
  created_at: string;
}

export interface DealRoomDocument {
  id: string;
  filename: string;
  filetype: string;
  filesize: number;
  category: string | null;
  description: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface DealRoomRequest {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DealRoomActivity {
  id: string;
  actor_id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
