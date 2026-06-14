// TCGplayer enrichment (built on apps/dexcompare/src/lib/tcgplayer.ts).
//
// dexcompare's outbound links work because every store row carries a REAL
// product-page URL, so a click lands on the EXACT card — not a guessed search
// page that 404s. This module reproduces that for the TCG sites using
// TCGplayer's public search API (the same endpoint the website uses, no key).
//
// We do a TARGETED per-card search (a couple of requests per card) rather than
// pulling the entire catalogue — the bulk pull is tens of thousands of products
// and TCGplayer throttles it. Per card we return
//   { productId, productUrl, imageUrl, marketCents }
// — a real product URL (accurate link), a CLEAN image (tcgplayer-cdn, no Bandai
// "SAMPLE" watermark) and the real US market price.
//
// Matching: for code games (One Piece, Yu-Gi-Oh!) the collector number is a
// globally-unique card code, matched whole; for Magic the number recurs across
// sets and is disambiguated by set-name overlap. Runs on the CI runner (open
// internet); callers fall back cleanly when it's unreachable.

const REQ_URL = (term) => `https://mp-search-api.tcgplayer.com/v1/search/request?q=${encodeURIComponent(term)}&isList=false`;

function numKey(seg) {
  const cleaned = String(seg).trim().toLowerCase().replace(/\s+/g, "");
  const m = cleaned.match(/^([a-z]*)0*(\d+)([a-z]*)/);
  const base = m ? m[1] + m[2] + m[3] : cleaned;
  return String(seg).includes("*") ? `${base}s` : base;
}

