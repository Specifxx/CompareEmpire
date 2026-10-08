// The daily eBay listing import: GitHub Actions runs this once a day (.github/workflows/dexcompare-ebay-import.yml).
//
//   DATABASE_URL=… EBAY_CLIENT_ID=… EBAY_CLIENT_SECRET=… npx tsx scripts/ebay-import.ts \
//        [--dry-run] [--only chase,sealed,types,sets,items] [--max-calls N] [--force]
//
// It reads ProductStat/Offer, plans which eBay searches to make (src/lib/ebay-import.ts: priority, caps,
// eligibility), reserves each Browse call in the database BEFORE making it (one atomic statement: overlapping runs
// and manual dispatches cannot pass the daily cap), searches with concurrency 3, and REPLACES each feed's rows in the
// EbayListing table (never appends; an empty or failed refresh keeps the old rows until the age bound). It ends with
// the purge of rows older than the bound + 4 h. The website reads the table; only this job holds eBay credentials.
//
// A feed whose rows are fresher than a quarter of the age bound (6.5 h by default) is not bought again (a re-run, an overlapping
// run, a retry after a crash); --force buys everything again. The run stops, with ::error::, when eBay refuses the keyset (401/403
// on a search), or 20 searches in a row fail, or 60 in a row come back with no listings at all.
//
// --dry-run prints the plan and the expected calls: no network and no database writes (it does read the product tables).
// Env: DATABASE_URL; EBAY_CLIENT_ID / EBAY_CLIENT_SECRET (DEXCOMPARE_EBAY_CLIENT_ID / _SECRET win when set);
// optional EBAY_DAILY_CAP (2400, max 2500), EBAY_RUN_CAP (2000), EBAY_LISTING_MAX_AGE_HOURS (26).
// Exit 1: token failure (only eBay's OAuth error category is printed), or fewer than half of the planned feeds refreshed.
process.env.DEXCOMPARE_SCRIPT = "1";

import { appendFileSync } from "node:fs";
import { prisma } from "../src/lib/db";
import { keysPresent, realDeps, type EbayEnv } from "../src/lib/ebay-api";
import { BREAKER_EMPTY, BREAKER_FAILURES, BUCKETS, runImport, type Bucket, type CapEnv } from "../src/lib/ebay-import";
import { capacityReport, runReport } from "../src/lib/ebay-report";
import { prismaImportDb } from "../src/lib/ebay-store";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

function summaryFile(lines: string[]) {
  console.log("\n" + lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
}

async function main() {
  const dry = flag("dry-run");
  const onlyArg = opt("only");
  const only = onlyArg ? (onlyArg.split(",").map((s) => s.trim()).filter(Boolean) as Bucket[]) : undefined;
  if (only?.some((b) => !BUCKETS.includes(b))) {
    console.error(`--only takes ${BUCKETS.join(", ")}`);
    process.exit(2);
  }
  const maxCalls = opt("max-calls") !== undefined ? Number(opt("max-calls")) : undefined;
  if (maxCalls !== undefined && !(Number.isFinite(maxCalls) && maxCalls >= 0)) {
    console.error("--max-calls takes a number");
    process.exit(2);
  }
  if (!dry && !keysPresent(process.env as EbayEnv)) {
    summaryFile(["## DexCompare eBay import", "", "EBAY_CLIENT_ID / EBAY_CLIENT_SECRET are not set for this job: nothing imported (the site keeps showing the previous listings until they age out)."]);
    return;
  }

  const summary = await runImport(
    { db: prismaImportDb(prisma), api: realDeps(), env: process.env as CapEnv, log: (l) => console.log(l) },
    { dryRun: dry, only, maxCalls, force: flag("force") },
  );

  const lines = ["## DexCompare eBay import", "", ...runReport(summary), ...(dry ? ["", "### Capacity model", "", ...capacityReport(summary.plan)] : [])];
  summaryFile(lines);
  await prisma.$disconnect();

  if (dry) return;
  const problems: string[] = [];
  if (summary.stopped === "token") problems.push(`eBay token request failed: ${summary.tokenError ?? "error"}. Check the keys are a PRODUCTION keyset (not Sandbox) with Buy API access.`);
  else if (summary.stopped === "forbidden") problems.push(`eBay refused the search (${summary.tokenError ?? "http 401/403"}). The keyset needs Buy API (Browse) access in the production environment; see DEPLOY.md, Troubleshooting. The run stopped after the first refusal.`);
  else if (summary.stopped === "failing") problems.push(`${BREAKER_FAILURES} searches in a row failed (last: ${summary.tokenError ?? "error"}); the run stopped to protect the daily call budget.`);
  else if (summary.stopped === "empty") problems.push(`${BREAKER_EMPTY} searches in a row returned no listings at all; the run stopped to protect the daily call budget. Check the filter syntax and the keyset (DEPLOY.md, Troubleshooting).`);
  else if (summary.feedsPlanned > 0 && summary.feedsRefreshed < summary.feedsPlanned * 0.5) {
    problems.push(`Only ${summary.feedsRefreshed} of ${summary.feedsPlanned} planned feeds refreshed${summary.stopped ? ` (run stopped: ${summary.stopped})` : ""}.`);
  }
  if (summary.stopped === "rate-limited") console.log("::warning::eBay answered 429 (rate limited): the run stopped; the previous rows were kept.");
  if (problems.length) {
    for (const p of problems) console.log(`::error::${p}`);
    process.exit(1);
  }
}

main().catch(async (e) => {
  // No detail beyond the error's name: nothing here may print a credential.
  console.log(`::error::eBay import failed unexpectedly (${e instanceof Error ? e.name : "error"}${e && typeof e === "object" && "code" in e ? ` ${String((e as { code: unknown }).code)}` : ""}).`);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
