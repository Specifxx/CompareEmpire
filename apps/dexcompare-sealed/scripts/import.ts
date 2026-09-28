// The scheduled job: read every store and TCGplayer, update the database, then
// ask the live site to re-render its cached pages.
//
//   DATABASE_URL=… npx tsx scripts/import.ts [--only au,cherry] [--concurrency 8]
//
// --only takes store keys and markets; "tcgplayer" (or "US") includes TCGplayer.
//
// Env: DATABASE_URL (required); NEXT_PUBLIC_SITE_URL + REVALIDATE_SECRET
// (refresh the live pages).
process.env.DEXCOMPARE_SCRIPT = "1";

import { appendFileSync } from "node:fs";
import { runImport } from "../src/lib/importer";
import { prisma } from "../src/lib/db";
import { SITE_URL } from "../src/lib/site";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

// A marketplace that hasn't been read for this long fails the job (see main).
const MARKETPLACE_STALE_MS = 48 * 3600_000;

async function revalidate(): Promise<string> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return "skipped (REVALIDATE_SECRET not set)";
  try {
    const res = await fetch(`${SITE_URL}/api/revalidate`, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
    return res.ok ? "ok" : `failed: HTTP ${res.status}`;
  } catch (e) {
    return `failed: ${(e as Error).message}`;
  }
}

async function main() {
  const only = opt("only")?.split(",").map((s) => (s.length === 2 ? s.toUpperCase() : s));
  const summary = await runImport({ only, concurrency: Number(opt("concurrency") ?? 3) });
  const reval = await revalidate();

  // "N stores" counts independent stores only; a marketplace is reported by name.
  const marketplaces = summary.marketplaces.map((m) => `${m.name} ${m.ok ? `read (${m.offers} offers)` : "NOT read"}`);
  const lines = [
    `## DexCompare import`,
    ``,
    [
      ...(summary.stores ? [`${summary.ok}/${summary.stores} stores read`] : []),
      ...marketplaces,
      `${summary.offers} offers written`,
      `${summary.stats} product×market summaries`,
      `${summary.minutes.toFixed(1)} min`,
    ].join(" · "),
    ``,
    `| Market | Stores | Read OK | Offers | In stock |`,
    `| --- | ---: | ---: | ---: | ---: |`,
    ...Object.entries(summary.byMarket)
      .sort()
      .map(([m, s]) => `| ${m} | ${s.stores} | ${s.ok} | ${s.offers} | ${s.inStock} |`),
    ``,
    `Low-price outliers dropped: ${summary.outliers}`,
    `Marketplace placeholder asks dropped: ${summary.placeholders}`,
    `Page refresh: ${reval}`,
    ``,
    summary.failed.length ? `### Not read this run (${summary.failed.length}) — their previous rows were kept` : ``,
    ...summary.failed.map((f) => `- ${f.market} \`${f.key}\`: ${f.error}`),
  ];
  console.log("\n" + lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  await prisma.$disconnect();

  // A failed marketplace read is an annotation on the run (GitHub shows
  // "::warning::" lines on the run page, not only in the log)...
  for (const m of summary.marketplaces) if (!m.ok) console.log(`::warning::${m.name} not read: ${m.error ?? "?"}`);
  const problems: string[] = [];
  // ...and a red run once it has lasted: TCGplayer's rows go "unknown" after
  // 72 hours and are pruned after 14 days, and it is the site's income.
  for (const m of summary.marketplaces) {
    const age = m.lastOkAt ? Date.now() - m.lastOkAt.getTime() : Infinity;
    if (!m.ok && age > MARKETPLACE_STALE_MS) {
      problems.push(`${m.name} has not been read for ${m.lastOkAt ? `${Math.round(age / 3600_000)} hours` : "any run yet"} (last error: ${m.error ?? "?"}).`);
    }
  }
  // A run that read almost nothing is broken (network, a platform change), not quiet.
  if (summary.stores > 10 && summary.ok < summary.stores * 0.5) problems.push(`Only ${summary.ok}/${summary.stores} stores read.`);
  // Nothing requested was read at all (e.g. --only tcgplayer, and it failed).
  const requested = summary.stores + summary.marketplaces.length;
  if (requested > 0 && summary.ok === 0 && summary.marketplaces.every((m) => !m.ok)) problems.push(`None of the ${requested} sources requested was read.`);
  if (problems.length) {
    for (const p of problems) console.log(`::error::${p}`);
    console.error(`${problems.join(" ")} Failing the job so it gets looked at.`);
    process.exit(1);
  }
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
