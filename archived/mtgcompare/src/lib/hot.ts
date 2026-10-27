// "Hot right now" — the demand the front page must catch. PURE config (no DB):
// update entries + the `updated` stamp as demand shifts — no other code changes
// needed. Each entry deep-links to the surface that converts that demand.

export interface HotItem {
  emoji: string;
  title: string;
  sub: string; // one-line hook
  href: string;
  badge: string; // short chip text
  tone: "hot" | "live" | "soon" | "chase"; // chip colour
}

export const HOT_UPDATED = "June 2026";

export const HOT_ITEMS: HotItem[] = [
  {
    emoji: "💎",
    title: "The Power Nine",
    sub: "Black Lotus, the Moxen, Ancestral Recall — compare every store before you chase the grails.",
    href: "/browse?set=lea&sort=price_desc",
    badge: "Chase cards",
    tone: "chase",
  },
  {
    emoji: "🔥",
    title: "Final Fantasy singles",
    sub: "The Universes Beyond crossover everyone's hunting — Sephiroth, Cloud & more across every store.",
    href: "/sets/final-fantasy",
    badge: "Hot set",
    tone: "hot",
  },
  {
    emoji: "💍",
    title: "The One Ring",
    sub: "The most famous modern chase card. Track its price across every store we compare.",
    href: "/browse?q=the%20one%20ring",
    badge: "Modern chase",
    tone: "chase",
  },
  {
    emoji: "📈",
    title: "Today's deals",
    sub: "Singles sitting well under market across our stores, right now.",
    href: "/deals",
    badge: "Live",
    tone: "live",
  },
  {
    emoji: "🗺️",
    title: "Fetch & dual lands",
    sub: "The lands every deck wants. Find the cheapest copy across stores and eBay.",
    href: "/browse?domain=Land&sort=price_desc",
    badge: "Staples",
    tone: "live",
  },
  {
    emoji: "🕰️",
    title: "What are my old cards worth?",
    sub: "From Alpha to modern mythics — check any card's live value for free.",
    href: "/card-value",
    badge: "Value checker",
    tone: "chase",
  },
  {
    emoji: "🐉",
    title: "Tarkir: Dragonstorm",
    sub: "A recent Standard set — every card priced across every store we track.",
    href: "/sets/tarkir-dragonstorm",
    badge: "Current set",
    tone: "live",
  },
  {
    emoji: "📦",
    title: "Sealed product deals",
    sub: "Play boxes, collector boxes & bundles — compare every store to buy for less.",
    href: "/sealed",
    badge: "Sealed",
    tone: "live",
  },
];
