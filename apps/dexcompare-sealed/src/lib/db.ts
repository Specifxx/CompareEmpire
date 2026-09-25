import { PrismaClient } from "@prisma/client";

// ─── DATA-EGRESS RULES (read before adding a query) ────────────────────────────
// Neon's free tier allows 5 GB/month of network transfer. The old DexCompare
// killed two databases by breaking it, and Rift Compare has lost a dozen more,
// so these are the rules this codebase starts from (src/lib/db.ts in Rift):
//
//   1. A query on the request path is scoped to one entity or one page of rows —
//      never a whole table. The listing pages read ProductStat (precomputed by
//      the importer), not an aggregate over Offer.
//   2. `select` only the columns you render, and `take` a cap wherever the row
//      count isn't bounded by the entity.
//   3. Whole-table reads belong in scripts/import.ts, never in a page.
//   4. Pages are ISR-cached (`export const revalidate`, generateStaticParams
//      returning []) and re-rendered after each import via /api/revalidate. No
//      unstable_cache anywhere: its TTL leaks to the whole route segment, and a
//      short one silently re-runs every query on the page.
//
// The guard below makes a violation visible: any single query returning a big
// payload logs to the Vercel function log instead of quietly burning allowance.
// ────────────────────────────────────────────────────────────────────────────────
const BIG_ROWS = 300;
const BIG_BYTES = 500_000;

// Neon suspends idle computes; a generous connect_timeout rides out the resume
// instead of failing the first request after a quiet spell with P1001.
function withConnectTimeout(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "15");
    return u.toString();
  } catch {
    return url;
  }
}

function makeClient() {
  const base = new PrismaClient({
    datasourceUrl: withConnectTimeout(process.env.DATABASE_URL),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const res = await query(args);
          if (process.env.DEXCOMPARE_SCRIPT !== "1" && Array.isArray(res) && res.length >= BIG_ROWS) {
            try {
              const bytes = JSON.stringify(res).length;
              if (bytes >= BIG_BYTES) {
                console.warn(
                  `[egress-guard] ${model}.${operation} returned ~${(bytes / 1e6).toFixed(1)} MB (${res.length} rows) ` +
                    `on a request path. Scope it or move it into the importer — see src/lib/db.ts.`,
                );
              }
            } catch {
              /* sizing is best-effort */
            }
          }
          return res;
        },
      },
    },
  });
}

type Client = ReturnType<typeof makeClient>;
const g = globalThis as unknown as { prisma?: Client };
export const prisma = g.prisma ?? makeClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
