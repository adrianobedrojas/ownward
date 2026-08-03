'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import UnreadBadge from './UnreadBadge';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ConversationPreview {
  id: string;
  listingName: string;
  otherName: string;
  latestMessage: string;
  timestamp: string | null;
  unread: boolean;
  status: string;
}

interface MessagesPopoverProps {
  conversations: ConversationPreview[];
  unreadCount: number;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MessagesPopover({
  conversations,
  unreadCount,
  isOpen,
  onOpen,
  onClose,
}: MessagesPopoverProps) {
  const t = useTranslations('ControlCenter');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // Close on Escape, return focus to trigger
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleToggle = useCallback(() => {
    if (isOpen) onClose();
    else onOpen();
  }, [isOpen, onOpen, onClose]);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={t('messagesLabel')}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={handleToggle}
        className="relative rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
      >
        {/* Mail icon */}
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <polyline points="2,4 12,13 22,4" />
        </svg>
        <UnreadBadge count={unreadCount} />
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('messagesLabel')}
          className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl sm:w-96"
          style={{ maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="font-semibold text-white">{t('messagesLabel')}</p>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-400">
                {unreadCount} {t('unread')}
              </span>
            )}
          </div>

          {conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              {t('noMessages')}
            </div>
          ) : (
            <ul className="divide-y divide-slate-800">
              {conversations.slice(0, 5).map((conv) => (
                <li key={conv.id}>
                  <Link
                    href={`/messages/${conv.id}`}
                    onClick={onClose}
                    className={`flex items-start gap-3 px-4 py-3 text-sm transition hover:bg-slate-800 ${
                      conv.unread ? 'bg-cyan-400/5' : ''
                    }`}
                  >
                    {/* Unread indicator */}
                    <span className="mt-1.5 shrink-0">
                      {conv.unread ? (
                        <span className="block h-2 w-2 rounded-full bg-cyan-400" aria-label={t('unread')} />
                      ) : (
                        <span className="block h-2 w-2 rounded-full bg-slate-700" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate font-medium ${conv.unread ? 'text-white' : 'text-slate-200'}`}>
                          {conv.listingName}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {formatTimestamp(conv.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-400">{conv.otherName}</p>
                      {conv.latestMessage && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">{conv.latestMessage}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-slate-800 px-4 py-3">
            <Link
              href="/messages"
              onClick={onClose}
              className="block w-full rounded-lg border border-slate-700 py-2 text-center text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              {t('viewAllMessages')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
