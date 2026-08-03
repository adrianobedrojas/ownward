'use client';

/**
 * UnreadBadge – numeric unread count badge.
 * Renders nothing when count is 0.
 */

interface UnreadBadgeProps {
  count: number;
  /** Max value before showing "N+" */
  max?: number;
  className?: string;
}

export default function UnreadBadge({
  count,
  max = 99,
  className = '',
}: UnreadBadgeProps) {
  if (count <= 0) return null;

  const label = count > max ? `${max}+` : String(count);

  return (
    <span
      aria-label={`${count} unread`}
      className={`absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[10px] font-bold leading-none text-white ${className}`}
    >
      {label}
    </span>
  );
}
