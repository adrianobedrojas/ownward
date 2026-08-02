const INSTAGRAM_URL = 'https://www.instagram.com/ownwardhub/';

type InstagramLinkProps = {
  text: string;
  ariaLabel: string;
  className?: string;
  iconClassName?: string;
};

export default function InstagramLink({
  text,
  ariaLabel,
  className = '',
  iconClassName = '',
}: InstagramLinkProps) {
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-2 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${className}`.trim()}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${iconClassName}`.trim()}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="4.5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
      </svg>
      <span>{text}</span>
    </a>
  );
}

export { INSTAGRAM_URL };
