// The product page says what the feed cannot. A Shopify feed reports `available: true` for a box the store will not sell online:
// stock held for the shop counter ("In Store Only"), a shop whose checkout is switched off ("Online ordering temporarily
// unavailable"). Visitors found these as the cheapest "in stock" prices (Reddit, 2026-11-09: Dynamic Card Collectors, Wulf
// Gaming and CARDPOPUSA on the Delta Reign ETB). The importer opens the page of every row that would sit among the cheapest
// in stock and writes the rows that fail as sold out. Rules here may only refuse more, never loosen; a page that cannot be read
// is believed (fail open), so a slow store never empties the site.

// Page text outside scripts, styles, svg and comments. The wording of a theme's script (Wulf's "Not sold online" sits in the
// JS of every product page) must not count; only what the server rendered into the page does.
export function visiblePageText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ");
}

// The whole shop cannot take an order online: the same banner shows on every product page.
const SHOP_CLOSED_ONLINE = /\bonline\s+(?:ordering|orders|shopping|store|checkout)\s+(?:is\s+|are\s+)?(?:currently\s+|temporarily\s+)?(?:unavailable|disabled|closed|paused|suspended|offline|not\s+available)\b|\bwebsite\s+(?:is\s+)?(?:currently\s+)?(?:closed|not\s+taking\s+orders)\b|\bnot\s+(?:currently\s+)?(?:accepting|taking)\s+(?:any\s+)?online\s+orders\b/i;

// This item is for the shop counter only.
const ITEM_NOT_ONLINE = /\bin[- ]?store\s+only\b|\bnot\s+(?:sold|available(?:\s+to\s+buy)?)\s+online\b|\bavailable\s+(?:to\s+buy\s+)?in[- ]?(?:store|person)\s+only\b|\bin[- ]?(?:store|person)\s+purchase\s+only\b|\bnot\s+available\s+for\s+(?:online\s+)?(?:purchase|shipping|delivery)\b/i;

// Markup a theme renders for a held-for-the-shop product (Wulf Gaming: `<form class="wsc-form ... is-instore">`).
const ITEM_HELD_CLASS = /\bclass\s*=\s*["'][^"']*\b(?:is-instore|in-store-only|instore-only)\b[^"']*["']/i;

// The page gates the sale behind an account, a raffle or an invitation: a price a visitor cannot simply pay (2026-11-12, Reddit on the
// Delta Reign ETB: "most of the cheapest prices are invite only", raffles, lotteries, "play at the shop's card events a few times" to
// qualify). GameOn.games' Gatekeeper says "Please sign in to view this release", "Account at least 7 days old", "At least 1 prior
// order", "Raffle Entry" and carries `gate_keeper` in its markup. Wording only a gate uses; a bare "raffle" in a footer does not count.
const SALE_GATED = new RegExp(
  [
    String.raw`\braffle\s+entr(?:y|ies)\b|\benter\s+(?:the\s+|our\s+)?(?:raffle|lottery|draw)\b|\blottery\s+(?:entry|sale)\b`,
    String.raw`\ballocated\s+via\s+the\s+lottery\b|\blottery\s+system\b|\brestricted\s+product\b|\bqualify\s+you\s+as\s+a\s+local\s+player\b`,
    String.raw`\bsign\s*in\s+to\s+view\s+(?:this|the)\s+(?:release|product|item)\b`,
    String.raw`\baccount\s+(?:must\s+be\s+|needs\s+to\s+be\s+)?at\s+least\s+\d+\s+(?:days?|weeks?|months?)\s+old\b`,
    String.raw`\bat\s+least\s+\d+\s+prior\s+orders?\b|\bspent\s+at\s+least\s+[£$€]\s?\d`,
    String.raw`\binvit(?:e|ation)[- ]?only\b|\bby\s+invitation\b|\binvitation\s+(?:required|only)\b|\brequest\s+(?:an?\s+)?invit(?:e|ation)\b`,
    String.raw`\b(?:must|need\s+to|required\s+to)\s+(?:have\s+)?(?:attend(?:ed)?|play(?:ed)?)\b[^.]{0,80}\bevents?\b`,
    String.raw`\bto\s+(?:qualify|be\s+eligible)\s+(?:to\s+(?:buy|purchase)|for\s+(?:purchase|this\s+release))\b`,
  ].join("|"),
  "i",
);
// Markup of the Gatekeeper app (present without JavaScript).
const GATE_MARKUP = /\bgate_keeper\b|\bgatekeeper\.[a-z0-9.-]+|data-verify-checkout-releases-only/i;

export type PageVerdict = { ok: true } | { ok: false; reason: string; shopWide: boolean };

/** What a product page's own text says about buying it online. Pure. */
export function pageStockVerdict(html: string): PageVerdict {
  const text = visiblePageText(html);
  if (SHOP_CLOSED_ONLINE.test(text)) return { ok: false, reason: "online ordering unavailable", shopWide: true };
  if (ITEM_NOT_ONLINE.test(text)) return { ok: false, reason: "in store only", shopWide: false };
  // The class check runs on the raw page but only counts markup, never script text (scripts removed here).
  const markup = html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, " ");
  if (ITEM_HELD_CLASS.test(markup)) return { ok: false, reason: "held for the shop", shopWide: false };
  if (SALE_GATED.test(text) || GATE_MARKUP.test(html)) return { ok: false, reason: "sale gated (raffle, invite or account rules)", shopWide: false };
  return { ok: true };
}
