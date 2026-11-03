/**
 * The DexCompare mark (2026-11-03, Bill: "bring back the Pokéball"): a red-and-white ball, inspired by the one the site launched
 * with, made ours by a tilted band and the brand's yellow price spark in the button. No gradients, ids or clip paths, so every
 * copy on a page (header, footer, phone menu) draws the same even inside a hidden menu. icon.svg, public/logo.svg, favicon.ico,
 * apple-icon.png, public/logo.png and the two share-image renderers draw the same shapes (src/lib/logo-mark.ts).
 */
import { BALL_BAND, BALL_GLOSS, BALL_INK, BALL_RED, BALL_SPARK, BALL_STAR, BALL_TOP, BALL_WHITE } from "@/lib/logo-mark";

/** The ball's shapes in a 64×64 box, for an <svg viewBox="0 0 64 64">. */
export function BallParts() {
  return (
    <>
      <circle cx="32" cy="32" r="29" fill={BALL_WHITE} />
      <g transform="rotate(-14 32 32)">
        <path d={BALL_TOP} fill={BALL_RED} />
        <path d={BALL_BAND} fill={BALL_INK} />
      </g>
      <path d={BALL_GLOSS} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx="32" cy="32" r="29" fill="none" stroke={BALL_INK} strokeWidth={3} />
      <circle cx="32" cy="32" r="11" fill={BALL_INK} />
      <circle cx="32" cy="32" r="7.6" fill="#fff" />
      <path d={BALL_STAR} fill={BALL_SPARK} stroke={BALL_RED} strokeWidth={1} strokeLinejoin="round" />
    </>
  );
}

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  // In a host span so the Christmas Santa hat (globals.css .xmas-logo-hat, hidden outside the season) can sit on the mark.
  return (
    <span className="xmas-hat-host">
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <BallParts />
      </svg>
      <span aria-hidden="true" className="xmas-logo-hat" />
    </span>
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
