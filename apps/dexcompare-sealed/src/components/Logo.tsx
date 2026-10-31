export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="rgb(var(--brand))" />
      <path d="M19 15l2.6-3 2.6 3 2.6-3 2.6 3 2.6-3 2.6 3 2.6-3 2.6 3 2.6-3 2.6 3V49l-2.6 3-2.6-3-2.6 3-2.6-3-2.6 3-2.6-3-2.6 3-2.6-3-2.6 3-2.6-3z" fill="#fff" />
      <rect x="19" y="18" width="26" height="2.5" fill="#f4cfc5" />
      <rect x="19" y="43.5" width="26" height="2.5" fill="#f4cfc5" />
      <path d="M32 22.5Q33.6 30.4 41.5 32 33.6 33.6 32 41.5 30.4 33.6 22.5 32 30.4 30.4 32 22.5z" fill="#ffcb05" stroke="rgb(var(--brand))" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The mark and the wordmark. `wordmark` sets when the word shows: the header passes "hidden sm:inline", so a phone's one row keeps
 * its width for the search box (the mark alone is the home link there, named by the link's aria-label).
 */
export function Logo({ wordmark = "" }: { wordmark?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className={`font-display text-[19px] font-extrabold tracking-tight ${wordmark}`}>
        Dex<span className="text-brand">Compare</span>
      </span>
    </span>
  );
}
