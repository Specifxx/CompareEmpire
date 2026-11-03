// Featured creators (/creators; owner, 2026-11-03: "the creators page for all
// of these sites as well... just a bubble and then a really nice formatted
// creators page, just like how RiftCompare does it"). The list is hand-curated
// in src/content/creators.ts: no database, no form, no account. A creator
// mentions or links DexCompare in their content; in return they get a card
// here (and the bubble on the homepage) with their socials and a "Buy them a
// pack" button to THEIR OWN tip page (Ko-fi, Patreon…): DexCompare never
// handles the money. Use the creator's own spelling and handles, and only
// links they show publicly. Never called "partners": that word means the
// affiliate links.
import { CREATORS } from "@/content/creators";

export type CreatorPlatform = "YouTube" | "TikTok" | "Instagram" | "Twitch" | "X" | "Threads" | "Facebook" | "Discord" | "Website";

export interface CreatorLink {
  platform: CreatorPlatform;
  url: string;
  /** As displayed, e.g. "@handle". */
  handle?: string;
}

export interface Creator {
  /** Stable id, lowercase with hyphens: the card's anchor (/creators#slug). */
  slug: string;
  name: string;
  /** What they make, one line. */
  blurb: string;
  /** Their channels, most important first. The first is the card's main link. */
  links: CreatorLink[];
  /** Their own tip page. Shown as "Buy them a pack". Omit if they have none. */
  tipUrl?: string;
  /** Short content tags, e.g. "Pack openings", "Set reviews". At most three show. */
  tags?: string[];
  /** Where they're based, if they're happy to say ("AU", "US"...). */
  region?: string;
  /** A square photo in public/img/creators/. Initials without one. */
  avatar?: string;
  /** ISO date the listing went live. Newest first. */
  since: string;
}

/** Newest first. Pure. */
export function featuredCreators(list: Creator[] = CREATORS): Creator[] {
  return [...list].sort((a, b) => b.since.localeCompare(a.since) || a.name.localeCompare(b.name));
}

/** "Some Creator" → "SC". Pure. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Each platform's own colour; white text on all of them is 4.5:1 or better. */
export const PLATFORM_STYLE: Record<CreatorPlatform, { bg: string; fg: string }> = {
  YouTube: { bg: "#CC0000", fg: "#fff" },
  TikTok: { bg: "#000000", fg: "#fff" },
  Instagram: { bg: "#C13584", fg: "#fff" },
  Twitch: { bg: "#7A3FD1", fg: "#fff" },
  X: { bg: "#000000", fg: "#fff" },
  Threads: { bg: "#000000", fg: "#fff" },
  Facebook: { bg: "#1877F2", fg: "#fff" },
  Discord: { bg: "#5865F2", fg: "#fff" },
  Website: { bg: "#3f3f46", fg: "#fff" },
};
