// CI guard against ACCIDENTALLY-DYNAMIC routes.
//
// A route that declares `export const revalidate` but isn't actually eligible for
// ISR loses its caching SILENTLY — Next.js just renders it per request. No error,
// no warning. Two separate incidents came out of this: Googlebot's crawl was
// throttled on ~20k "cached" card pages, and this site's Neon data-transfer
// allowance was exhausted twice by pages that pay their Postgres cost on every
// single visit instead of once per revalidate window.
//
// WHAT CHANGED (and why this script looked "clean" while 8 routes leaked):
// the old version grepped each file in isolation for four dynamic-API patterns
// (getCountry/getCurrentUser/getDisplayCurrency/next/headers). That misses
// everything else that voids ISR — `searchParams` (a dynamic API in Next 14), a
// dynamic segment with no `generateStaticParams` (Next never registers the route
// for ISR at all), unstable_noStore()/noStore()/draftMode(), `cache: "no-store"`,
// and any of the above reached through an import rather than written inline.
//
// So the authoritative check is no longer a source scan at all: it asserts
// against .next/prerender-manifest.json, which is Next's own record of what it
// actually cached. Every route that declares `revalidate` must appear in
// `routes` (prerendered/static ISR) or `dynamicRoutes` (on-demand ISR). If it's
// in neither, Next is rendering it dynamically — whatever the source says.
// That's ground truth and it closes all of the gaps above at once.
//
// A dynamic-segment ROUTE HANDLER can't be ISR-cached without
// generateStaticParams (e.g. /api/v1/card/[id]/prices.json), so for route.ts we
// accept an explicit `Cache-Control: s-maxage=…` instead — something has to be
// caching it.
//
// USAGE
//   npx tsx scripts/check-isr-leaks.ts            # assert if a fresh manifest exists, else hints only
//   npx tsx scripts/check-isr-leaks.ts --strict   # require a fresh manifest (run this AFTER `next build`)
//   npx tsx scripts/check-isr-leaks.ts --hints    # never assert; just print the static hints
//
// package.json currently runs this BEFORE `next build`, where no manifest for the
// current source exists yet — in that position it degrades to the fast static
// hint pass and exits 0. To get the real gate, run it AFTER the build:
//   "build": "prisma generate && next build && tsx scripts/check-isr-leaks.ts --strict"
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, basename, relative, sep } from "node:path";

const APP_ROOT = join(__dirname, "..");
const APP_DIR = join(APP_ROOT, "src", "app");
const MANIFEST = join(APP_ROOT, ".next", "prerender-manifest.json");

const argv = process.argv.slice(2);
const STRICT = argv.includes("--strict");
const HINTS_ONLY = argv.includes("--hints");

