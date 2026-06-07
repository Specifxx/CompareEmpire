import { Pool } from "pg";

export interface Subsidiary {
  key: string;
  name: string;
  vertical: string; // what it compares
  tagline: string;
  url: string; // local dev URL
  db: string; // postgres database name in the shared cluster
  accent: string; // brand colour
  status: "live" | "soon";
  region: string;
  emoji: string;
  // External = runs on its own separate instance (not in this monorepo). The hub
  // links to it and treats it as live; live counts are only shown if a
  // <KEY>_DATABASE_URL is provided.
  external?: boolean;
}

// The empire's holdings. Add a new compare site here and it appears on the hub.
export const SUBSIDIARIES: Subsidiary[] = [
  {
    key: "riftcompare",
    name: "RiftCompare",
    vertical: "Riftbound TCG",
    tagline: "Compare live Riftbound (League of Legends TCG) singles & sealed prices.",
    url: "https://riftcompare.com",
    db: "riftcompare",
    accent: "#1ea65c",
    status: "live",
    region: "AU · NZ · US",
    emoji: "⚔️",
    external: true,
  },
  {
    key: "cameracompare",
    name: "CameraCompare",
    vertical: "Cameras",
    tagline: "Find the best price on mirrorless, DSLR & action cameras.",
    url: "http://localhost:3002",
    db: "cameracompare",
    accent: "#f59e0b",
    status: "live",
    region: "AU · US · UK",
    emoji: "📷",
  },
  {
    key: "dexcompare",
    name: "DexCompare",
    vertical: "Pokémon TCG",
    tagline: "Every Pokémon card & sealed product, priced across TCGplayer, Troll and Toad, UK stores & more.",
    url: "http://localhost:3003",
    db: "dexcompare",
    accent: "#ee1515",
    status: "live",
    region: "AU · NZ · US · UK",
    emoji: "🔴",
  },
  {
    key: "carcompare",
    name: "CarCompare",
    vertical: "New cars",
    tagline: "Compare new-car drive-away prices across dealers & marketplaces.",
    url: "http://localhost:3004",
    db: "carcompare",
    accent: "#2563eb",
    status: "live",
    region: "AU · US · UK",
    emoji: "🚗",
  },
  {
    key: "phonecompare",
    name: "PhoneCompare",
    vertical: "Smartphones",
    tagline: "Find the cheapest deal on the latest phones across major retailers.",
    url: "http://localhost:3005",
    db: "phonecompare",
    accent: "#10b981",
    status: "live",
    region: "AU · US · UK",
    emoji: "📱",
  },
];

export interface SubsidiaryStats {
  products: number | null;
  pricePoints: number | null;
  retailers: number | null;
  sealed: number | null;
  online: boolean;
}

const pools = new Map<string, Pool>();
function poolFor(s: Subsidiary): Pool {
  let p = pools.get(s.key);
  if (!p) {
    // In production each subsidiary's Neon connection string is supplied via env,
    // e.g. RIFTCOMPARE_DATABASE_URL. Locally we fall back to the shared cluster.
    const envUrl = process.env[`${s.key.toUpperCase()}_DATABASE_URL`];
    p = envUrl
      ? new Pool({ connectionString: envUrl, max: 2, connectionTimeoutMillis: 4000 })
      : new Pool({
          host: process.env.PGHOST ?? "127.0.0.1",
          port: parseInt(process.env.PGPORT ?? "5432", 10),
          user: process.env.PGUSER ?? "postgres",
          database: s.db,
          max: 2,
          connectionTimeoutMillis: 2500,
        });
    p.on("error", () => {});
    pools.set(s.key, p);
  }
  return p;
}

async function one(s: Subsidiary, sql: string): Promise<number | null> {
  try {
    const r = await poolFor(s).query(sql);
    return parseInt(r.rows[0].count, 10);
  } catch {
    return null;
  }
}

export async function getStats(s: Subsidiary): Promise<SubsidiaryStats> {
  // External sites (separate instance) are treated as live; we only query live
  // counts if a connection string was explicitly provided for them.
  if (s.external && !process.env[`${s.key.toUpperCase()}_DATABASE_URL`]) {
    return { products: null, pricePoints: null, retailers: null, sealed: null, online: true };
  }
  const [products, pricePoints, retailers, sealed] = await Promise.all([
    one(s, 'SELECT count(*)::text AS count FROM "Card"'),
    one(s, 'SELECT count(*)::text AS count FROM "RetailerPrice"'),
    one(s, 'SELECT count(DISTINCT retailer)::text AS count FROM "RetailerPrice"'),
    one(s, 'SELECT count(*)::text AS count FROM "SealedListing"'),
  ]);
  return { products, pricePoints, retailers, sealed, online: products !== null };
}

// In production the deployed URL for each site is supplied via env, e.g.
// RIFTCOMPARE_URL=https://riftcompare.vercel.app. Falls back to the local port.
export function subsidiaryUrl(s: Subsidiary): string {
  return process.env[`${s.key.toUpperCase()}_URL`] ?? s.url;
}

export async function getAllStats(): Promise<Record<string, SubsidiaryStats>> {
  const entries = await Promise.all(
    SUBSIDIARIES.map(async (s) => [s.key, await getStats(s)] as const)
  );
  return Object.fromEntries(entries);
}
