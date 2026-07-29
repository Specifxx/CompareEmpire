// CI guard: a route declaring `export const revalidate` that ALSO calls a
// dynamic API (cookies()/headers(), or the app's own getCountry()/
// getCurrentUser()/getDisplayCurrency() wrappers around them) silently loses
// its ISR caching — Next.js just renders it dynamically on every request, no
// error, no warning. This is the exact failure mode that stalled Google
// indexation before (a session-cookie read in the marketplace island forced
// all ~20k card pages to per-request SSR) and, separately, is a live Neon-
// egress risk (a "cached" page that's secretly dynamic pays its DB cost on
// every visit instead of once per revalidate window).
//
// Only matches real usage (import lines / actual calls with parens), not
// comment prose explaining the pattern — a naive text grep flags this file's
// own explanatory comments as leaks.
//
// Usage: npx tsx scripts/check-isr-leaks.ts   (exit 1 + prints offenders on a leak)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const APP_DIR = join(__dirname, "..", "src", "app");

const DYNAMIC_PATTERNS = [
  /\bgetCountry\s*\(/,
  /\bgetCurrentUser\s*\(/,
  /\bgetDisplayCurrency\s*\(/,
  /from\s+["']next\/headers["']/,
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if ([".ts", ".tsx"].includes(extname(full))) out.push(full);
  }
  return out;
}

function stripComments(src: string): string {
  // Good enough for this check: blank out // line comments and /* */ blocks
  // so pattern matches inside prose don't count. Not a full parser — doesn't
  // need to be, this only needs to avoid the specific false positives above.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function main() {
  const files = walk(APP_DIR);
  const leaks: string[] = [];

  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    if (!/export const revalidate/.test(raw)) continue;
    const code = stripComments(raw);
    if (DYNAMIC_PATTERNS.some((p) => p.test(code))) {
      leaks.push(file.replace(APP_DIR, "src/app"));
    }
  }

  if (leaks.length) {
    console.error("ISR LEAK: these routes declare `revalidate` but also call a dynamic API,");
    console.error("which silently disables their caching (no error, no warning, just per-request SSR):\n");
    for (const l of leaks) console.error(`  ${l}`);
    console.error("\nEither remove the dynamic-API call (move it to a client island, matching the");
    console.error("CardMarketplace pattern on the card page) or remove `export const revalidate`");
    console.error("if the route is genuinely meant to be dynamic.");
    process.exit(1);
  }

  console.log(`ISR leak check: clean (${files.length} route files scanned).`);
}

main();
