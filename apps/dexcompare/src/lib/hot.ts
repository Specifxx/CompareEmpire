// "Hot right now" — the demand the front page must catch, curated from what
// collectors are actually hunting on Reddit/forums and the market right now.
// PURE config (no DB): update entries + the `updated` stamp as demand shifts —
// no other code changes needed. Each entry deep-links to the surface that
// converts that demand (restock tracker, set page, sealed search, deals).
//
// June 2026 demand snapshot (sources: r/pkmntcg + market press):
//   - Chaos Rising (rel. 2026-05-22) sells out in minutes; ETBs $15-25 over MSRP.
//   - Ascended Heroes chase singles: Mega Gengar ex SIR ≈ US$900-950 raw,
//     Mega Charizard Y ex similar; "stack ETBs" investor chatter.
//   - Pitch Black (next ME set) releases 2026-07-17 — preorder hunting is live.
//   - 30th Celebration (2026-09-16, worldwide same-day): all-foil, base-set
//     Charizard reprint, 30 Pikachu variants — biggest hype of the year.
//   - Mega Evolution era + Z-A game tie-in is pulling in brand-new collectors.

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
    emoji: "🔥",
    title: "Chaos Rising",
    sub: "Sells out in minutes — live stock across every store + a free restock alert.",
    href: "/restock/chaos-rising",
    badge: "Restock watch",
    tone: "hot",
  },
  {
    emoji: "👑",
    title: "Ascended Heroes chases",
    sub: "Mega Gengar ex SIR trades near US$900 — compare every store before you overpay.",
    href: "/sets/ascended-heroes",
    badge: "Chase cards",
    tone: "chase",
  },
  {
    emoji: "📅",
    title: "Pitch Black — July 17",
    sub: "The next Mega Evolution set. Preorders are landing — find the cheapest now.",
    href: "/sealed?q=pitch%20black",
    badge: "Preorders",
    tone: "soon",
  },
  {
    emoji: "🎂",
    title: "30th Celebration — Sept 16",
    sub: "All-foil anniversary set with the Base Set Charizard reprint. Watch listings as they go live.",
    href: "/sealed?q=30th",
    badge: "Coming soon",
    tone: "soon",
  },
  {
    emoji: "💎",
    title: "Today's deals",
    sub: "Singles sitting 15–70% under TCGplayer market across our stores, right now.",
    href: "/deals",
    badge: "Live",
    tone: "live",
  },
  {
    emoji: "🕰️",
    title: "What are my old cards worth?",
    sub: "Base Set searches are surging on 30th-anniversary nostalgia — check any card's value free.",
    href: "/card-value",
    badge: "Value checker",
    tone: "chase",
  },
  {
    emoji: "⚡",
    title: "Perfect Order singles",
    sub: "The current standard set — every card priced across every store we track.",
    href: "/sets/perfect-order",
    badge: "Current set",
    tone: "live",
  },
];
