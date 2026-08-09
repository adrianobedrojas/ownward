'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import UserAvatar from './UserAvatar';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WorkspaceSwitcherProps {
  activeWorkspace: 'buyer' | 'seller';
  hasSellerRole: boolean;
  hasBuyerRole: boolean;
  onSwitch: (workspace: 'buyer' | 'seller') => void;
}

interface UserAccountMenuProps {
  fullName: string | null;
  avatarUrl: string | null;
  activeWorkspace: 'buyer' | 'seller';
  subscriptionPlan: string | null;
  profileCompletion: number;
  hasSellerRole: boolean;
  hasBuyerRole: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onWorkspaceSwitch: (workspace: 'buyer' | 'seller') => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceSwitcher
// ─────────────────────────────────────────────────────────────────────────────

export function WorkspaceSwitcher({
  activeWorkspace,
  hasSellerRole,
  hasBuyerRole,
  onSwitch,
}: WorkspaceSwitcherProps) {
  const t = useTranslations('ControlCenter');

  if (!hasBuyerRole || !hasSellerRole) return null;

  return (
    <div className="px-3 py-2">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {t('workspace')}
      </p>
      <div className="flex rounded-lg border border-slate-700 bg-slate-800/50 p-0.5">
        {(['buyer', 'seller'] as const).map((ws) => (
          <button
            key={ws}
            type="button"
            onClick={() => onSwitch(ws)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              activeWorkspace === ws
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t(`workspace_${ws}` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UserAccountMenu
// ─────────────────────────────────────────────────────────────────────────────

const MENU_LINKS = [
  { href: '/profile', label: 'My Profile' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/business', label: 'My Businesses' },
  { href: '/seller', label: 'Seller Area' },
  { href: '/saved', label: 'Saved Businesses' },
  { href: '/messages', label: 'Messages' },
  { href: '/deals', label: 'Deal Rooms' },
  { href: '/account/products', label: 'Billing & Plan' },
  { href: '/settings', label: 'Settings' },
];

export default function UserAccountMenu({
  fullName,
  avatarUrl,
  activeWorkspace,
  subscriptionPlan,
  profileCompletion,
  hasSellerRole,
  hasBuyerRole,
  isOpen,
  onOpen,
  onClose,
  onWorkspaceSwitch,
}: UserAccountMenuProps) {
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

  // Close on Escape
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
      {/* Avatar trigger */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={t('accountMenu')}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={handleToggle}
        className="flex items-center gap-1.5 rounded-lg p-1 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
      >
        <UserAvatar avatarUrl={avatarUrl} fullName={fullName} size="sm" />
        {/* Chevron */}
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={t('accountMenu')}
          className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
          style={{ maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}
        >
          {/* Profile summary */}
          <div className="border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-3">
              <UserAvatar avatarUrl={avatarUrl} fullName={fullName} size="md" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">
                  {fullName ?? t('ownwardMember')}
                </p>
                {subscriptionPlan && (
                  <p className="truncate text-xs text-slate-400 capitalize">{subscriptionPlan}</p>
                )}
                {profileCompletion < 100 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-cyan-500 transition-all"
                        style={{ width: `${profileCompletion}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{profileCompletion}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Workspace switcher */}
          <WorkspaceSwitcher
            activeWorkspace={activeWorkspace}
            hasSellerRole={hasSellerRole}
            hasBuyerRole={hasBuyerRole}
            onSwitch={onWorkspaceSwitch}
          />

          {/* Menu links */}
          <div className="py-1">
            {MENU_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={onClose}
                className="block px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Log out */}
          <div className="border-t border-slate-800 px-3 py-2">
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                role="menuitem"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                {t('logOut')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
