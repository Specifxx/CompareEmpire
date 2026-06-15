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
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
// Pseudo set code from a set name ("Modern Horizons 3" → "MH3", "Limited
// Edition Alpha" → "LEA") — TCGplayer doesn't expose the 3-letter code.
function pseudoSetCode(setName) {
  const s = String(setName || "").replace(/[:.,'']/g, " ");
  const tail = (s.match(/\b(\d{1,3})\b\s*$/) || [])[1] || "";
  const letters = s.replace(/\b\d+\b/g, " ").split(/\s+/).filter((w) => /^[a-z]/i.test(w) && !/^(the|of|and|edition|set)$/i.test(w)).map((w) => w[0]).join("").toUpperCase().slice(0, 4);
  return (letters + tail).slice(0, 6) || "SET";
}
// Tidy a TCGplayer product name into a card name: drop trailing "(NNN)",
// "- OP01-001", and par/alt-art parentheticals.
function cleanCardName(name) {
  return String(name || "")
    .replace(/\s*-\s*[A-Z0-9]{2,6}-[A-Z]*\d+.*$/i, "")
    .replace(/\s*\((?:alternate art|parallel|special|manga|box topper|full art|\d{1,4})\).*$/i, "")
    .replace(/\s+/g, " ").trim();
}
const isAltPrint = (n) => /alternate art|parallel|special|manga|box topper|full art|reprint/i.test(n || "");

// ---- Shopify store deep-links --------------------------------------------------
// Real card stores on Shopify expose /products.json — their actual catalogue with
// real product URLs, prices and stock. We download it once, index by the UNIQUE
// collector code (One Piece / Yu-Gi-Oh!), and link each card to the store's REAL
// product page. Code matching is exact, so a click always lands on that one card
// (accessories like sleeves/playmats never carry a card code, so they're excluded).
const ACCESSORY_RE = /sleeve|playmat|deck ?box|binder|booster|\bbox\b|\bcase\b|bundle|\btin\b|blister|\bpack\b|toploader|\bdice\b|portfolio|divider|elite trainer|play ?mat|storage|album|page/i;

export async function fetchShopifyCatalog(host, maxPages = 60) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    let res;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000); // never hang on a slow store
    try {
      res = await fetch(`https://${host}/products.json?limit=250&page=${page}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36", Accept: "application/json" },
        redirect: "follow", signal: ctrl.signal,
      });
    } catch { break; } finally { clearTimeout(t); }
    if (!res.ok) { if (page === 1) return { ok: false, products: [] }; break; }
    if (!/json/.test(res.headers.get("content-type") || "")) return { ok: false, products: [] };
    let data;
    try { data = await res.json(); } catch { break; }
    const arr = data?.products;
    if (!Array.isArray(arr) || !arr.length) break;
    for (const p of arr) {
      const variants = Array.isArray(p.variants) ? p.variants : [];
      const avail = variants.filter((v) => v.available);
      const pick = (avail.length ? avail : variants).map((v) => Number(v.price)).filter((n) => n > 0);
      out.push({
        title: p.title || "",
        handle: p.handle || "",
        type: p.product_type || "",
        priceCents: pick.length ? Math.round(Math.min(...pick) * 100) : null,
        available: avail.length > 0,
      });
    }
    if (arr.length < 250) break;
    await sleep(80);
  }
  return { ok: true, products: out };
}

// Index a Shopify catalogue by collector code → best product (prefer in-stock,
// non-accessory). Only products whose title carries a card code are indexed.
export function indexShopifyByCode(products) {
  const idx = new Map();
  for (const p of products) {
    if (ACCESSORY_RE.test(p.title) || ACCESSORY_RE.test(p.type)) continue;
    const ck = codeKey(p.title) || codeKey(p.handle);
    if (!ck) continue;
    const prev = idx.get(ck);
    if (!prev || (!prev.available && p.available)) idx.set(ck, p);
  }
  return idx;
}

// For a list of cards, build deep-link rows from a store's code index. A row is
// only created when the code matches AND the card's name appears in the product
// title (guards against a stray code collision). Returns Map<externalId, row>.
export function matchShopify(idx, cards, { retailer, retailerName, country, currency, host }) {
  const rows = new Map();
  for (const c of cards) {
    const ck = codeKey(c.collectorNumber);
    if (!ck) continue;
    const p = idx.get(ck);
    if (!p) continue;
    const tn = norm(p.title);
    const toks = norm(c.name).split(" ").filter((t) => t.length > 2);
    const nameOk = toks.length ? toks.filter((t) => tn.includes(t)).length / toks.length >= 0.5 : tn.includes(norm(c.name));
    if (!nameOk) continue;
    rows.set(c.externalId, {
      retailer, retailerName, country, currency,
      url: `https://${host}/products/${p.handle}`,
      priceCents: p.priceCents, inStock: p.available,
    });
  }
  return rows;
}
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

