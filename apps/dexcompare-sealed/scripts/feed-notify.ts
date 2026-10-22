// The deal and restock feed's sender (lib/feed.ts decides what to say): reads the files the export just wrote (product stats, products,
// the price history) and data/public/feed-state.json, posts at most FEED_MAX_POSTS messages to Discord and/or Telegram, and writes the
// state back for the publish step to commit. OFF unless FEED_ENABLED=1 with a destination set; a failed send is logged and the run
// goes on (the import's publish must never wait on a chat service).
//
//   FEED_ENABLED=1 DISCORD_WEBHOOK_URL=… [TELEGRAM_BOT_TOKEN=… TELEGRAM_CHAT_ID=…] [FEED_REGIONS=au,us,uk] [FEED_MAX_POSTS=6] \
//     npx tsx scripts/feed-notify.ts [--dry-run]
import fs from "node:fs";
import path from "node:path";
import { detectEvents, emptyFeedState, feedConfig, FEED_STATE_FILE, messageFor, recordPosts, selectPosts, type FeedProduct, type FeedStat, type FeedState } from "../src/lib/feed";
import { dayOf, HISTORY_FILE, isPriceHistory } from "../src/lib/price-history";

const DIR = path.join(process.cwd(), "data", "public");
const read = <T>(f: string): T => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as T;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function send(url: string, body: unknown): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
    if (!r.ok) console.warn(`[feed] ${new URL(url).host}: HTTP ${r.status} ${(await r.text().catch(() => "")).slice(0, 200)}`);
    return r.ok;
  } catch (e) {
    console.warn(`[feed] ${new URL(url).host}: ${(e as Error).message}`);
    return false;
  }
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const cfg = feedConfig(process.env);
  if (!cfg.enabled && !dry) {
    console.log("[feed] off (FEED_ENABLED is not 1, or no Discord webhook / Telegram bot is set): nothing sent.");
    return;
  }
  const products = new Map(
    read<{ id: string; slug: string; name: string; productType: string; setCode: string | null }[]>("products.json").map((p) => [p.id, { slug: p.slug, name: p.name, productType: p.productType, setCode: p.setCode } as FeedProduct]),
  );
  const bySlug = new Map([...products.values()].map((p) => [p.slug, p]));
  const stats: FeedStat[] = read<{ productId: string; market: string; lowestPriceCents: number | null; medianOpenCents: number | null; inStockStores: number }[]>("product-stats.json")
    .map((s) => ({ market: s.market, slug: products.get(s.productId)?.slug ?? "", lowestPriceCents: s.lowestPriceCents, medianOpenCents: s.medianOpenCents, inStockStores: s.inStockStores }))
    .filter((s) => s.slug);
  let history = null;
  try {
    const h = read<unknown>(HISTORY_FILE);
    history = isPriceHistory(h) ? h : null;
  } catch {
    /* no history: deals only */
  }
  let state: FeedState = emptyFeedState();
  try {
    const s = read<FeedState>(FEED_STATE_FILE);
    if (s && s.v === 2) state = s;
  } catch {
    /* first run */
  }
  const today = dayOf(new Date());
  const events = detectEvents({ stats, products: bySlug, history, markets: cfg.markets });
  const posts = selectPosts(events, state, today, cfg.maxPosts);
  console.log(`[feed] ${events.length} events true now (${events.filter((e) => e.kind === "restock").length} restocks); ${posts.length} to post${state.run === 0 ? " (first run: recording only)" : ""}.`);
  const sent: typeof posts = [];
  for (const e of posts) {
    const text = messageFor(e);
    if (dry) {
      console.log(`--- ${e.kind} ${e.market}\n${text}`);
      sent.push(e);
      continue;
    }
    let ok = false;
    if (cfg.discordWebhook) ok = (await send(cfg.discordWebhook, { content: text, allowed_mentions: { parse: [] } })) || ok;
    if (cfg.telegram) ok = (await send(`https://api.telegram.org/bot${cfg.telegram.token}/sendMessage`, { chat_id: cfg.telegram.chatId, text, disable_web_page_preview: false })) || ok;
    if (ok) sent.push(e);
    await sleep(1500); // well under Discord's and Telegram's per-channel limits
  }
  if (!dry) fs.writeFileSync(path.join(DIR, FEED_STATE_FILE), JSON.stringify(recordPosts(state, events, sent, today)));
  console.log(`[feed] sent ${sent.length}.`);
}

main().catch((e) => {
  // never fail the import over the feed
  console.error("[feed] failed:", e);
});
