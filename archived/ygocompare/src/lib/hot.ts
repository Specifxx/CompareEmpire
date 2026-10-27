export interface HotItem { emoji: string; title: string; sub: string; href: string; badge: string; tone: "hot" | "live" | "soon" | "chase"; }
export const HOT_UPDATED = "June 2026";
export const HOT_ITEMS: HotItem[] = [
  { emoji: "🐉", title: "Blue-Eyes White Dragon", sub: "The original chase card — from 2002 LOB to Quarter Century reprints. Compare every store.", href: "/browse?q=blue-eyes", badge: "Iconic", tone: "chase" },
  { emoji: "🎴", title: "Quarter Century Secret Rares", sub: "The 25th-anniversary chase rarity — Ash Blossom, Maxx C & more. Track prices across stores.", href: "/browse?rarity=Quarter%20Century%20Secret%20Rare&sort=price_desc", badge: "Chase rarity", tone: "hot" },
  { emoji: "🔥", title: "Snake-Eye staples", sub: "The meta deck everyone's buying into — Snake-Eye Ash and the engine, priced across every store.", href: "/browse?q=snake-eye", badge: "Meta", tone: "live" },
  { emoji: "📈", title: "Today's deals", sub: "Singles sitting well under market across our stores, right now.", href: "/deals", badge: "Live", tone: "live" },
  { emoji: "🛡️", title: "Hand traps", sub: "Ash Blossom, Maxx \"C\", Effect Veiler, Infinite Impermanence — the cards every deck runs.", href: "/browse?q=ash%20blossom", badge: "Staples", tone: "live" },
  { emoji: "🕰️", title: "What are my cards worth?", sub: "From 2002 Blue-Eyes to the latest Secret Rares — check any card's live value for free.", href: "/card-value", badge: "Value checker", tone: "chase" },
  { emoji: "🆕", title: "Alliance Insight", sub: "The newest core set — every card priced across every store we track.", href: "/sets/alliance-insight", badge: "Current set", tone: "live" },
  { emoji: "📦", title: "Sealed product deals", sub: "Booster boxes & structure decks — compare every store to buy for less.", href: "/sealed", badge: "Sealed", tone: "live" },
];