const BASIC_LAND = /^(plains|island|swamp|mountain|forest|wastes)$/;
// Magic deep-link matcher. Magic has no unique per-card code on Shopify, so we
// match by NAME + (set name OR collector number), with accessories excluded and
// basic lands requiring the number (their name+set is ambiguous across arts). An
// inverted token index keeps it fast across big catalogues. A row is only created
// on a confident match, so a Magic link always lands on that card (or no row).
export function matchShopifyByName(products, cards, store) {
  const prods = products.filter((p) => !ACCESSORY_RE.test(p.title) && !ACCESSORY_RE.test(p.type));
  const tokSets = prods.map((p) => new Set(norm(p.title).split(" ").filter((t) => t.length > 2)));
  const inv = new Map(); // token -> [productIndex]
  tokSets.forEach((set, i) => { for (const t of set) { let l = inv.get(t); if (!l) { l = []; inv.set(t, l); } l.push(i); } });
  const rows = new Map();
  for (const c of cards) {
    const nameToks = norm(c.name).split(" ").filter((t) => t.length > 2);
    if (!nameToks.length) continue;
    let cand = null;
    for (const t of nameToks) { const l = inv.get(t); if (!l) { cand = null; break; } if (!cand || l.length < cand.length) cand = l; }
    if (!cand) continue;
    const setToks = norm(c.setName).split(" ").filter((t) => t.length > 2);
    const num = String(c.collectorNumber).replace(/\D/g, "");
    const isBasic = BASIC_LAND.test(norm(c.name));
    let best = null;
    for (const i of cand) {
      const set = tokSets[i];
      if (!nameToks.every((t) => set.has(t))) continue; // every name word present
      const title = norm(prods[i].title) + " " + norm(prods[i].handle);
      const hasNum = !!num && new RegExp(`(^|\\D)${num}(\\D|$)`).test(title);
      const hasSet = setToks.length > 0 && setToks.filter((t) => set.has(t)).length / setToks.length >= 0.6;
      if (isBasic ? !hasNum : !(hasNum || hasSet)) continue; // confident signal required
      if (!best || (!best.available && prods[i].available)) best = prods[i];
      if (best && best.available) break;
    }
    if (best) rows.set(c.externalId, { retailer: store.retailer, retailerName: store.retailerName, country: store.country, currency: store.currency, url: `https://${store.host}/products/${best.handle}`, priceCents: best.priceCents, inStock: best.available });
  }
  return rows;
}

