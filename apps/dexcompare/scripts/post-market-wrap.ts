// Daily Market Wrap social bot. Computes today's wrap edition straight from the
// database (computeWrap — no next/cache, so it runs fine under tsx), formats a
// compact post, and fires it to whichever socials have secrets configured
// (Bluesky / Telegram / Discord — all optional). Runs as the final step of the
// daily price-refresh workflow, AFTER today's PriceHistory snapshot is written.
//
// Best-effort by design: any failure (no wrap yet, a provider down, no secrets)
// exits 0 with a log line — a socials hiccup must never fail the price pipeline.
//
//   DATABASE_URL=... HISTORY_DATABASE_URL=... npx tsx scripts/post-market-wrap.ts [--dry-run]
import { prisma } from "../src/lib/db";
import { dbHistory } from "../src/lib/db-history";
import { latestWrapDay, computeWrap } from "../src/lib/market-wrap";
import { postToSocials } from "../src/lib/social";
import { SITE_URL } from "../src/lib/site";

const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const day = await latestWrapDay();
  if (!day) {
    console.log("[post-market-wrap] no wrap day yet (need ≥2 snapshot days) — nothing to post.");
    return;
  }
  const wrap = await computeWrap(day);
  if (!wrap) {
    console.log(`[post-market-wrap] wrap for ${day} not computable — nothing to post.`);
    return;
  }

  const url = `${SITE_URL}/blog/market-wrap/${wrap.day}`;
  const top = wrap.insight?.gainers?.[0] ?? null;
  const drop = wrap.insight?.losers?.[0] ?? null;

  // Build a compact, human post. Headline is already a finished sentence.
  const lines: string[] = [];
  const idx = wrap.globalD1 == null ? "" : `${wrap.globalD1 > 0 ? "📈" : wrap.globalD1 < 0 ? "📉" : "➖"} `;
  lines.push(`${idx}Pokémon TCG market — ${wrap.day}`);
  if (wrap.globalD1 != null) lines.push(`Global Index ${pct(wrap.globalD1)} (${wrap.marketsUp}▲ / ${wrap.marketsDown}▼ markets)`);
  if (top) lines.push(`Top riser: ${top.name} (${top.setCode.toUpperCase()}) ${pct(top.pct)}`);
  if (drop) lines.push(`Biggest faller: ${drop.name} (${drop.setCode.toUpperCase()}) ${pct(drop.pct)}`);
  lines.push(url);
  const text = lines.join("\n");

  if (dryRun) {
    console.log("[post-market-wrap] DRY RUN — would post:\n" + text);
    return;
  }

  const results = await postToSocials({ text, url });
  if (results.length === 0) {
    console.log("[post-market-wrap] no social secrets configured — skipped (this is fine).");
    return;
  }
  for (const r of results) {
    console.log(`[post-market-wrap] ${r.provider}: ${r.ok ? "OK" : "FAILED"}${r.detail ? ` (${r.detail})` : ""}`);
  }
}

main()
  .catch((e) => {
    // Never fail the pipeline on a social error.
    console.error("[post-market-wrap] error (non-fatal):", (e as Error).message);
  })
  .finally(async () => {
    await Promise.all([prisma.$disconnect(), dbHistory.$disconnect()]);
  });
