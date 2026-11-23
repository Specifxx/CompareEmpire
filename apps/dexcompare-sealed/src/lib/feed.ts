// The deal and restock feed: after each import, the notable changes go to a Discord webhook and a Telegram channel
// (scripts/feed-notify.ts, run by .github/workflows/dexcompare-sealed-import.yml between the export and the publish). Pure: the events,
// the rate limit, the dedupe and the messages are decided here and tested (tests/feed.test.ts); the script only reads the files and
// sends. OFF BY DEFAULT: nothing is sent unless FEED_ENABLED=1 and a destination is configured.
//
// TWO EVENTS, BOTH FROM REAL DATA:
//   • restock: a popular product (a headline type of one of lib/popular.ts's hot sets) that no store had in stock at the previous
//     daily snapshot and that one or more stores have in stock now (lib/price-history.ts: the series' latest point, today's, after a
//     point with zero stores).
//   • deal: a product whose cheapest in-stock price is at least 10% under the median of the 3+ stores that have it (lib/deals.ts's rule,
//     the one every card's badge and the /deals page use), never under half of it.
// DEDUPE: each (event, market, product) is posted at most once per COOLDOWN_DAYS (data/public/feed-state.json keeps when it was).
// RATE LIMIT: at most MAX_POSTS events a run, the biggest first, sent as ONE message (a "drop"), and at most one drop a UTC day
// (DECISIONS.md 2026-11-20: the shared Discord hub takes at most 3 drops a day, two of them the Sealed Sniper's). An event the day's
// drop already went out without stays eligible for the next one. Messages state facts and link the product page; no urgency words.
import { DEAL_MAX_RATIO, DEAL_MIN_RATIO, DEAL_MIN_STORES } from "./deals";
import { money, plural } from "./format";
import { isHotSet } from "./popular";
import type { PriceHistory } from "./price-history";
import { REGION_LIST, regionOfMarket } from "./regions";
import { SITE_URL } from "./site";

export const FEED_STATE_FILE = "feed-state.json";
export const COOLDOWN_DAYS = 7;
export const MAX_POSTS = 6;
/** The Telegram channel the drop also goes to when TELEGRAM_BOT_TOKEN is set. */
export const TELEGRAM_CHANNEL = "@tcgdealsrestocks";
/** The product types a restock is worth a post for (the headline ones). */
export const RESTOCK_TYPES = ["Booster Box", "Elite Trainer Box", "Booster Bundle", "Pokémon Center Elite Trainer Box", "Ultra-Premium Collection"];

export interface FeedProduct {
  slug: string;
  name: string;
  productType: string;
  setCode: string | null;
}

export interface FeedStat {
  market: string;
  slug: string;
  lowestPriceCents: number | null;
  medianOpenCents: number | null;
  inStockStores: number;
}

export type FeedEvent =
  | { kind: "restock"; market: string; product: FeedProduct; stores: number; cents: number | null }
  | { kind: "deal"; market: string; product: FeedProduct; stores: number; cents: number; median: number; pct: number };

export interface FeedState {
  v: 2;
  /** Runs so far (each import's feed step is one). */
  run: number;
  /** "<kind>|<market>|<slug>" → when it was last posted (UTC day) and the last run it was true in. */
  seen: Record<string, { posted: number; run: number }>;
  /** The UTC day of the last drop sent (one a day). */
  lastDrop?: number;
}

export const emptyFeedState = (): FeedState => ({ v: 2, run: 0, seen: {} });
export const eventKey = (e: Pick<FeedEvent, "kind" | "market"> & { product: Pick<FeedProduct, "slug"> }) => `${e.kind}|${e.market}|${e.product.slug}`;

export interface FeedConfig {
  enabled: boolean;
  /** The markets posted about (FEED_REGIONS, e.g. "au,us,uk"); all seven when empty. */
  markets: string[];
  maxPosts: number;
  discordWebhook: string | null;
  telegram: { token: string; chatId: string } | null;
}

