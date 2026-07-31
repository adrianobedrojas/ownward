import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import ConversationClient from "./ConversationClient";

export const metadata: Metadata = {
  title: "Conversation | Ownward",
};

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;
  const { supabase, user } = await requireUser();

  // UUID validation
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(conversationId)) notFound();

  const { data: conversation, error } = await supabase
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
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !conversation) notFound();

  const isBuyer = conversation.buyer_id === user.id;
  const isSeller = conversation.seller_id === user.id;
  if (!isBuyer && !isSeller) notFound();

  // Get participant profiles
  const participantIds = [conversation.buyer_id, conversation.seller_id];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", participantIds);

  const profileMap: Record<string, { full_name: string | null }> = {};
  if (profiles) {
    for (const p of profiles as Array<{ id: string; full_name: string | null }>) {
      profileMap[p.id] = p;
    }
  }

  const buyerName = profileMap[conversation.buyer_id]?.full_name || "Buyer";
  const sellerName = profileMap[conversation.seller_id]?.full_name || "Seller";

  // Load initial messages
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, message_type, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const listingRaw = conversation.business_listings;
  const listing = (Array.isArray(listingRaw) ? listingRaw[0] : listingRaw) as {
    business_name: string;
    slug: string | null;
  } | null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/messages"
          className="text-sm text-slate-400 hover:text-slate-200 transition"
        >
          ← Back to messages
        </Link>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Listing
              </p>
              {listing?.slug ? (
                <Link
                  href={`/b/${listing.slug}`}
                  className="mt-1 text-lg font-bold text-white hover:text-cyan-300 transition"
                >
                  {listing.business_name}
                </Link>
              ) : (
                <p className="mt-1 text-lg font-bold text-white">
                  {listing?.business_name ?? "Business listing"}
                </p>
              )}
              <p className="mt-1 text-sm text-slate-400">
                Buyer: <span className="text-slate-200">{buyerName}</span>
                {" · "}
                Seller: <span className="text-slate-200">{sellerName}</span>
              </p>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
              {STATUS_LABELS[conversation.status] ?? conversation.status}
            </span>
          </div>
        </div>
      </div>

      {/* Client component handles messages + send + realtime */}
      <ConversationClient
        conversationId={conversationId}
        currentUserId={user.id}
        isSeller={isSeller}
        conversationStatus={conversation.status}
        initialMessages={(messages ?? []) as Message[]}
        otherUserId={isBuyer ? conversation.seller_id : conversation.buyer_id}
        otherUserName={isBuyer ? sellerName : buyerName}
      />
    </main>
  );
}

const STATUS_LABELS: Record<string, string> = {
  new: "New inquiry",
  active: "Active",
  qualified: "Buyer qualification",
  nda_requested: "NDA requested",
  deal_room: "Deal room",
  not_a_fit: "Not a fit",
  archived: "Archived",
};

export interface Message {
  id: string;
  sender_id: string;
  message_type: string;
  body: string;
  created_at: string;
}
