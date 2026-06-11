// TCGplayer mp-search-api client, generalized across product lines.
//
// Same endpoint / headers / body shape as the battle-tested dexcompare and
// riftcompare importers (this is the public search API the website itself
// uses). Two things this generalisation adds:
//   1. productLine is a parameter — the URL-style line names ("pokemon",
//      "magic", "yugioh", "one-piece-card-game",
//      "riftbound-league-of-legends-trading-card-game" — see games.ts).
//   2. Pagination is per-SET. The backend is Elasticsearch-flavoured and the
//      from+size window dies around 10,000 results; Pokémon alone has ~90k
//      card products, so plain pagination silently truncates the catalogue.
//      Every individual set is far below 10k, so we read the setName
//      aggregation off page 0 and paginate each set to completion instead.
//
// Pure module (no DB import) so probe scripts can use it standalone.

const SEARCH_URL = "https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false";
const PAGE_SIZE = 50;
// ES-style result window: requests with from+size beyond this error out, so any
// plain pagination must stop here (and per-set pagination must never need to).
const MAX_WINDOW = 10_000;
const TIMEOUT_MS = 60_000;
const RETRIES = 2; // extra attempts on 429/5xx/network — nightly CI must ride out blips

export type TcgProduct = {
  productId: number;
  productName: string;
  productUrlName: string;
  setUrlName: string;
  productLineUrlName: string;
  setName: string;
  marketPrice: number | null;
  lowestPrice: number | null;
  foilOnly: boolean;
  sealed: boolean;
  customAttributes?: { number?: string; releaseDate?: string };
};

// One bucket of the page-0 setName aggregation (the per-set fetch plan).
export type TcgSetBucket = { urlValue: string; value: string; count: number };

export type TcgPage = {
  items: TcgProduct[];
  total: number;
  setAggregation: TcgSetBucket[] | null;
};

// Browser-shaped headers — the API serves the public site and rejects obviously
// non-browser callers.
const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  Origin: "https://www.tcgplayer.com",
  Referer: "https://www.tcgplayer.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function searchBody(
  productLine: string,
  from: number,
  opts?: { productTypes?: string[]; setNames?: string[] }
) {
  const term: Record<string, string[]> = { productLineName: [productLine] };
  if (opts?.productTypes?.length) term.productTypeName = opts.productTypes;
  if (opts?.setNames?.length) term.setName = opts.setNames;
  return {
    algorithm: "sales_synonym_v2",
    from,
    size: PAGE_SIZE,
    filters: { term, range: {}, match: {} },
    listingSearch: {
      context: { cart: {} },
      filters: {
        term: { sellerStatus: "Live", channelId: 0 },
        range: { quantity: { gte: 1 } },
        exclude: { channelExclusion: 0 },
      },
    },
    context: { cart: {}, shippingCountry: "US", userProfile: {} },
    settings: { useFuzzySearch: true, didYouMean: {} },
    sort: {},
  };
}

// POST with a hard timeout and retries. 429/5xx and network/timeout failures
// are transient (rate limiting, CDN hiccups) and get retried with backoff;
// other 4xx mean the request shape is wrong and retrying can't help.
async function postSearch(body: string): Promise<unknown> {
  let lastErr: Error = new Error("TCGplayer search: no attempts made");
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(500 * 2 ** attempt); // 1s, 2s
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(SEARCH_URL, { method: "POST", headers: HEADERS, body, signal: ctrl.signal });
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      clearTimeout(timer);
      continue;
    }
    clearTimeout(timer);
    if (res.status === 429 || res.status >= 500) {
      lastErr = new Error(`TCGplayer search ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
      continue;
    }
    if (!res.ok) {
      throw new Error(`TCGplayer search ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
    }
    return res.json();
  }
  throw lastErr;
}

// The aggregation path (data.results[0].aggregations.setName) is observed, not
// documented — validate every bucket's shape so an API change degrades to the
// plain-pagination fallback instead of a crash.
function extractSetAggregation(data: unknown): TcgSetBucket[] | null {
  const agg = (data as { results?: { aggregations?: { setName?: unknown } }[] })?.results?.[0]
    ?.aggregations?.setName;
  if (!Array.isArray(agg)) return null;
  const buckets = agg.filter(
    (b): b is TcgSetBucket =>
      !!b && typeof b.urlValue === "string" && typeof b.value === "string" && typeof b.count === "number"
  );
  return buckets.length > 0 ? buckets : null;
}

export async function fetchPage(
  productLine: string,
  from: number,
  opts?: { productTypes?: string[]; setNames?: string[] }
): Promise<TcgPage> {
  const data = (await postSearch(JSON.stringify(searchBody(productLine, from, opts)))) as {
    results?: { results?: TcgProduct[]; totalResults?: number }[];
  };
  const r = data?.results?.[0];
  return {
    items: (r?.results ?? []) as TcgProduct[],
    total: r?.totalResults ?? 0,
    setAggregation: extractSetAggregation(data),
  };
}

