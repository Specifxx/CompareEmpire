// "Hot right now" — PURE config (no DB). Each entry deep-links to the surface
// that converts that demand.
export interface HotItem { emoji: string; title: string; sub: string; href: string; badge: string; tone: "hot" | "live" | "soon" | "chase"; }
export const HOT_UPDATED = "June 2026";
export const HOT_ITEMS: HotItem[] = [
  { emoji: "🏴‍☠️", title: "Romance Dawn (OP01)", sub: "The first set — scarce reprints, hot leaders. Compare every store before you chase them.", href: "/sets/romance-dawn", badge: "First set", tone: "chase" },
  { emoji: "🔴", title: "Shanks chase cards", sub: "Emperors in the New World secret rares trade high — compare every store first.", href: "/browse?q=shanks", badge: "Chase cards", tone: "chase" },
  { emoji: "⚡", title: "Gear 5 Luffy", sub: "The Awakening of the New Era alt-art everyone wants — track its price across stores.", href: "/browse?q=luffy&sort=price_desc", badge: "Alt-art", tone: "hot" },
  { emoji: "📈", title: "Today's deals", sub: "Singles sitting well under market across our stores, right now.", href: "/deals", badge: "Live", tone: "live" },
  { emoji: "👑", title: "Leader cards", sub: "Every deck starts with a Leader. Find the cheapest copy across stores and eBay.", href: "/browse?type=Leader", badge: "Staples", tone: "live" },
  { emoji: "🕰️", title: "What are my cards worth?", sub: "From OP01 to the latest set — check any card's live value for free.", href: "/card-value", badge: "Value checker", tone: "chase" },
  { emoji: "🆕", title: "A Fist of Divine Speed (OP11)", sub: "The newest set — every card priced across every store we track.", href: "/sets/a-fist-of-divine-speed", badge: "Current set", tone: "live" },
  { emoji: "📦", title: "Sealed product deals", sub: "Booster boxes & starter decks — compare every store to buy for less.", href: "/sealed", badge: "Sealed", tone: "live" },
];
