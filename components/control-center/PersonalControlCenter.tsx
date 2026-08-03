'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import MessagesPopover, { type ConversationPreview } from './MessagesPopover';
import NotificationsPopover, { type NotificationItem } from './NotificationsPopover';
import UserAccountMenu from './UserAccountMenu';
import { useRouter as _useRouter } from 'next/navigation'; // reserved for future use
import { createClient } from '@/lib/supabase/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type OpenPanel = 'messages' | 'notifications' | 'account' | null;

export interface ControlCenterData {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  activeWorkspace: 'buyer' | 'seller';
  subscriptionPlan: string | null;
  profileCompletion: number;
  hasSellerRole: boolean;
  hasBuyerRole: boolean;
  initialConversations: ConversationPreview[];
  initialUnreadCount: number;
  initialNotifications: NotificationItem[];
  initialUnreadNotifications: number;
}

interface PersonalControlCenterProps {
  data: ControlCenterData;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function PersonalControlCenter({
  data,
}: PersonalControlCenterProps) {
  const t = useTranslations('ControlCenter');

  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [conversations, setConversations] = useState<ConversationPreview[]>(
    data.initialConversations
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    data.initialNotifications
  );
  const [notifFilter, setNotifFilter] = useState<
    'all' | 'buyers' | 'messages' | 'deals' | 'tasks' | 'billing' | 'security' | 'system'
  >('all');
  const [workspace, setWorkspace] = useState<'buyer' | 'seller'>(
    data.activeWorkspace
  );

  // Use the simpler approach: count from the unread flag
  const msgUnreadCount = conversations.filter((c) => c.unread).length;
  const notifUnreadCount = notifications.filter((n) => !n.read_at).length;

  // ── Refresh helpers (defined before useEffect to avoid lint errors) ────────

  const refreshConversations = useCallback(
    async (supabase: ReturnType<typeof createClient>) => {
      const { data: convs } = await supabase
        .from('conversations')
        .select(
          'id, listing_id, buyer_id, seller_id, status, last_message_at, buyer_last_read_at, seller_last_read_at, business_listings(business_name)'
        )
        .or(`buyer_id.eq.${data.userId},seller_id.eq.${data.userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(5);

      if (!convs) return;

      const ids = convs.map((c: Record<string, unknown>) => c.id as string);
      const { data: msgs } = await supabase
        .from('messages')
        .select('conversation_id, body, created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false });

      const latestMap: Record<string, string> = {};
      if (msgs) {
        for (const m of msgs as Array<{ conversation_id: string; body: string }>) {
          if (!latestMap[m.conversation_id]) latestMap[m.conversation_id] = m.body;
        }
      }

      setConversations(
        convs.map((c: Record<string, unknown>) => {
          const listing = c.business_listings as { business_name: string } | null;
          const lastRead =
            c.buyer_id === data.userId ? c.buyer_last_read_at : c.seller_last_read_at;
          const unread = c.last_message_at
            ? !lastRead || new Date(c.last_message_at as string) > new Date(lastRead as string)
            : false;
          return {
            id: c.id as string,
            listingName: listing?.business_name ?? 'Listing',
            otherName: 'Participant',
            latestMessage: latestMap[c.id as string] ?? '',
            timestamp: c.last_message_at as string | null,
            unread,
            status: c.status as string,
          };
        })
      );
    },
    [data.userId]
  );

  const refreshNotifications = useCallback(
    async (supabase: ReturnType<typeof createClient>) => {
      const { data: notifs } = await supabase
        .from('notifications')
        .select(
          'id, notification_type, category, priority, action_url, read_at, archived_at, created_at, metadata'
        )
        .eq('recipient_id', data.userId)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notifs) setNotifications(notifs as NotificationItem[]);
    },
    [data.userId]
  );

  // ── Realtime ─────────────────────────────────────────────────────────────
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Single channel for both conversations and notifications
    const channel = supabase
      .channel(`control-center-${data.userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `buyer_id=eq.${data.userId}`,
        },
        () => refreshConversations(supabase)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `seller_id=eq.${data.userId}`,
        },
        () => refreshConversations(supabase)
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${data.userId}`,
        },
        () => refreshNotifications(supabase)
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [data.userId, refreshConversations, refreshNotifications]);

  const openMessages = useCallback(() => setOpenPanel('messages'), []);
  const openNotifications = useCallback(() => setOpenPanel('notifications'), []);
  const openAccount = useCallback(() => setOpenPanel('account'), []);
  const closeAll = useCallback(() => setOpenPanel(null), []);

  // ── Notification actions ───────────────────────────────────────────────────

  const handleMarkRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    const supabase = createClient();
    await supabase.rpc('mark_notification_read', { p_notification_id: id });
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    const supabase = createClient();
    await supabase.rpc('mark_all_notifications_read', {});
  }, []);

  const handleArchive = useCallback(async (id: string) => {
    // Optimistic: remove from list
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const supabase = createClient();
    await supabase.rpc('archive_notification', { p_notification_id: id });
  }, []);

  const handleWorkspaceSwitch = useCallback(
    async (ws: 'buyer' | 'seller') => {
      setWorkspace(ws);
      const supabase = createClient();
      await supabase.rpc('upsert_user_preferences', { p_active_workspace: ws });
    },
    []
  );

  return (
    <div className="flex items-center gap-1" aria-label={t('personalControlCenter')}>
      <MessagesPopover
        conversations={conversations}
        unreadCount={msgUnreadCount}
        isOpen={openPanel === 'messages'}
        onOpen={openMessages}
        onClose={closeAll}
      />
      <NotificationsPopover
        notifications={notifications}
        unreadCount={notifUnreadCount}
        isOpen={openPanel === 'notifications'}
        activeFilter={notifFilter}
        onOpen={openNotifications}
        onClose={closeAll}
        onFilterChange={setNotifFilter}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onArchive={handleArchive}
      />
      <UserAccountMenu
        fullName={data.fullName}
        avatarUrl={data.avatarUrl}
        activeWorkspace={workspace}
        subscriptionPlan={data.subscriptionPlan}
        profileCompletion={data.profileCompletion}
        hasSellerRole={data.hasSellerRole}
        hasBuyerRole={data.hasBuyerRole}
        isOpen={openPanel === 'account'}
        onOpen={openAccount}
        onClose={closeAll}
        onWorkspaceSwitch={handleWorkspaceSwitch}
      />
    </div>
  );
}