// Full card-code key for games whose collector number IS a unique code
// ("OP01-001", "ROTD-EN036"). Extract the first set-code+number token and
// normalise to alphanumerics, so "OP01-001", "OP01-001 (Parallel)" and
// "ROTD-EN036" all key cleanly and uniquely.
function codeKey(seg) {
  const s = String(seg || "").toLowerCase();
  const m = s.match(/[a-z0-9]{2,6}-[a-z]{0,3}\d{1,4}/);
  const token = m ? m[0] : s;
  return token.replace(/[^a-z0-9]/g, "");
}
function normSetName(name) {
  return String(name || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function setNamesOverlap(a, b) {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function body(productLine, term, size) {
  return {
    algorithm: "sales_synonym_v2",
    from: 0,
    size,
    filters: { term: { productLineName: [productLine] }, range: {}, match: {} },
    listingSearch: { context: { cart: {} }, filters: { term: { sellerStatus: "Live", channelId: 0 }, range: { quantity: { gte: 1 } }, exclude: { channelExclusion: 0 } } },
    context: { cart: {}, shippingCountry: "US", userProfile: {} },
    settings: { useFuzzySearch: true, didYouMean: {} },
    sort: {},
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(productLine, term, size = 30) {
  // Retry with backoff — TCGplayer rate-limits bursts (429/503); without retry a
  // throttled batch silently drops matches (an OP seed once matched only 14/73).
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await sleep(400 * 2 ** attempt + Math.random() * 300);
    let res;
    try {
      res = await fetch(REQ_URL(term), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin: "https://www.tcgplayer.com",
          Referer: "https://www.tcgplayer.com/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        },
        body: JSON.stringify(body(productLine, term, size)),
      });
    } catch (e) { lastErr = e; continue; }
    if (res.status === 429 || res.status >= 500) { lastErr = new Error(`TCGplayer ${res.status}`); continue; }
    if (!res.ok) throw new Error(`TCGplayer ${res.status}: ${(await res.text()).slice(0, 140)}`);
    const data = await res.json();
    const r = data?.results?.[0];
    return (r?.results ?? []).filter((p) => !p.sealed);
  }
  throw lastErr ?? new Error("TCGplayer search failed");
}

// Raw products for a term — used by the audit to inspect the real number/set shape.
export async function fetchSampleProducts(productLine, n = 8) {
  const items = await search(productLine, "", n);
  return items.slice(0, n);
}

const PAGE = 50;
// One page of the full catalogue (offset-paginated), with the same retry/backoff.
async function fetchPage(productLine, from) {
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await sleep(400 * 2 ** attempt + Math.random() * 300);
    let res;
    try {
      res = await fetch("https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", Accept: "application/json",
          Origin: "https://www.tcgplayer.com", Referer: "https://www.tcgplayer.com/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        },
        body: JSON.stringify({ ...body(productLine, "", PAGE), from }),
      });
    } catch (e) { lastErr = e; continue; }
    if (res.status === 429 || res.status >= 500) { lastErr = new Error(`TCGplayer ${res.status}`); continue; }
    if (!res.ok) throw new Error(`TCGplayer ${res.status}`);
    const data = await res.json();
    const r = data?.results?.[0];
    return { items: (r?.results ?? []).filter((p) => !p.sealed), total: r?.totalResults ?? 0 };
  }
  throw lastErr ?? new Error("page failed");
}

const attr = (p, k) => {
  const v = p.customAttributes?.[k];
  return v == null ? null : Array.isArray(v) ? v.join("/") : String(v);
};
// Tidy a TCGplayer product name into a card name: drop trailing "(NNN)",
// "- OP01-001", and par/alt-art parentheticals.
function cleanCardName(name) {
  return String(name || "")
    .replace(/\s*-\s*[A-Z0-9]{2,6}-[A-Z]*\d+.*$/i, "")
    .replace(/\s*\((?:alternate art|parallel|special|manga|box topper|full art|\d{1,4})\).*$/i, "")
    .replace(/\s+/g, " ").trim();
}
const isAltPrint = (n) => /alternate art|parallel|special|manga|box topper|full art|reprint/i.test(n || "");

// Build a card catalogue straight from TCGplayer — authoritative names, codes,
// sets, CLEAN images and real US market prices. Returns BuiltCard-shaped rows.
// One row per card code (base/non-alt printing preferred). Used by the One Piece
// seed because the hand-curated list had inaccurate name↔code pairings.
export async function buildCatalog(productLine, opts = {}) {
  const maxFrom = opts.maxFrom ?? Infinity;
  let first;
  try { first = await fetchPage(productLine, 0); }
  catch (e) { console.warn(`buildCatalog: TCGplayer unreachable (${e.message})`); return []; }
  const items = [...first.items];
  const limit = Math.min(first.total, maxFrom);
  for (let from = PAGE; from < limit; from += PAGE) {
    await sleep(120);
    try { const pg = await fetchPage(productLine, from); if (!pg.items.length) break; items.push(...pg.items); }
    catch (e) { console.warn(`buildCatalog page ${from}: ${e.message}`); break; }
  }
  console.log(`buildCatalog ${productLine}: pulled ${items.length} products`);
  const byCode = new Map();
  for (const p of items) {
    const num = p.customAttributes?.number;
    if (!num) continue;
    const key = codeKey(num);
    if (!key) continue;
    const prev = byCode.get(key);
    // prefer a base (non-foil, non-alt) printing for the catalogue entry
    const score = (p.foilOnly ? 0 : 2) + (isAltPrint(p.productName) ? 0 : 1);
    if (prev && prev.score >= score) continue;
    byCode.set(key, { p, num, score });
  }
  const cards = [];
  for (const { p, num } of byCode.values()) {
    const setCode = String(num).split("-")[0].toUpperCase();
    const market = typeof p.marketPrice === "number" && p.marketPrice > 0 ? Math.round(p.marketPrice * 100) : null;
    cards.push({
      externalId: num,
      name: cleanCardName(p.productName),
      setCode,
      setName: p.setName || setCode,
      releaseDate: "2022/12/02",
      collectorNumber: num,
      number: String(num).split("-").pop() || num,
      domain: attr(p, "Color") || attr(p, "color") || "Red",
      type: attr(p, "CardType") || attr(p, "cardType") || "Character",
      subtype: attr(p, "SubTypes") || attr(p, "subTypeName") || null,
      rarity: attr(p, "Rarity") || attr(p, "rarity") || "Common",
      hp: null, artist: null, flavorText: null,
      imageUrl: tcgImageUrl(p.productId),
      imageThumbUrl: tcgImageUrl(p.productId),
      productUrl: tcgProductUrl(p),
      marketCents: market,
    });
  }
  console.log(`buildCatalog ${productLine}: built ${cards.length} unique cards`);
  return cards;
}

export function tcgImageUrl(productId) {
  return `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_in_1000x1000.jpg`;
}
export function tcgProductUrl(p) {
  const slug = `${p.productLineUrlName ?? ""}-${p.setUrlName ?? ""}-${p.productUrlName ?? ""}`
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `https://www.tcgplayer.com/product/${p.productId}/${slug}`;
}

// Card names must agree too — collector codes are NOT unique across promo sets
// (TCGplayer has a Zoro promo numbered "OP01-001" as well as base Luffy
// "OP01-001"), so a code-only match can land on the wrong card. Require the
// card's name to appear in the product name, or strong token overlap.
function nameMatch(cardName, prodName) {
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  const a = norm(cardName), b = norm(prodName);
  if (!a || !b) return false;
  if (b.includes(a) || a.includes(b)) return true;
  const at = a.split(" ").filter((t) => t.length > 2);
  if (!at.length) return a.split(" ").every((t) => b.includes(t)); // very short names (e.g. "Nami")
  const bt = new Set(b.split(" "));
  return at.filter((t) => bt.has(t)).length / at.length >= 0.6;
}

function pickMatch(card, items, mode) {
  let best = null;
  for (const p of items) {
    const numStr = p.customAttributes?.number;
    if (!numStr) continue;
    if (!nameMatch(card.name, p.productName)) continue; // guard against wrong card
    let ok = false;
    if (mode === "code") {
      ok = codeKey(numStr) === codeKey(card.collectorNumber);
    } else {
      const [cnum, ctotal] = String(card.collectorNumber).split("/");
      const [pnum, ptotal] = String(numStr).split("/");
      ok = numKey(pnum) === numKey(cnum) &&
        setNamesOverlap(normSetName(card.setName), normSetName(p.setName)) &&
        (!ctotal?.trim() || !ptotal?.trim() || ctotal.trim() === ptotal.trim());
    }
    if (!ok) continue;
    // prefer the base (non-foil) printing.
    if (!best || (best.foilOnly && !p.foilOnly)) best = p;
    if (best && !best.foilOnly) break;
  }
  return best;
}

// Targeted enrichment for a card list.
//   productLine: "magic" | "one-piece-card-game" | "yugioh"
//   cards: [{ externalId, name, collectorNumber, setName }]
//   opts: { mode?, concurrency?, limit? }
// Returns Map<externalId, { productId, productUrl, imageUrl, marketCents }>.
export async function enrichFromTcgplayer(productLine, cards, opts = {}) {
  const mode = opts.mode ?? (productLine === "magic" ? "numset" : "code");
  const concurrency = opts.concurrency ?? 6;
  const list = opts.limit ? cards.slice(0, opts.limit) : cards;
  const out = new Map();

  // Probe once so an unreachable API degrades cleanly instead of N failures.
  try {
    await search(productLine, list[0]?.name || "Luffy", 1);
  } catch (e) {
    console.warn(`TCGplayer unreachable (${e.message}) — skipping ${productLine} enrichment.`);
    return out;
  }

  let i = 0, done = 0;
  async function worker() {
    while (i < list.length) {
      const card = list[i++];
      try {
        let items = await search(productLine, card.name, 30);
        let pick = pickMatch(card, items, mode);
        // code games: retry by the exact code if the name search missed.
        if (!pick && mode === "code") {
          items = await search(productLine, card.collectorNumber, 20);
          pick = pickMatch(card, items, mode);
        }
        if (pick) {
          const market = typeof pick.marketPrice === "number" && pick.marketPrice > 0 ? pick.marketPrice : null;
          out.set(card.externalId, {
            productId: pick.productId,
            productUrl: tcgProductUrl(pick),
            imageUrl: tcgImageUrl(pick.productId),
            marketCents: market != null ? Math.round(market * 100) : null,
          });
        }
      } catch {
        /* skip this card */
      }
      if (++done % 50 === 0) console.log(`TCGplayer ${productLine}: ${done}/${list.length} searched, ${out.size} matched`);
      await sleep(40);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(`TCGplayer ${productLine} [${mode}]: matched ${out.size} of ${list.length} cards (targeted search).`);
  return out;
}
