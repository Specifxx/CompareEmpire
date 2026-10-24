import Link from "next/link";
import { seasonMarkupLive } from "@/lib/season";
import { sectionHref } from "@/lib/site";
import { X_DEFAULT_REGION } from "@/lib/regions";

// Halloween (16–31 October, visitor's own clock; lib/season.ts). The hero's decoration: cobwebs in the top corners with a
// dangling spider, a few bats, two jack-o'-lanterns, and a ghost-type teaser (an original purple ghost drawn in SVG, no Pokémon
// art). Everything is decorative (aria-hidden, pointer-events none) and sits in the hero's empty margins: on a phone the webs
// and pumpkins shrink and the bats stay above the eyebrow, so no text or control is covered. In the HTML only around the season
// (seasonMarkupLive, a day of slack for the CDN copy) and shown only while <html> carries data-season="halloween" (globals.css
// .hw-*), so it appears and goes at the visitor's own midnight. The whole season comes out by deleting this file and its calls.

function Web({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M0 0L120 120M0 0L60 120M0 0L120 60M0 0L0 120M0 0L120 0" />
      <path d="M0 24Q14 14 24 0M0 48Q30 32 48 0M0 76Q44 52 76 0M0 104Q60 70 104 0" />
      <line x1="34" y1="34" x2="34" y2="80" strokeWidth="0.8" className="hw-thread" />
      <g className="hw-spider" fill="currentColor" stroke="none">
        <circle cx="34" cy="84" r="5" />
        <circle cx="34" cy="78" r="3" />
        <path d="M29 82l-7-4M29 85l-8 0M29 88l-7 4M39 82l7-4M39 85l8 0M39 88l7 4" stroke="currentColor" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

function Pumpkin({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 64 60" className={className}>
      <path d="M30 10q2-8 8-9" stroke="#3f6b2a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="32" cy="36" rx="28" ry="22" fill="#e8730c" />
      <ellipse cx="20" cy="36" rx="10" ry="21" fill="#f08a24" />
      <ellipse cx="44" cy="36" rx="10" ry="21" fill="#f08a24" />
      <ellipse cx="32" cy="36" rx="9" ry="22" fill="#f59a35" />
      <g className="hw-candle" fill="#ffd34d">
        <path d="M17 30l7-6 4 8zM47 30l-7-6-4 8z" />
        <path d="M14 42q18 12 36 0l-5 7-4-4-4 5-5-5-4 5-4-4z" />
      </g>
    </svg>
  );
}

function Bat({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 48 20" className={className} fill="currentColor">
      <path d="M24 6c-2 0-3 2-3 4-4-6-12-8-21-4 6 1 9 5 9 9 3-3 7-3 9 0 1-2 3-3 6-3s5 1 6 3c2-3 6-3 9 0 0-4 3-8 9-9-9-4-17-2-21 4 0-2-1-4-3-4z" />
    </svg>
  );
}

/** An original little ghost, Gengar-ish in mood only: round, purple, grinning, with spikes. */
function Ghost({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M6 22a14 14 0 0 1 28 0v12l-4-3-4 3-4-3-4 3-4-3-4 3-4-3z M9 11l-3-7 7 4 M31 11l3-7-7 4 M20 8l0-6 3 6" fill="#6b3fa0" />
      <path d="M12 18l6 3-6 1z M28 18l-6 3 6 1z" fill="#ff4d6d" />
      <path d="M12 26q8 6 16 0q-8 3-16 0z" fill="#fff" />
    </svg>
  );
}

/** The hero's decoration layer: put inside a `relative` hero. */
export function HalloweenDecor() {
  if (!seasonMarkupLive("halloween")) return null;
  return (
    <div className="hw-decor" aria-hidden="true">
      <Web className="hw-web hw-web-l" />
      <Web className="hw-web hw-web-r" />
      <Bat className="hw-bat hw-bat-1" />
      <Bat className="hw-bat hw-bat-2" />
      <Bat className="hw-bat hw-bat-3" />
      <Pumpkin className="hw-pumpkin hw-pumpkin-l" />
      <Pumpkin className="hw-pumpkin hw-pumpkin-r" />
    </div>
  );
}

/** The seasonal callout above the hero's eyebrow: a ghost-type teaser, linking to the default region's deals. */
export function GhostTeaser() {
  if (!seasonMarkupLive("halloween")) return null;
  return (
    <div className="hw-teaser-wrap mb-3 justify-center sm:mb-4">
      <Link href={sectionHref(X_DEFAULT_REGION, "deals")} className="hw-teaser">
        <Ghost className="hw-ghost h-6 w-6 shrink-0" />
        <b>Something ghostly is in the boxes</b>
        <span className="hidden sm:inline">· hunt this week&rsquo;s deals →</span>
      </Link>
    </div>
  );
}
