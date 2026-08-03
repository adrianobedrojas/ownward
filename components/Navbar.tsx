import { createClient } from "@/lib/supabase/server";
import NavbarClient from "./NavbarClient";
import type { ControlCenterData } from "./control-center/PersonalControlCenter";
import type { ConversationPreview } from "./control-center/MessagesPopover";
import type { NotificationItem } from "./control-center/NotificationsPopover";
import { isConversationUnread } from "@/lib/messaging/unread";

export default async function Navbar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <NavbarClient signedIn={false} controlCenterData={null} />;
  }

  // ── Single authorized data fetch for the control center ──────────────────
  const [profileResult, convResult, notifResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, avatar_path, role, subscription_status, onboarding_complete"
      )
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("conversations")
      .select(
        "id, listing_id, buyer_id, seller_id, status, last_message_at, buyer_last_read_at, seller_last_read_at, business_listings(business_name)"
      )
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(5),

    supabase
      .from("notifications")
      .select(
        "id, notification_type, category, priority, action_url, read_at, archived_at, created_at, metadata"
      )
      .eq("recipient_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const profile = profileResult.data;
  const convRows = convResult.data ?? [];
  const notifRows = (notifResult.data ?? []) as NotificationItem[];

  // Compute profile completion from real fields
  const completionFields = [
    profile?.full_name,
    (profile as Record<string, unknown> | null)?.avatar_path,
    (profile as Record<string, unknown> | null)?.role,
  ];
  const filled = completionFields.filter(Boolean).length;
  const profileCompletion = Math.round((filled / completionFields.length) * 100);

  // Fetch latest messages for conversation previews
  const convIds = convRows.map((c: Record<string, unknown>) => c.id as string);
  const latestMsgMap: Record<string, string> = {};
  if (convIds.length > 0) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id, body")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    if (msgs) {
      for (const m of msgs as Array<{ conversation_id: string; body: string }>) {
        if (!latestMsgMap[m.conversation_id]) {
          latestMsgMap[m.conversation_id] = m.body;
        }
      }
    }
  }

  const conversations: ConversationPreview[] = convRows.map(
    (c: Record<string, unknown>) => {
      const listing = c.business_listings as { business_name: string } | null;
      const unread = isConversationUnread(
        {
          buyer_id: c.buyer_id as string,
          seller_id: c.seller_id as string,
          last_message_at: c.last_message_at as string | null,
          buyer_last_read_at: c.buyer_last_read_at as string | null,
          seller_last_read_at: c.seller_last_read_at as string | null,
        },
        user.id
      );
      return {
        id: c.id as string,
        listingName: listing?.business_name ?? "Listing",
        otherName: "Participant",
        latestMessage: latestMsgMap[c.id as string] ?? "",
        timestamp: c.last_message_at as string | null,
        unread,
        status: c.status as string,
      };
    }
  );

  const unreadConvCount = conversations.filter((c) => c.unread).length;
  const unreadNotifCount = notifRows.filter((n) => !n.read_at).length;

  // Resolve subscription plan
  const subscriptionPlan =
    profile?.subscription_status && profile.subscription_status !== "inactive"
      ? profile.subscription_status
      : null;

  const role = (profile as Record<string, unknown> | null)
    ?.role as string | null;

  const controlCenterData: ControlCenterData = {
    userId: user.id,
    fullName: profile?.full_name ?? null,
    avatarUrl: null, // resolved client-side from avatar_path via storage URL
    activeWorkspace: role === "seller" ? "seller" : "buyer",
    subscriptionPlan,
    profileCompletion,
    hasSellerRole: role === "seller" || role === "both",
    hasBuyerRole: role === "buyer" || role === "both" || !role,
    initialConversations: conversations,
    initialUnreadCount: unreadConvCount,
    initialNotifications: notifRows,
    initialUnreadNotifications: unreadNotifCount,
  };

  return <NavbarClient signedIn={true} controlCenterData={controlCenterData} />;
}
