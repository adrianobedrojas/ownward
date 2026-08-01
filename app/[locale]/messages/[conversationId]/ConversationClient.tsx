"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, updateConversationStatus, blockUser, reportMessage } from "@/app/actions/messaging";
import { createDealRoom } from "@/app/[locale]/deals/actions";
import type { Message } from "./page";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  conversationId: string;
  currentUserId: string;
  isSeller: boolean;
  conversationStatus: string;
  initialMessages: Message[];
  otherUserId: string;
  otherUserName: string;
  dealRoomId?: string | null;
  canCreateDealRoom?: boolean;
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

const STATUS_OPTIONS = [
  "new",
  "active",
  "qualified",
  "nda_requested",
  "deal_room",
  "not_a_fit",
  "archived",
] as const;

const BUYER_STARTERS = [
  "How involved is the owner day to day?",
  "Why is the business being sold?",
  "Are the financial figures documented?",
  "Are employees expected to remain?",
  "Is seller financing available?",
  "What information is available after an NDA?",
];

const SELLER_STARTERS = [
  "What type of business are you seeking?",
  "What is your acquisition timeline?",
  "Will you need financing?",
  "Do you have relevant industry experience?",
  "Would you like to discuss confidentiality requirements?",
  "Would you like to schedule an introductory call?",
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return `Yesterday ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ConversationClient({
  conversationId,
  currentUserId,
  isSeller,
  conversationStatus: initialStatus,
  initialMessages,
  otherUserId,
  otherUserName,
  dealRoomId: initialDealRoomId,
  canCreateDealRoom = false,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [conversationStatus, setConversationStatus] = useState(initialStatus);
  const [reportingMsgId, setReportingMsgId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [dealRoomId, setDealRoomId] = useState<string | null>(initialDealRoomId ?? null);
  const [dealRoomError, setDealRoomError] = useState<string | null>(null);
  const [creatingDealRoom, startDealRoomCreate] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const isClosed = ["not_a_fit", "archived"].includes(conversationStatus);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // ── Send message ────────────────────────────────────────────────────────────
  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    setError(null);

    const fd = new FormData();
    fd.append("conversationId", conversationId);
    fd.append("body", trimmed);

    startTransition(async () => {
      const result = await sendMessage(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDraft("");
    });
  }

  // ── Status update (seller only) ─────────────────────────────────────────────
  function handleStatusChange(newStatus: string) {
    setStatusFeedback(null);
    const fd = new FormData();
    fd.append("conversationId", conversationId);
    fd.append("status", newStatus);

    startTransition(async () => {
      const result = await updateConversationStatus(fd);
      if (result.error) {
        setStatusFeedback(result.error);
        return;
      }
      setConversationStatus(newStatus);
      setStatusFeedback("Status updated.");
      setTimeout(() => setStatusFeedback(null), 2000);
    });
  }

  // ── Block ────────────────────────────────────────────────────────────────────
  function handleBlock() {
    const fd = new FormData();
    fd.append("blockedUserId", otherUserId);

    startTransition(async () => {
      const result = await blockUser(fd);
      if (result.error) {
        setActionFeedback(result.error);
        return;
      }
      setActionFeedback(`${otherUserName} has been blocked.`);
      setBlockConfirm(false);
    });
  }

  // ── Report ───────────────────────────────────────────────────────────────────
  function handleReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportingMsgId || !reportReason.trim()) return;

    const fd = new FormData();
    fd.append("messageId", reportingMsgId);
    fd.append("reason", reportReason.trim());

    startTransition(async () => {
      const result = await reportMessage(fd);
      if (result.error) {
        setActionFeedback(result.error);
        return;
      }
      setActionFeedback("Message reported. Thank you.");
      setReportingMsgId(null);
      setReportReason("");
    });
  }

  // ── Create Deal Room ─────────────────────────────────────────────────────────
  function handleCreateDealRoom() {
    setDealRoomError(null);
    const fd = new FormData();
    fd.append("conversationId", conversationId);
    startDealRoomCreate(async () => {
      const result = await createDealRoom(fd);
      if (result.error) {
        setDealRoomError(result.error);
        return;
      }
      if (result.data?.dealRoomId) {
        setDealRoomId(result.data.dealRoomId);
        setConversationStatus("deal_room");
        router.push(`/deals/${result.data.dealRoomId}`);
      }
    });
  }

  const starters = isSeller ? SELLER_STARTERS : BUYER_STARTERS;

  return (
    <div className="flex flex-col gap-4">
      {/* Deal Room control – seller only */}
      {isSeller && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/20 bg-cyan-400/5 px-4 py-3">
          <span className="text-sm font-medium text-cyan-300">Deal Room</span>
          {dealRoomId ? (
            <Link
              href={`/deals/${dealRoomId}`}
              className="rounded-lg bg-cyan-400 px-4 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Open Deal Room
            </Link>
          ) : canCreateDealRoom ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCreateDealRoom}
                disabled={creatingDealRoom}
                className="rounded-lg bg-cyan-400 px-4 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
              >
                {creatingDealRoom ? "Creating…" : "+ Create Deal Room"}
              </button>
              {dealRoomError && (
                <span className="text-xs text-rose-300">{dealRoomError}</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-500">
              {conversationStatus === "deal_room"
                ? "Deal Room was created"
                : "Available when conversation is active, qualified, or NDA-requested"}
            </span>
          )}
        </div>
      )}

      {/* Buyer: show link if deal room exists */}
      {!isSeller && dealRoomId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/20 bg-cyan-400/5 px-4 py-3">
          <span className="text-sm font-medium text-cyan-300">Deal Room created</span>
          <Link
            href={`/deals/${dealRoomId}`}
            className="rounded-lg bg-cyan-400 px-4 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Open Deal Room
          </Link>
        </div>
      )}

      {/* Seller status control */}
      {isSeller && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
          <span className="text-sm text-slate-400">Conversation stage:</span>
          <select
            value={conversationStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            aria-label="Update conversation status"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          {statusFeedback && (
            <span role="status" className="text-xs text-emerald-400">{statusFeedback}</span>
          )}
        </div>
      )}

      {/* Messages list */}
      <div
        className="rounded-2xl border border-slate-800 bg-slate-900 p-4 min-h-[300px] max-h-[500px] overflow-y-auto flex flex-col gap-3"
        aria-live="polite"
        aria-label="Messages"
      >
        {messages.length === 0 ? (
          <p className="my-auto text-center text-sm text-slate-500">
            No messages yet. Start the conversation below.
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === currentUserId;
            const isSystem = msg.message_type === "system";
            const isInterest = msg.message_type === "interest_summary";

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center text-xs text-slate-500 my-1">
                  {msg.body}
                </div>
              );
            }

            if (isInterest) {
              return (
                <div key={msg.id} className="rounded-xl border border-cyan-500/20 bg-cyan-400/5 p-3 text-sm text-slate-300">
                  <p className="text-xs font-semibold text-cyan-400 mb-1">Interest summary</p>
                  {msg.body}
                  <p className="mt-1 text-xs text-slate-500">{formatTime(msg.created_at)}</p>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    isOwn
                      ? "rounded-br-sm bg-cyan-400 text-slate-950"
                      : "rounded-bl-sm bg-slate-800 text-slate-100"
                  }`}
                >
                  {msg.body}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-slate-500">{formatTime(msg.created_at)}</span>
                  {!isOwn && (
                    <button
                      type="button"
                      onClick={() => setReportingMsgId(msg.id)}
                      className="text-xs text-slate-600 hover:text-rose-400 transition"
                      aria-label="Report this message"
                    >
                      Report
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Action feedback */}
      {actionFeedback && (
        <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {actionFeedback}
        </p>
      )}

      {/* Conversation starters */}
      {!isClosed && (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
            Suggested starters
          </p>
          <div className="flex flex-wrap gap-2">
            {starters.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDraft(s)}
                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-700"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      {isClosed ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center text-sm text-slate-500">
          This conversation is {STATUS_LABELS[conversationStatus]?.toLowerCase() ?? "closed"} and cannot receive new messages.
        </div>
      ) : (
        <form onSubmit={handleSend} className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
              }
            }}
            rows={3}
            maxLength={4000}
            placeholder="Type a message… (Shift+Enter for new line)"
            aria-label="Message input"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{draft.length}/4000</span>
            <button
              type="submit"
              disabled={isPending || !draft.trim()}
              className="rounded-xl bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {isPending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      )}

      {/* Block/Report controls */}
      <div className="flex items-center gap-4 border-t border-slate-800 pt-4">
        <span className="text-xs text-slate-500">Having an issue?</span>
        <button
          type="button"
          onClick={() => setBlockConfirm(true)}
          className="text-xs text-slate-500 hover:text-rose-400 transition"
        >
          Block {otherUserName}
        </button>
      </div>

      {/* Block confirm dialog */}
      {blockConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Block user"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h4 className="font-bold text-white mb-3">Block {otherUserName}?</h4>
            <p className="text-sm text-slate-400 mb-5">
              They will no longer be able to send messages in this conversation.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBlock}
                disabled={isPending}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50"
              >
                Block
              </button>
              <button
                type="button"
                onClick={() => setBlockConfirm(false)}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report message dialog */}
      {reportingMsgId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Report message"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h4 className="font-bold text-white mb-3">Report message</h4>
            <form onSubmit={handleReport}>
              <label htmlFor="report-reason" className="block text-sm text-slate-300 mb-2">
                Why are you reporting this message?
              </label>
              <textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={3}
                maxLength={500}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                placeholder="e.g. Spam, harassment, inappropriate content"
              />
              <div className="mt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={isPending || !reportReason.trim()}
                  className="flex-1 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50"
                >
                  Submit report
                </button>
                <button
                  type="button"
                  onClick={() => { setReportingMsgId(null); setReportReason(""); }}
                  className="flex-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
