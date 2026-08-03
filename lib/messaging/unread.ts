/**
 * Shared helper: determine whether a conversation has unread messages
 * for a given user id.
 */

export interface ConversationReadState {
  buyer_id: string;
  seller_id: string;
  last_message_at: string | null;
  buyer_last_read_at: string | null;
  seller_last_read_at: string | null;
}

/**
 * Returns true when `userId` has at least one unread message in the
 * given conversation.
 */
export function isConversationUnread(
  conv: ConversationReadState,
  userId: string
): boolean {
  if (!conv.last_message_at) return false;

  const lastRead =
    conv.buyer_id === userId
      ? conv.buyer_last_read_at
      : conv.seller_id === userId
        ? conv.seller_last_read_at
        : null;

  if (!lastRead) return true;

  return new Date(conv.last_message_at) > new Date(lastRead);
}

/**
 * Count unread conversations for `userId`.
 */
export function countUnreadConversations(
  conversations: ConversationReadState[],
  userId: string
): number {
  return conversations.filter((c) => isConversationUnread(c, userId)).length;
}
