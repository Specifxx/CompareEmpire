import Link from "next/link";

// The creators hub, visible on the homepage before any scroll: RiftCompare's CreatorsCornerBadge (owner, 2026-11-03: "just a bubble
// and then a really nice formatted creators page"). In the hero's top-right corner from sm up; on a phone, where a corner badge would
// sit on the headline, a small centred pill above it instead. Server component, static: nothing to fetch, nothing to hydrate.
export function CreatorsCornerBadge({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/creators"
      prefetch={false}
      className={`group relative z-20 mb-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-2 pr-3.5 text-xs font-bold text-ink shadow-card transition hover:-translate-y-0.5 hover:border-ink/30 sm:absolute sm:right-4 sm:top-4 sm:mb-0 sm:text-sm ${className}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised text-[13px]" aria-hidden>
        ✨
      </span>
      <span>
        Pokémon creators
        <span className="ml-1.5 font-semibold text-muted group-hover:text-ink">Buy them a pack →</span>
      </span>
    </Link>
  );
}