// Build a card catalogue straight from TCGplayer — authoritative names, codes,
// sets, CLEAN images and real US market prices. Returns BuiltCard-shaped rows.
// One row per card code (base/non-alt printing preferred). Used by the One Piece
// seed because the hand-curated list had inaccurate name↔code pairings.
export async function buildCatalog(productLine, opts = {}) {
  const maxFrom = opts.maxFrom ?? Infinity;
  // "code": collector number is a unique card code (OP/YGO). "numset": number
  // recurs across sets, so a card's identity is set + number (Magic).
  const mode = opts.mode ?? (productLine === "magic" ? "numset" : "code");
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
  const byKey = new Map();
  for (const p of items) {
    const num = p.customAttributes?.number;
    if (!num) continue;
    const key = mode === "code" ? codeKey(num) : `${normSetName(p.setName)}|${numKey(num)}`;
    if (!key || key === "|") continue;
    const prev = byKey.get(key);
    const score = (p.foilOnly ? 0 : 2) + (isAltPrint(p.productName) ? 0 : 1);
    if (prev && prev.score >= score) continue;
    byKey.set(key, { p, num, score });
  }
  const cards = [];
  for (const { p, num } of byKey.values()) {
    const market = typeof p.marketPrice === "number" && p.marketPrice > 0 ? Math.round(p.marketPrice * 100) : null;
    const setCode = mode === "code" ? String(num).split("-")[0].toUpperCase() : pseudoSetCode(p.setName);
    const externalId = mode === "code" ? num : `${slug(p.setName)}-${num}`.slice(0, 70);
    cards.push({
      externalId,
      name: cleanCardName(p.productName),
      setCode,
      setName: p.setName || setCode,
      releaseDate: "2022/12/02",
      collectorNumber: num,
      number: mode === "code" ? (String(num).split("-").pop() || num) : String(num),
      domain: attr(p, "Color") || attr(p, "color") || (mode === "code" ? "Red" : "Colorless"),
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

// Build the COMPLETE Magic catalogue from Scryfall's bulk data. TCGplayer's search
// API caps pagination at ~10k products, so it can only supply a fraction of Magic's
// tens of thousands of cards (which is why searches for Black Lotus / Remand / most
// planeswalkers returned nothing). Scryfall is the authoritative, complete MTG
// database — every card, with real prices (its USD is the TCGplayer market price),
// clean images and TCGplayer purchase links. Uses "oracle_cards" (one entry per
// unique card) so every card is searchable while staying within the Neon free tier.
// Returns BuiltCard-shaped rows with productUrl + marketCents; [] if unreachable.
export async function buildScryfallCatalog(opts = {}) {
  const variant = opts.variant || "oracle_cards";
  const UA = { "User-Agent": "CompareEmpire/1.0 (price comparison; contact admin@compareempire)", Accept: "application/json" };
  let meta;
  try {
    const r = await fetch("https://api.scryfall.com/bulk-data", { headers: UA, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`bulk-data ${r.status}`);
    meta = await r.json();
  } catch (e) { console.warn(`Scryfall bulk-data unreachable (${e.message})`); return []; }
  const entry = (meta.data || []).find((d) => d.type === variant);
  if (!entry?.download_uri) { console.warn("Scryfall: no download_uri for " + variant); return []; }
  let raw;
  try {
    const r = await fetch(entry.download_uri, { headers: UA, signal: AbortSignal.timeout(180000) });
    if (!r.ok) throw new Error(`download ${r.status}`);
    raw = await r.json();
  } catch (e) { console.warn(`Scryfall bulk download failed (${e.message})`); return []; }
  console.log(`Scryfall: downloaded ${Array.isArray(raw) ? raw.length : 0} ${variant} objects`);

  const COLOR = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };
  const TYPES = ["Planeswalker", "Creature", "Instant", "Sorcery", "Artifact", "Enchantment", "Land", "Battle"];
  const SKIP_LAYOUT = new Set(["token", "double_faced_token", "emblem", "art_series", "scheme", "vanguard"]);
  const cards = [];
  for (const c of raw || []) {
    if (c.lang && c.lang !== "en") continue;
    if (Array.isArray(c.games) && c.games.length && !c.games.includes("paper")) continue;
    if (SKIP_LAYOUT.has(c.layout)) continue;
    if (c.set_type === "memorabilia" || c.set_type === "token") continue;
    const img = c.image_uris || c.card_faces?.[0]?.image_uris || null;
    const imageUrl = img?.normal || img?.large || img?.small || null;
    const prices = c.prices || {};
    const usd = parseFloat(prices.usd || prices.usd_foil || "0");
    const eur = parseFloat(prices.eur || prices.eur_foil || "0");
    const marketCents = usd > 0 ? Math.round(usd * 100) : eur > 0 ? Math.round(eur * 1.08 * 100) : null;
    const typeLine = c.type_line || "";
    const head = typeLine.split("—")[0] || "";
    const mainType = TYPES.find((t) => head.includes(t)) || (head.trim().split(/\s+/).pop() || "Card");
    const sub = typeLine.includes("—") ? typeLine.split("—")[1].trim() : null;
    const ci = c.color_identity || c.colors || [];
    const domain = mainType === "Land" ? "Land" : ci.length === 0 ? "Colorless" : ci.length === 1 ? COLOR[ci[0]] || "Colorless" : "Multicolor";
    cards.push({
      externalId: `m${c.oracle_id || c.id}`,
      name: c.name,
      setCode: String(c.set || "").toUpperCase(),
      setName: c.set_name || c.set || "",
      releaseDate: (c.released_at || "2019-01-01").replace(/-/g, "/"),
      collectorNumber: String(c.collector_number || ""),
      number: String(c.collector_number || ""),
      domain,
      type: mainType,
      subtype: sub,
      rarity: c.rarity ? c.rarity[0].toUpperCase() + c.rarity.slice(1) : "Common",
      hp: null,
      artist: c.artist || null,
      flavorText: c.flavor_text || null,
      imageUrl,
      imageThumbUrl: img?.small || imageUrl,
      productUrl: c.purchase_uris?.tcgplayer || null,
      marketCents,
    });
  }
  console.log(`Scryfall: built ${cards.length} Magic cards`);
  return cards;
}