/** The feed's settings from the environment: off unless FEED_ENABLED=1 and at least one destination is set. */
export function feedConfig(env: Record<string, string | undefined>): FeedConfig {
  const markets = (env.FEED_REGIONS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((r) => REGION_LIST.find((x) => x.region === r)?.market)
    .filter((m): m is NonNullable<typeof m> => !!m);
  const discord = env.DISCORD_WEBHOOK_URL?.trim() || null;
  const tgToken = env.TELEGRAM_BOT_TOKEN?.trim();
  // the family's one Telegram channel (t.me/tcgdealsrestocks, 2026-11-21) unless a variable names another
  const tgChat = env.TELEGRAM_CHAT_ID?.trim() || TELEGRAM_CHANNEL;
  const telegram = tgToken && tgChat ? { token: tgToken, chatId: tgChat } : null;
  const max = Number(env.FEED_MAX_POSTS);
  return {
    enabled: env.FEED_ENABLED === "1" && !!(discord?.startsWith("https://discord.com/api/webhooks/") || telegram),
    markets: markets.length ? markets : REGION_LIST.map((r) => r.market),
    maxPosts: Number.isInteger(max) && max > 0 ? Math.min(max, 20) : MAX_POSTS,
    discordWebhook: discord?.startsWith("https://discord.com/api/webhooks/") ? discord : null,
    telegram,
  };
}

/** The events in today's data: restocks of popular products (from the history) and deals (from today's stats). */
export function detectEvents(o: { stats: readonly FeedStat[]; products: ReadonlyMap<string, FeedProduct>; history: PriceHistory | null; markets: readonly string[] }): FeedEvent[] {
  const out: FeedEvent[] = [];
  const wanted = new Set(o.markets);
  for (const s of o.stats) {
    if (!wanted.has(s.market)) continue;
    const product = o.products.get(s.slug);
    if (!product) continue;
    // deal: the /deals rule
    if (
      s.inStockStores >= DEAL_MIN_STORES &&
      s.lowestPriceCents != null &&
      s.medianOpenCents != null &&
      s.lowestPriceCents <= s.medianOpenCents * DEAL_MAX_RATIO &&
      s.lowestPriceCents >= s.medianOpenCents * DEAL_MIN_RATIO
    ) {
      out.push({ kind: "deal", market: s.market, product, stores: s.inStockStores, cents: s.lowestPriceCents, median: s.medianOpenCents, pct: Math.round((1 - s.lowestPriceCents / s.medianOpenCents) * 100) });
    }
    // restock: a popular product whose latest snapshot (today's) follows one with no store in stock
    if (o.history && s.inStockStores > 0 && isHotSet(product.setCode) && RESTOCK_TYPES.includes(product.productType)) {
      const pts = o.history.series[s.market]?.[s.slug];
      const last = pts?.[pts.length - 1];
      const before = pts?.[pts.length - 2];
      if (last && before && last[0] === o.history.through && last[2] > 0 && before[2] === 0) {
        out.push({ kind: "restock", market: s.market, product, stores: s.inStockStores, cents: s.lowestPriceCents });
      }
    }
  }
  return out;
}

/**
 * What to post this run: events that have just BECOME true (not true in the previous run) and were not posted in the last
 * COOLDOWN_DAYS, restocks first, then the deepest deals, at most `max`. A deal that stays a deal is posted once, not every run. The
 * first run (no state yet) posts nothing: it only records what is true now, so the feed starts with changes, not a backlog.
 */
export function selectPosts(events: readonly FeedEvent[], state: FeedState, today: number, max: number): FeedEvent[] {
  if (state.run === 0 || state.lastDrop === today) return [];
  const fresh = events.filter((e) => {
    const s = state.seen[eventKey(e)];
    // never posted (an earlier run's limit left it out), or not true last run and out of its cooldown
    return !s || s.posted < 0 || (s.run < state.run && today - s.posted >= COOLDOWN_DAYS);
  });
  const score = (e: FeedEvent) => (e.kind === "restock" ? 1000 + e.stores : e.pct);
  return [...fresh].sort((a, b) => score(b) - score(a) || eventKey(a).localeCompare(eventKey(b))).slice(0, max);
}

/** The state after this run: every event true now marked with this run, the posted ones stamped with today; old entries forgotten. */
export function recordPosts(state: FeedState, events: readonly FeedEvent[], posted: readonly FeedEvent[], today: number): FeedState {
  const run = state.run + 1;
  const seen: FeedState["seen"] = {};
  for (const [k, v] of Object.entries(state.seen)) if (run - v.run < 60 || today - v.posted < COOLDOWN_DAYS) seen[k] = v;
  for (const e of events) {
    const k = eventKey(e);
    seen[k] = { posted: seen[k]?.posted ?? (state.run === 0 ? today : -Infinity), run };
  }
  for (const e of posted) seen[eventKey(e)] = { posted: today, run };
  // -Infinity (true now, never posted because the run's limit was reached) is kept as "not posted": it stays eligible next time it becomes true
  for (const v of Object.values(seen)) if (!Number.isFinite(v.posted)) v.posted = -100000;
  const lastDrop = posted.length ? today : state.lastDrop;
  return lastDrop == null ? { v: 2, run, seen } : { v: 2, run, seen, lastDrop };
}

/** A drop's id, "dex-feed-YYYYMMDDHH" (UTC), carried in every link as utm_content so each drop's clicks can be counted. */
export const feedDropId = (ms: number): string => `dex-feed-${new Date(ms).toISOString().slice(0, 13).replace(/[-T]/g, "")}`;

/** Discord's message limit (Telegram's is larger). */
export const DROP_MAX_CHARS = 2000;

/**
 * The run's ONE message: a header line, then each event's message, as many as fit in DROP_MAX_CHARS, biggest first. Returns the
 * text and the events it holds (the rest are not marked posted, so they stay eligible).
 */
/** The Chrome extension's launch line (owner's ask via the extension thread, 2026-11-22): under the drop's header for 7 days,
 * then gone by itself. One text serves Discord and Telegram, so it carries the feed's own utm_source=chat. */
export const EXTENSION_PROMO_UNTIL = Date.UTC(2026, 11, 21, 12, 0);
export function extensionPromo(now: number): string | null {
  if (now >= EXTENSION_PROMO_UNTIL) return null;
  return "🧩 See what you'd save on TCGplayer and other shops: free Chrome extension https://chromewebstore.google.com/detail/fdhpgledimoadpaokiipficepklogmha?utm_source=chat&utm_medium=social&utm_campaign=extension";
}

export function dropFor(events: readonly FeedEvent[], drop: string, now = Date.now()): { text: string; events: FeedEvent[] } {
  const parts: string[] = [];
  const held: FeedEvent[] = [];
  const promo = extensionPromo(now);
  const header = (n: number) => `Dex deal drop: ${plural(n, "change")} in today's store prices.${promo ? `\n${promo}` : ""}`;
  for (const e of events) {
    const next = [header(held.length + 1), ...parts, messageFor(e, drop)].join("\n\n");
    if (next.length > DROP_MAX_CHARS) break;
    parts.push(messageFor(e, drop));
    held.push(e);
  }
  return { text: held.length ? [header(held.length), ...parts].join("\n\n") : "", events: held };
}

/** One message, as plain text (Discord and Telegram both take it): what happened, the price, how many stores, the link. */
export function messageFor(e: FeedEvent, drop?: string): string {
  const r = regionOfMarket(e.market)!;
  // tagged so the growth report can count visits from the chat channels (utm convention, 18 Nov 2026)
  const url = `${SITE_URL}/${r.region}/p/${e.product.slug}?utm_source=chat&utm_medium=social&utm_campaign=dex-feed${drop ? `&utm_content=${drop}` : ""}`;
  if (e.kind === "restock") {
    return `${r.flag} In stock: ${e.product.name}\nNow at ${plural(e.stores, `${r.adjective} store`)}${e.cents != null ? `, from ${money(e.cents, e.market)}` : ""}. None had it at our previous daily check.\n${url}`;
  }
  return `${r.flag} Deal: ${e.product.name}\n${money(e.cents, e.market)}, ${e.pct}% under the median of ${plural(e.stores, `${r.adjective} store`)} with it in stock today.\n${url}`;
}
