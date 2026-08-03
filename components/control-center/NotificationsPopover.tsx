'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import UnreadBadge from './UnreadBadge';
import { sanitizeActionUrl } from '@/lib/notifications/action-url';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationCategory =
  | 'buyers'
  | 'messages'
  | 'deals'
  | 'tasks'
  | 'billing'
  | 'security'
  | 'system';

export interface NotificationItem {
  id: string;
  notification_type: string;
  category: NotificationCategory;
  priority: 'low' | 'normal' | 'high' | 'critical';
  action_url: string | null;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

type FilterTab = 'all' | NotificationCategory;

interface NotificationsPopoverProps {
  notifications: NotificationItem[];
  unreadCount: number;
  isOpen: boolean;
  activeFilter: FilterTab;
  onOpen: () => void;
  onClose: () => void;
  onFilterChange: (f: FilterTab) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onArchive: (id: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const FILTER_TABS: FilterTab[] = ['all', 'buyers', 'messages', 'deals', 'tasks', 'system'];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function NotificationsPopover({
  notifications,
  unreadCount,
  isOpen,
  activeFilter,
  onOpen,
  onClose,
  onFilterChange,
  onMarkRead,
  onMarkAllRead,
  onArchive,
}: NotificationsPopoverProps) {
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

  const filtered =
    activeFilter === 'all'
      ? notifications
      : notifications.filter((n) => n.category === activeFilter);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={t('notificationsLabel')}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={handleToggle}
        className="relative rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
      >
        {/* Bell icon */}
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
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <UnreadBadge count={unreadCount} />
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('notificationsLabel')}
          className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl sm:w-96"
          style={{ maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="font-semibold text-white">{t('notificationsLabel')}</p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="text-xs text-cyan-400 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  {t('markAllRead')}
                </button>
              )}
              <Link
                href="/settings/notifications"
                onClick={onClose}
                aria-label={t('notificationSettings')}
                className="rounded p-1 text-slate-500 hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                {/* Settings gear icon */}
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-slate-800 px-3 py-2 scrollbar-none">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onFilterChange(tab)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  activeFilter === tab
                    ? 'bg-cyan-400/20 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t(`filter_${tab}` as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              {t('noNotifications')}
            </div>
          ) : (
            <ul className="divide-y divide-slate-800">
              {filtered.map((notif) => {
                const safeUrl = sanitizeActionUrl(notif.action_url);
                const isUnread = !notif.read_at;

                return (
                  <li
                    key={notif.id}
                    className={`group flex items-start gap-3 px-4 py-3 text-sm ${
                      isUnread ? 'bg-cyan-400/5' : ''
                    }`}
                  >
                    {/* Unread dot */}
                    <span className="mt-1.5 shrink-0">
                      {isUnread ? (
                        <span className="block h-2 w-2 rounded-full bg-cyan-400" />
                      ) : (
                        <span className="block h-2 w-2 rounded-full bg-slate-700" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-medium capitalize ${isUnread ? 'text-white' : 'text-slate-300'}`}>
                          {t(`type_${notif.notification_type}` as Parameters<typeof t>[0])}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {formatTimestamp(notif.created_at)}
                        </span>
                      </div>

                      {/* Actions row */}
                      <div className="mt-1.5 flex items-center gap-2">
                        {safeUrl && (
                          <Link
                            href={safeUrl}
                            onClick={() => {
                              onMarkRead(notif.id);
                              onClose();
                            }}
                            className="text-xs text-cyan-400 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                          >
                            {t('view')}
                          </Link>
                        )}
                        {isUnread && (
                          <button
                            type="button"
                            onClick={() => onMarkRead(notif.id)}
                            className="text-xs text-slate-500 hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                          >
                            {t('markRead')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onArchive(notif.id)}
                          className="text-xs text-slate-500 hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                        >
                          {t('archive')}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
