'use client';

/**
 * UserAvatar – displays avatar image or falls back to initials.
 * No arbitrary external image URLs are accepted.
 */

interface UserAvatarProps {
  /** Supabase Storage public URL for the avatar (owner-only upload path). */
  avatarUrl?: string | null;
  fullName?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (
    (parts[0][0]?.toUpperCase() ?? '') +
    (parts[parts.length - 1][0]?.toUpperCase() ?? '')
  );
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
};

export default function UserAvatar({
  avatarUrl,
  fullName,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const initials = getInitials(fullName);

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={fullName ?? 'User avatar'}
        className={`${sizeClass} rounded-full object-cover ring-1 ring-slate-700 ${className}`}
      />
    );
  }

  return (
    <span
      aria-label={fullName ?? 'User'}
      className={`${sizeClass} inline-flex items-center justify-center rounded-full bg-cyan-600 font-semibold text-white ring-1 ring-slate-700 ${className}`}
    >
      {initials}
    </span>
  );
}