// ---------------------------------------------------------------------------
// Static hints. Cheap, file-local, and deliberately NON-FATAL: they can't see
// through imports, so a clean hint pass proves nothing (that's exactly how the
// old version reported "clean" while 8 routes leaked). They're here to name the
// likely cause next to a manifest failure, and to give the pre-build position
// something useful to say.
// ---------------------------------------------------------------------------
const HINT_PATTERNS: { re: RegExp; why: string; pagesOnly?: boolean }[] = [
  // Only meaningful for pages/metadata: in a route HANDLER, reading
  // `url.searchParams` is normal and the fix is a Cache-Control header, not
  // removing the read.
  { re: /\bsearchParams\b/, why: "reads searchParams (a dynamic API in Next 14 — forces per-request SSR)", pagesOnly: true },
  { re: /from\s+["']next\/headers["']/, why: "imports next/headers (cookies()/headers())" },
  { re: /\b(?:cookies|headers|draftMode)\s*\(\s*\)/, why: "calls cookies()/headers()/draftMode()" },
  { re: /\b(?:unstable_noStore|noStore)\s*\(/, why: "calls unstable_noStore()/noStore()" },
  { re: /\bgetCountry\s*\(/, why: "calls getCountry() (reads the country cookie)" },
  { re: /\bgetCurrentUser\s*\(/, why: "calls getCurrentUser() (reads the session cookie)" },
  { re: /\bgetDisplayCurrency\s*\(/, why: "calls getDisplayCurrency() (reads a cookie)" },
  { re: /cache\s*:\s*["']no-store["']/, why: 'fetches with cache: "no-store"' },
  { re: /next\s*:\s*\{[^}]*revalidate\s*:\s*0/, why: "fetches with next.revalidate = 0" },
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if ([".ts", ".tsx"].includes(extname(full))) out.push(full);
  }
  return out;
}

// Blank out comments so prose explaining a pattern (including this file's own
// header) never counts as usage. Not a parser — doesn't need to be.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

const METADATA_FILES = new Set([
  "sitemap",
  "robots",
  "manifest",
  "icon",
  "apple-icon",
  "opengraph-image",
  "twitter-image",
]);

interface RouteFile {
  file: string; // absolute
  rel: string; // src/app-relative, for messages
  kind: "page" | "route" | "metadata";
  /** Candidate route paths; the route is cached if ANY of them is in the manifest. */
  candidates: string[];
  revalidate: number | null;
  code: string; // comment-stripped source
  hasStaticParams: boolean;
  hasCacheControl: boolean;
  forceDynamic: boolean;
  dynamicSegment: boolean;
}

/** Directory segments -> URL path, dropping route groups and private folders. */
function segmentsToPath(relDir: string): string | null {
  const segs = relDir === "." ? [] : relDir.split(sep);
  const kept: string[] = [];
  for (const s of segs) {
    if (s.startsWith("(") && s.endsWith(")")) continue; // route group
    if (s.startsWith("@")) return null; // parallel route slot — not a URL
    if (s.startsWith("_")) return null; // private folder — never routable
    kept.push(s);
  }
  return "/" + kept.join("/");
}

function collect(): RouteFile[] {
  const out: RouteFile[] = [];
  for (const file of walk(APP_DIR)) {
    const raw = readFileSync(file, "utf8");
    const code = stripComments(raw);
    const m = /export\s+const\s+revalidate\s*=\s*([0-9_]+|false)/.exec(code);
    if (!m) continue;
    // `revalidate = 0` is an explicit "always dynamic" — nothing to cache, nothing
    // to leak.
    const revalidate = m[1] === "false" ? null : Number(m[1].replace(/_/g, ""));
    if (revalidate === 0) continue;

    const rel = relative(APP_DIR, file);
    const relDir = rel.includes(sep) ? rel.slice(0, rel.lastIndexOf(sep)) : ".";
    const dirPath = segmentsToPath(relDir);
    if (dirPath == null) continue;

    const name = basename(file, extname(file));
    let kind: RouteFile["kind"];
    let candidates: string[];
    if (name === "page") {
      kind = "page";
      candidates = [dirPath];
    } else if (name === "route") {
      kind = "route";
      candidates = [dirPath];
    } else if (METADATA_FILES.has(name)) {
      // Metadata routes get synthesised paths (/sitemap.xml,
      // /sitemap/[__metadata_id__], /icon, …) — accept any plausible spelling.
      kind = "metadata";
      const base = dirPath === "/" ? "" : dirPath;
      const suffix =
        name === "sitemap" ? "sitemap.xml" : name === "robots" ? "robots.txt" : name === "manifest" ? "manifest.webmanifest" : name;
      candidates = [`${base}/${suffix}`, `${base}/${name}`, `${base}/${name}/[__metadata_id__]`, `${base}/${suffix}/[__metadata_id__]`];
    } else {
      // A non-route file exporting `revalidate` does nothing at all — worth saying.
      out.push({
        file,
        rel,
        kind: "metadata",
        candidates: [],
        revalidate,
        code,
        hasStaticParams: false,
        hasCacheControl: false,
        forceDynamic: false,
        dynamicSegment: false,
      });
      continue;
    }

    out.push({
      file,
      rel,
      kind,
      candidates,
      revalidate,
      code,
      hasStaticParams: /export\s+(?:async\s+)?function\s+generateStaticParams|export\s+const\s+generateStaticParams/.test(code),
      // Look for a positive s-maxage/max-age ANYWHERE in the file, not only inline
      // in a headers object literal. Routes commonly hoist the value into a
      // `const CACHE_CONTROL = "public, s-maxage=3600, …"` and spread it into the
      // response — requiring the `"Cache-Control":` prefix on the same string made
      // every such route a false positive (it reported "nothing caches it" about
      // routes that were in fact CDN-cached).
      hasCacheControl: /\b(?:s-maxage|max-age)=([1-9][0-9]*)/.test(code),
      forceDynamic: /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(code),
      dynamicSegment: dirPath.includes("["),
    });
  }
  return out;
}

function hintsFor(rf: RouteFile): string[] {
  const hints: string[] = [];
  if (rf.forceDynamic) hints.push('also exports dynamic = "force-dynamic", which cancels revalidate outright');
  for (const { re, why, pagesOnly } of HINT_PATTERNS) {
    if (pagesOnly && rf.kind === "route") continue;
    if (re.test(rf.code)) hints.push(why);
  }
  if (rf.kind === "page" && rf.dynamicSegment && !rf.hasStaticParams) {
    hints.push("dynamic segment with no generateStaticParams — Next never registers the route for ISR, so revalidate is a no-op");
  }
  if (rf.kind === "route" && rf.dynamicSegment && !rf.hasStaticParams && !rf.hasCacheControl) {
    hints.push("dynamic-segment route handler with neither generateStaticParams nor a Cache-Control s-maxage — nothing caches it");
  }
  return hints;
}

/** Newest mtime under a directory (used to decide if the manifest is stale). */
function newestMtime(dir: string): number {
  let newest = 0;
  for (const file of walk(dir)) {
    const t = statSync(file).mtimeMs;
    if (t > newest) newest = t;
  }
  return newest;
}

function main() {
  const files = collect();
  const routeFiles = files.filter((f) => f.candidates.length > 0);

  // ---- static hints (never fatal) ----
  const hinted = routeFiles.map((rf) => ({ rf, hints: hintsFor(rf) })).filter((h) => h.hints.length > 0);
  if (hinted.length) {
    console.log("ISR hints — routes declaring `revalidate` with something in the file that can void it:");
    for (const { rf, hints } of hinted) {
      console.log(`  src/app/${rf.rel}`);
      for (const h of hints) console.log(`      · ${h}`);
    }
    console.log("");
  }
  for (const orphan of files.filter((f) => f.candidates.length === 0)) {
    console.log(`NOTE: src/app/${orphan.rel} exports \`revalidate\` but isn't a route file — it has no effect.\n`);
  }

  if (HINTS_ONLY) {
    console.log(`ISR leak check: hints only (${routeFiles.length} routes declare revalidate). Not asserting.`);
    return;
  }

  // ---- authoritative check: Next's own prerender manifest ----
  if (!existsSync(MANIFEST)) {
    const msg =
      "ISR leak check: INCONCLUSIVE — no .next/prerender-manifest.json.\n" +
      "  The authoritative check compares every route that declares `revalidate` against\n" +
      "  what Next actually cached, so it has to run AFTER `next build`.\n" +
      `  Run:  npx next build && npx tsx scripts/check-isr-leaks.ts --strict`;
    if (STRICT) {
      console.error(msg);
      process.exit(1);
    }
    console.log(msg);
    return;
  }

  // A manifest older than the source it's meant to describe can't prove anything
  // about the current code — don't fail on stale evidence.
  const manifestAge = statSync(MANIFEST).mtimeMs;
  const newestSource = Math.max(newestMtime(APP_DIR), newestMtime(join(APP_ROOT, "src", "lib")));
  if (newestSource > manifestAge) {
    const msg =
      "ISR leak check: INCONCLUSIVE — .next/prerender-manifest.json is older than src/.\n" +
      "  Rebuild before trusting it:  npx next build && npx tsx scripts/check-isr-leaks.ts --strict";
    if (STRICT) {
      console.error(msg);
      process.exit(1);
    }
    console.log(msg);
    return;
  }

  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
    routes?: Record<string, unknown>;
    dynamicRoutes?: Record<string, unknown>;
  };
  const cached = new Set([...Object.keys(manifest.routes ?? {}), ...Object.keys(manifest.dynamicRoutes ?? {})]);
  // Prerendered children of a metadata/dynamic route ("/sitemap/0.xml") stand in
  // for their parent, so accept a prefix match for those synthesised paths.
  const cachedList = [...cached];
  const isCached = (path: string) =>
    cached.has(path) ||
    (path.includes("[__metadata_id__]") && cachedList.some((c) => c.startsWith(path.replace("/[__metadata_id__]", "/"))));

  const leaks: { rf: RouteFile; hints: string[] }[] = [];
  const cdnOnly: RouteFile[] = [];
  const unresolved: RouteFile[] = [];

  for (const rf of routeFiles) {
    if (rf.candidates.some(isCached)) continue;
    // Route handlers on a dynamic segment can't be ISR-registered at all; an
    // explicit s-maxage means the CDN caches them instead, which is the fix.
    if (rf.kind === "route" && rf.hasCacheControl) {
      cdnOnly.push(rf);
      continue;
    }
    // Couldn't map the file to any path Next knows about → we can't prove
    // anything. Report, don't fail.
    if (rf.kind === "metadata") {
      unresolved.push(rf);
      continue;
    }
    leaks.push({ rf, hints: hintsFor(rf) });
  }

  for (const rf of cdnOnly) {
    console.log(`ok (CDN-cached, not ISR): src/app/${rf.rel} — dynamic-segment route handler with Cache-Control s-maxage.`);
  }
  for (const rf of unresolved) {
    console.log(`NOTE: couldn't resolve a route path for src/app/${rf.rel} — skipped (tried: ${rf.candidates.join(", ")}).`);
  }

  if (leaks.length) {
    console.error("\nISR LEAK: these routes declare `revalidate` but Next did NOT cache them.");
    console.error("They appear in neither `routes` nor `dynamicRoutes` in .next/prerender-manifest.json,");
    console.error("which means every request re-renders them and re-queries Postgres:\n");
    for (const { rf, hints } of leaks) {
      console.error(`  src/app/${rf.rel}   (route ${rf.candidates[0]}, revalidate = ${rf.revalidate})`);
      for (const h of hints) console.error(`      · ${h}`);
      if (!hints.length) console.error("      · no local cause found — check imported helpers for cookies()/headers()/noStore()");
    }
    console.error("\nFixes, in order of likelihood:");
    console.error("  1. Dynamic segment ([id]) with no generateStaticParams → add one (a FIXED small");
    console.error("     `take` head, try/catch → [] so a DB-less build still exits 0). See");
    console.error("     src/app/card/[id]/page.tsx.");
    console.error("  2. Reads `searchParams` → move the filter/sort/page state into a client island");
    console.error("     (useSearchParams inside <Suspense>) and keep the default view server-rendered.");
    console.error("     See src/app/pokemon/[slug]/SpeciesPrintings.tsx.");
    console.error("  3. Reads cookies/headers (directly or via getCountry/getCurrentUser/");
    console.error("     getDisplayCurrency) → move it to a client island, as CardMarketplace does.");
    console.error("  4. Route handler that genuinely can't be ISR-cached → set an explicit");
    console.error('     "Cache-Control: public, s-maxage=…" instead (see api/v1/card/[id]/prices.json).');
    console.error("  5. The route really is meant to be dynamic → delete `export const revalidate`");
    console.error("     so nobody reads it as a caching guarantee.");
    process.exit(1);
  }

  console.log(
    `\nISR leak check: clean — all ${routeFiles.length} routes declaring \`revalidate\` are cached ` +
      `(${routeFiles.length - cdnOnly.length - unresolved.length} in the prerender manifest, ${cdnOnly.length} CDN-cached).`
  );
}

main();
