// Audit script run on a GitHub Actions runner (open internet).
//   APITCG_API_KEY=xxx node scripts/audit-tcg.mjs
// 1) Diagnoses the One Piece image source (apitcg sample + candidate image URLs).
// 2) HTTP-tests every store search URL in the shared directory to find dead/fake
//    domains to cull.
import { buildStores } from "../apps/mtgcompare/prisma/stores.mjs";

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" };

async function status(url, headers = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    let r = await fetch(url, { method: "GET", redirect: "follow", headers: { ...UA, ...headers }, signal: ctrl.signal });
    return `${r.status}`;
  } catch (e) {
    return `ERR:${(e.cause?.code || e.name || "fail")}`;
  } finally { clearTimeout(t); }
}

console.log("================ ONE PIECE IMAGE DIAGNOSIS ================");
const KEY = process.env.APITCG_API_KEY;
if (KEY) {
  try {
    const r = await fetch("https://apitcg.com/api/one-piece/cards?limit=3", { headers: { ...UA, "x-api-key": KEY } });
    console.log("apitcg HTTP", r.status);
    const body = await r.json();
    const cards = body.data ?? body.cards ?? [];
    for (const c of cards.slice(0, 3)) {
      console.log(`  ${c.id || c.code} ${c.name}: images=${JSON.stringify(c.images)} image=${c.image ?? ""}`);
    }
    // test the first card's image url actually loads
    const img = cards[0]?.images?.large || cards[0]?.images?.small || cards[0]?.image;
    if (img) console.log(`  apitcg image ${img} -> HTTP ${await status(img)}`);
  } catch (e) { console.log("apitcg error:", e.message); }
} else {
  console.log("(no APITCG_API_KEY input — skipping apitcg sample)");
}
console.log("Candidate OP image hosts for OP01-001:");
for (const u of [
  "https://en.onepiece-cardgame.com/images/cardlist/card/OP01-001.png",
  "https://en.onepiece-cardgame.com/images/cardlist/card/OP01-001.png?241008",
  "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01-001_EN.webp",
  "https://www.apitcg.com/images/one-piece/OP01-001.png",
]) console.log(`  ${u} -> HTTP ${await status(u)}`);

console.log("\n================ STORE LINK AUDIT (domains shared across all 3 games) ================");
const stores = buildStores("magic");
const q = encodeURIComponent("Black Lotus");
for (const region of ["US", "AU", "GB", "NZ"]) {
  console.log(`-- ${region} --`);
  for (const s of stores[region]) {
    const url = s.search(q);
    const code = await status(url);
    const verdict = /^(2|3)/.test(code) ? "OK" : code === "403" || code === "503" || code === "429" ? "REAL(blocked)" : "DEAD?";
    console.log(`  [${code}] ${verdict.padEnd(13)} ${s.name.padEnd(22)} ${url.split("/").slice(0,3).join("/")}`);
  }
}
console.log("\nDONE");
