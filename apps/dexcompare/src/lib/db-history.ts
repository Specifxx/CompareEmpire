import { PrismaClient } from "@prisma/client";

// A SECOND physical database, reserved for the write-heavy, ever-growing,
// rarely-fully-queried tables: PriceHistory (daily price snapshots),
// ClickEvent (outbound-click log) and RestockEvent (stock-change log).
//
// WHY: Neon's free tier caps are PER PROJECT (0.5 GB storage, 100 compute-hours,
// 5 GB/month egress) — this app has already exhausted a database's allowance
// twice (see the note in db.ts). These three tables are the ones that grow
// without bound (new rows every day/click/restock, essentially never read in
// full by a live request), so isolating them onto their own Neon project gives
// them their own separate 0.5 GB / 100 CU-hour / 5 GB allowance instead of
// competing with the operational data (Card, RetailerPrice, users, etc.) for
// the same quota. If ANY database still gets close to its limit, only the
// history/analytics features degrade (price-trend charts, the Index, restock
// history) — the core site (browsing, pricing, accounts) is unaffected, which
// is a much better failure mode than the whole site going down.
//
// SAFE BY DEFAULT: falls back to the same DATABASE_URL as db.ts when
// HISTORY_DATABASE_URL isn't set, so this ships as a no-op (same physical
// database, same behaviour as before) until a second Neon project is
// provisioned and HISTORY_DATABASE_URL is added to Vercel + GitHub secrets.
// The schema (prisma/schema.prisma) is unchanged and shared — run
// `prisma db push` against the new URL once to create tables there too (the
// unused Card/RetailerPrice/etc. tables it also creates cost negligible
// storage empty; only PriceHistory/ClickEvent/RestockEvent get real traffic).

const HISTORY_URL = process.env.HISTORY_DATABASE_URL || process.env.DATABASE_URL;

function makeClient() {
  const base = new PrismaClient({
    datasourceUrl: HISTORY_URL,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  // Same egress-visibility guard as db.ts, so a runaway history/analytics query
  // shows up loudly instead of silently burning this database's own allowance.
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const res = await query(args);
          if (Array.isArray(res) && res.length >= 500) {
            try {
              const bytes = JSON.stringify(res).length;
              if (bytes >= 1_000_000) {
                console.warn(
                  `[egress-guard:history] ${model}.${operation} returned ~${(bytes / 1e6).toFixed(1)} MB ` +
                    `(${res.length} rows). If this runs per-request, memoize it or slim the select.`
                );
              }
            } catch {
              /* sizing is best-effort — never break the query */
            }
          }
          return res;
        },
      },
    },
  });
}

type Client = ReturnType<typeof makeClient>;

// Reuse a single PrismaClient across hot reloads in development to avoid
// exhausting database connections (mirrors db.ts).
const globalForPrisma = globalThis as unknown as {
  dbHistory: Client | undefined;
};

export const dbHistory = globalForPrisma.dbHistory ?? makeClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.dbHistory = dbHistory;
}
