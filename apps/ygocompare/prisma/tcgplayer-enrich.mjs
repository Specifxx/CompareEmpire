// TCGplayer enrichment (ported from apps/dexcompare/src/lib/tcgplayer.ts).
//
// dexcompare's outbound links work because every store row carries a REAL
// product-page URL (from an API), so a click lands on the EXACT card — not a
// guessed search page that 404s. This module reproduces that for the TCG sites:
// it pulls TCGplayer's public search API (the same endpoint the website uses,
// no API key) and, per card, returns
//   { productId, productUrl, imageUrl, marketCents }
// — a real TCGplayer product URL (accurate link), a CLEAN product image
// (tcgplayer-cdn, no Bandai "SAMPLE" watermark) and the real US market price.
//
// Matching mirrors dexcompare exactly: collector number is the primary identity
// (numKey, letter-aware) and the SET is confirmed by name overlap, so an
// alt-art/printing is never collapsed onto its base card. Runs on the CI runner
// (open internet); callers fall back gracefully when it's unreachable.

const SEARCH_URL = "https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false";
const PAGE_SIZE = 50;

function numKey(seg) {
  const cleaned = String(seg).trim().toLowerCase().replace(/\s+/g, "");
  const m = cleaned.match(/^([a-z]*)0*(\d+)([a-z]*)/);
  const base = m ? m[1] + m[2] + m[3] : cleaned;
  return String(seg).includes("*") ? `${base}s` : base;
}

// Full card-code key for games whose collector number IS a globally-unique code
// (One Piece "OP01-001", Yu-Gi-Oh! "ROTD-EN036"). We extract the first
// set-code+number token and normalise to alphanumerics, so "OP01-001",
// "OP01-001 (Parallel)" and "ROTD-EN036" all key cleanly and uniquely. (The
// Pokémon-style numKey above truncates "OP01-001"→"op1", which is why OP matched
// nothing — codes are matched whole here instead.)
function codeKey(seg) {
  const s = String(seg || "").toLowerCase();
  const m = s.match(/[a-z0-9]{2,6}-[a-z]{0,3}\d{1,4}/); // e.g. op01-001, rotd-en036, st01-001
  const token = m ? m[0] : s;
  return token.replace(/[^a-z0-9]/g, "");
}
function normSetName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function setNamesOverlap(a, b) {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function searchBody(productLine, from) {
  return {
    algorithm: "sales_synonym_v2",
    from,
    size: PAGE_SIZE,
    filters: { term: { productLineName: [productLine] }, range: {}, match: {} },
    listingSearch: {
      context: { cart: {} },
      filters: { term: { sellerStatus: "Live", channelId: 0 }, range: { quantity: { gte: 1 } }, exclude: { channelExclusion: 0 } },
    },
    context: { cart: {}, shippingCountry: "US", userProfile: {} },
    settings: { useFuzzySearch: true, didYouMean: {} },
    sort: {},
  };
}

async function fetchPage(productLine, from) {
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: "https://www.tcgplayer.com",
      Referer: "https://www.tcgplayer.com/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    },
    body: JSON.stringify(searchBody(productLine, from)),
  });
  if (!res.ok) throw new Error(`TCGplayer search ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  const r = data?.results?.[0];
  return { items: r?.results ?? [], total: r?.totalResults ?? 0 };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Raw first-page products — used by the audit to inspect the real number/set
// shape so matching can be verified rather than guessed.
export async function fetchSampleProducts(productLine, n = 8) {
  const { items } = await fetchPage(productLine, 0);
  return items.slice(0, n);
}

export function tcgImageUrl(productId) {
  return `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_in_1000x1000.jpg`;
}

export function tcgProductUrl(p) {
  const slug = `${p.productLineUrlName ?? ""}-${p.setUrlName ?? ""}-${p.productUrlName ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `https://www.tcgplayer.com/product/${p.productId}/${slug}`;
}

// Pull every card product for the product line and match to our cards.
//   productLine: "magic" | "one-piece-card-game" | "yugioh"
//   cards: [{ externalId, collectorNumber, setName }]
// Returns Map<externalId, { productId, productUrl, imageUrl, marketCents }>.
export async function enrichFromTcgplayer(productLine, cards, opts = {}) {
  const maxFrom = opts.maxFrom ?? Infinity; // cap pagination (audits run faster)
  // "code"  : collector number IS a unique card code (One Piece, Yu-Gi-Oh!).
  // "numset": number recurs across sets, disambiguated by set name (Magic).
  const mode = opts.mode ?? (productLine === "magic" ? "numset" : "code");
  const out = new Map();
  let first;
  try {
    first = await fetchPage(productLine, 0);
  } catch (e) {
    console.warn(`TCGplayer unreachable (${e.message}) — skipping enrichment.`);
    return out;
  }
  const items = [...first.items];
  const limit = Math.min(first.total, maxFrom);
  for (let from = PAGE_SIZE; from < limit; from += PAGE_SIZE) {
    await sleep(200);
    try {
      const pg = await fetchPage(productLine, from);
      if (!pg.items.length) break;
      items.push(...pg.items);
    } catch (e) {
      console.warn(`TCGplayer page from=${from} failed: ${e.message}`);
      break;
    }
  }
  const products = items.filter((p) => !p.sealed);
  console.log(`TCGplayer ${productLine}: pulled ${products.length} card products.`);

  const setMatch = (ext, p) => {
    const market = typeof p.marketPrice === "number" && p.marketPrice > 0 ? p.marketPrice : null;
    // prefer the base (non-foil) printing; once a non-foil is set, keep it.
    if (out.has(ext) && !p.foilOnly) return;
    out.set(ext, {
      productId: p.productId,
      productUrl: tcgProductUrl(p),
      imageUrl: tcgImageUrl(p.productId),
      marketCents: market != null ? Math.round(market * 100) : null,
    });
  };

  if (mode === "code") {
    // collector number is the unique card code (OP01-001, ROTD-EN036).
    const byCode = new Map(); // codeKey -> externalId
    for (const c of cards) {
      const k = codeKey(c.collectorNumber);
      if (k) byCode.set(k, c.externalId);
    }
    for (const p of products) {
      const k = codeKey(p.customAttributes?.number || "");
      const ext = k && byCode.get(k);
      if (ext) setMatch(ext, p);
    }
  } else {
    // numset: number recurs across sets — disambiguate by set-name overlap.
    const byNum = new Map(); // numKey(number) -> [{ externalId, setNorm, total }]
    for (const c of cards) {
      const [num, total] = String(c.collectorNumber).split("/");
      const k = numKey(num);
      const list = byNum.get(k) ?? [];
      list.push({ externalId: c.externalId, setNorm: normSetName(c.setName), total: total?.trim() || null });
      byNum.set(k, list);
    }
    for (const p of products) {
      const numStr = p.customAttributes?.number;
      if (!numStr) continue;
      const [num, total] = String(numStr).split("/");
      const prodSetNorm = normSetName(p.setName ?? "");
      const prodTotal = total?.trim() || null;
      const cands = (byNum.get(numKey(num)) ?? []).filter(
        (c) => setNamesOverlap(c.setNorm, prodSetNorm) && (!c.total || !prodTotal || c.total === prodTotal)
      );
      if (cands.length === 1) setMatch(cands[0].externalId, p);
    }
  }
  console.log(`TCGplayer ${productLine} [${mode}]: matched ${out.size} of ${cards.length} cards.`);
  return out;
}
