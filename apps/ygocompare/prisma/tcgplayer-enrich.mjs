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

async function search(productLine, term, size = 30) {
  const res = await fetch(REQ_URL(term), {
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
  if (!res.ok) throw new Error(`TCGplayer ${res.status}: ${(await res.text()).slice(0, 140)}`);
  const data = await res.json();
  const r = data?.results?.[0];
  return (r?.results ?? []).filter((p) => !p.sealed);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Raw products for a term — used by the audit to inspect the real number/set shape.
export async function fetchSampleProducts(productLine, n = 8) {
  const items = await search(productLine, "", n);
  return items.slice(0, n);
}

export function tcgImageUrl(productId) {
  return `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_in_1000x1000.jpg`;
}
export function tcgProductUrl(p) {
  const slug = `${p.productLineUrlName ?? ""}-${p.setUrlName ?? ""}-${p.productUrlName ?? ""}`
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `https://www.tcgplayer.com/product/${p.productId}/${slug}`;
}

function pickMatch(card, items, mode) {
  let best = null;
  for (const p of items) {
    const numStr = p.customAttributes?.number;
    if (!numStr) continue;
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
