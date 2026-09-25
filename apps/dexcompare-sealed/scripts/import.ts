// The scheduled job: read every store, update the database, email restock
// alerts, then ask the live site to re-render its cached pages.
//
//   DATABASE_URL=… npx tsx scripts/import.ts [--only au,cherry] [--concurrency 8]
//
// Env: DATABASE_URL (required); RESEND_API_KEY + EMAIL_FROM (alerts);
// NEXT_PUBLIC_SITE_URL + REVALIDATE_SECRET (refresh the live pages).
process.env.DEXCOMPARE_SCRIPT = "1";

import { appendFileSync } from "node:fs";
import { runImport } from "../src/lib/importer";
import { runRestockAlerts } from "../src/lib/restock-alerts";
import { prisma } from "../src/lib/db";
import { SITE_URL } from "../src/lib/site";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

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
  const alerts = await runRestockAlerts();
  const reval = await revalidate();

  const lines = [
    `## DexCompare import`,
    ``,
    `${summary.ok}/${summary.stores} stores read · ${summary.offers} offers written · ${summary.stats} product×market summaries · ${summary.minutes.toFixed(1)} min`,
    ``,
    `| Market | Stores | Read OK | Offers | In stock |`,
    `| --- | ---: | ---: | ---: | ---: |`,
    ...Object.entries(summary.byMarket)
      .sort()
      .map(([m, s]) => `| ${m} | ${s.stores} | ${s.ok} | ${s.offers} | ${s.inStock} |`),
    ``,
    `Low-price outliers dropped: ${summary.outliers}`,
    `Restock alerts: ${alerts.skipped ?? `${alerts.emailed} emails (${alerts.alerts} alerts), ${alerts.rearmed} re-armed`}`,
    `Page refresh: ${reval}`,
    ``,
    summary.failed.length ? `### Stores not read this run (${summary.failed.length}) — their previous rows were kept` : ``,
    ...summary.failed.map((f) => `- ${f.market} \`${f.key}\`: ${f.error}`),
  ];
  console.log("\n" + lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  await prisma.$disconnect();
  // A run that read almost nothing is broken (network, a platform change), not quiet.
  if (summary.stores > 10 && summary.ok < summary.stores * 0.5) {
    console.error(`Only ${summary.ok}/${summary.stores} stores read — failing the job so it gets looked at.`);
    process.exit(1);
  }
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
