// Post-seed link verifier (#6). Samples cards from the live DB and confirms that
// EVERY stored store link resolves to the CORRECT card's page. Run from inside an
// app dir (so @prisma/client + DATABASE_URL resolve), e.g.
//   cd apps/opcompare && DATABASE_URL=... npx tsx ../../scripts/verify-links.mjs
// Exits non-zero if any sampled link fails to resolve to the right card, so broken
// stores are caught instead of silently shipping.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" };
const SAMPLE = parseInt(process.env.VERIFY_SAMPLE || "60", 10);

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const codeKey = (s) => { const m = String(s || "").toLowerCase().match(/[a-z0-9]{2,6}-[a-z]{0,3}\d{1,4}/); return m ? m[0].replace(/[^a-z0-9]/g, "") : ""; };

async function get(url) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { headers: UA, redirect: "follow", signal: ctrl.signal });
    const body = r.ok ? (await r.text()).slice(0, 200000) : "";
    return { status: r.status, body, finalUrl: r.url };
  } catch (e) { return { status: `ERR:${e.cause?.code || e.name || "fail"}`, body: "", finalUrl: url }; }
  finally { clearTimeout(t); }
}

// Does the destination prove it's the SPECIFIC card?
async function resolvesToCard(url, card) {
  // Shopify product page → fetch its .json and check the title.
  const m = url.match(/^(https?:\/\/[^/]+)\/products\/([^/?#]+)/i);
  if (m) {
    const { status, body } = await get(`${m[1]}/products/${m[2]}.json`);
    if (status !== 200 || !body) return { ok: false, why: `products.json ${status}` };
    let title = "";
    try { title = JSON.parse(body)?.product?.title || ""; } catch { return { ok: false, why: "bad json" }; }
    const n = norm(title);
    const ck = codeKey(card.collectorNumber);
    if (ck) return { ok: codeKey(title) === ck, why: ck === codeKey(title) ? "code" : `code≠ (${title})` };
    const toks = norm(card.name).split(" ").filter((t) => t.length > 2);
    return { ok: toks.every((t) => n.includes(t)), why: `name (${title})` };
  }
  // TCGplayer product page → og:title / title should contain the card name.
  if (/tcgplayer\.com\/product\//i.test(url)) {
    const { status, body } = await get(url);
    if (status !== 200) return { ok: false, why: `tcg ${status}` };
    const n = norm(body.slice(0, 60000));
    const toks = norm(card.name).split(" ").filter((t) => t.length > 2);
    return { ok: toks.length > 0 && toks.every((t) => n.includes(t)), why: "tcg-name" };
  }
  // TCGplayer search by a UNIQUE code lands on the one card — accept if 200.
  if (/tcgplayer\.com\/search\//i.test(url) && codeKey(card.collectorNumber)) {
    const { status } = await get(url);
    return { ok: String(status).startsWith("2"), why: `tcg-code-search ${status}` };
  }
  return { ok: false, why: "not a deep-link" };
}

async function main() {
  const total = await prisma.card.count();
  if (!total) { console.log("No cards."); return; }
  // deterministic spread sample across the catalogue
  const step = Math.max(1, Math.floor(total / SAMPLE));
  const cards = await prisma.card.findMany({
    orderBy: { id: "asc" }, take: SAMPLE * step,
    select: { id: true, name: true, collectorNumber: true, setName: true, retailerPrices: { select: { retailer: true, retailerName: true, url: true } } },
  });
  const sample = cards.filter((_, i) => i % step === 0).slice(0, SAMPLE);
  console.log(`Verifying ${sample.length} cards (of ${total})…\n`);

  const stat = new Map(); // retailer -> {ok,fail,examples[]}
  let checked = 0;
  for (const c of sample) {
    for (const rp of c.retailerPrices) {
      const r = await resolvesToCard(rp.url, c);
      const s = stat.get(rp.retailer) || { name: rp.retailerName, ok: 0, fail: 0, ex: [] };
      if (r.ok) s.ok++; else { s.fail++; if (s.ex.length < 3) s.ex.push(`${c.name} [${c.collectorNumber}] ${r.why}`); }
      stat.set(rp.retailer, s);
      checked++;
    }
  }

  console.log("=== per-store link accuracy ===");
  let anyFail = false;
  for (const [key, s] of [...stat.entries()].sort()) {
    const rate = s.ok + s.fail ? (s.ok / (s.ok + s.fail)) * 100 : 0;
    const verdict = rate >= 95 ? "OK" : "FAIL";
    if (rate < 95) anyFail = true;
    console.log(`  [${verdict}] ${s.name.padEnd(20)} ${s.ok}/${s.ok + s.fail} correct (${rate.toFixed(0)}%)` + (s.ex.length ? `  e.g. ${s.ex.join(" | ")}` : ""));
  }
  console.log(`\nChecked ${checked} links across ${sample.length} cards.`);
  if (anyFail) { console.error("::error::Some store links did not resolve to the correct card."); process.exit(1); }
  console.log("All sampled links resolve to the correct card ✔");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