// Plain from+size pagination, capped at the ES window. Page 0 is assumed to be
// in `out` already. Failures warn and stop (partial data beats no data).
async function paginateInto(
  out: Map<number, TcgProduct>,
  productLine: string,
  opts: { productTypes?: string[]; setNames?: string[] },
  total: number,
  label: string
): Promise<void> {
  for (let from = PAGE_SIZE; from < total && from + PAGE_SIZE <= MAX_WINDOW; from += PAGE_SIZE) {
    await sleep(250);
    try {
      const pg = await fetchPage(productLine, from, opts);
      if (pg.items.length === 0) break;
      for (const p of pg.items) out.set(p.productId, p);
    } catch (e) {
      console.warn(`TCGplayer[${label}] page from=${from} failed: ${(e as Error).message}`);
      break;
    }
  }
}

async function fetchSetInto(
  out: Map<number, TcgProduct>,
  productLine: string,
  productTypes: string[],
  bucket: TcgSetBucket
): Promise<void> {
  // The setName term filter takes the bucket's urlValue ("sv08-surging-sparks"
  // style — what tcgplayer.com itself sends when you click a set facet). If it
  // unexpectedly matches nothing while the bucket claims products, retry once
  // with the display value — a filter-shape change then degrades to one extra
  // request instead of a silently missing set.
  let setFilter = bucket.urlValue;
  let first = await fetchPage(productLine, 0, { productTypes, setNames: [setFilter] });
  if (first.total === 0 && bucket.count > 0) {
    await sleep(250);
    setFilter = bucket.value;
    first = await fetchPage(productLine, 0, { productTypes, setNames: [setFilter] });
    if (first.total === 0) {
      console.warn(
        `TCGplayer[${productLine}] set "${bucket.value}": filter matched 0 products (aggregation said ${bucket.count}) — skipped.`
      );
      return;
    }
  }
  if (first.total > MAX_WINDOW) {
    // Should be impossible (sets are always < 10k) — if it ever happens we'd
    // rather ship a capped set than crash the game's import.
    console.warn(`TCGplayer[${productLine}] set "${bucket.value}" has ${first.total} products (> window) — capped.`);
  }
  for (const p of first.items) out.set(p.productId, p);
  await paginateInto(out, productLine, { productTypes, setNames: [setFilter] }, first.total, `${productLine} ${bucket.value}`);
}

// Fetch every product of one product line + product type. Per-set when the
// aggregation is available (the only way past the 10k window), plain pagination
// when the whole line already fits inside the window (sealed catalogues and
// young games — hundreds of requests cheaper than iterating every set).
export async function fetchAllProducts(productLine: string, productTypes: string[]): Promise<TcgProduct[]> {
  const first = await fetchPage(productLine, 0, { productTypes });
  // Keyed by productId: a product surfacing in two set buckets must not duplicate.
  const out = new Map<number, TcgProduct>();
  for (const p of first.items) out.set(p.productId, p);
  if (first.total <= first.items.length) return [...out.values()];

  const buckets = first.setAggregation;
  if (!buckets || first.total <= MAX_WINDOW) {
    if (!buckets) {
      console.warn(
        `TCGplayer[${productLine}] ${productTypes.join("/")}: setName aggregation missing on page 0 — ` +
          `plain pagination${first.total > MAX_WINDOW ? ` CAPPED at ${MAX_WINDOW} of ${first.total}` : ""}.`
      );
    }
    await paginateInto(out, productLine, { productTypes }, first.total, productLine);
    return [...out.values()];
  }

  console.log(
    `TCGplayer[${productLine}] ${productTypes.join("/")}: ${first.total} products across ${buckets.length} sets — paginating per set.`
  );
  for (const bucket of buckets) {
    await sleep(250);
    try {
      await fetchSetInto(out, productLine, productTypes, bucket);
    } catch (e) {
      // One broken set must not abort the whole game — warn and move on.
      console.warn(
        `TCGplayer[${productLine}] set "${bucket.value}" failed: ${(e as Error).message} — continuing with next set.`
      );
    }
  }
  if (out.size < first.total) {
    console.warn(
      `TCGplayer[${productLine}] ${productTypes.join("/")}: fetched ${out.size}/${first.total} products (failed sets or stale aggregation counts).`
    );
  }
  return [...out.values()];
}

export function tcgProductUrl(p: TcgProduct): string {
  const slug = `${p.productLineUrlName ?? ""}-${p.setUrlName ?? ""}-${p.productUrlName ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `https://www.tcgplayer.com/product/${p.productId}/${slug}`;
}

// TCGplayer product image CDN.
export function tcgImageUrl(productId: number): string {
  return `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_in_1000x1000.jpg`;
}
