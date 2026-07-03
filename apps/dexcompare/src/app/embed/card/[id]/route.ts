import { prisma } from "@/lib/db";
import { normalizeCountry, pickPrice, currencyOf, COUNTRIES, type Country } from "@/lib/country";
import { formatMoney } from "@/lib/format";
import { SITE_URL, SITE_NAME } from "@/lib/site";

// Embeddable price widget (ported from RiftCompare). A chrome-free HTML document
// (no app layout, no React hydration) that creators, store sites and blogs can
// drop into an <iframe>. Every widget is a live "from A$X · N stores" badge that
// links back to the full DexCompare comparison — a free, compounding backlink +
// brand engine (and brand mentions are a top AI-citation signal).
//
// Built as a route handler (not a page) so it escapes the root layout entirely,
// and /embed is carved out of X-Frame-Options in next.config.js so it can be
// framed cross-origin.
export const revalidate = 300;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const market: Country = normalizeCountry(url.searchParams.get("market"));

  const card = await prisma.card
    .findFirst({
      where: { OR: [{ slug: params.id }, { id: params.id }] },
      select: {
        id: true, slug: true, name: true, setCode: true, setName: true, collectorNumber: true,
        rarity: true, imageThumbUrl: true,
        lowestPriceCents: true, lowestPriceCentsNz: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true,
        retailerPrices: {
          // Exclude the market-guide pseudo-retailer so the "N stores" count is
          // real buyable listings, not inflated by the guide row.
          where: { country: market, inStock: true, NOT: { retailer: { startsWith: "marketguide" } } },
          select: { id: true },
        },
      },
    })
    .catch(() => null);

  const body = card ? renderCard(card, market) : renderMissing();
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
    },
  });
}

type EmbedCard = {
  id: string; slug: string | null; name: string; setCode: string; setName: string; collectorNumber: string;
  rarity: string; imageThumbUrl: string | null;
  lowestPriceCents: number | null; lowestPriceCentsNz: number | null; lowestPriceCentsUs: number | null; lowestPriceCentsGb: number | null;
  retailerPrices: { id: string }[];
};

function renderCard(card: EmbedCard, market: Country): string {
  const price = pickPrice(card, market);
  const currency = currencyOf(market);
  const flag = COUNTRIES[market].flag;
  const href = `${SITE_URL}/card/${card.slug ?? card.id}?utm_source=embed&utm_medium=widget&utm_campaign=price-badge`;
  const storeCount = card.retailerPrices.length;
  const priceLabel = price != null ? `${formatMoney(price, currency)}` : "—";
  const sub = price != null
    ? `from ${storeCount} ${storeCount === 1 ? "store" : "stores"} ${flag}`
    : "no live listings yet";
  const img = card.imageThumbUrl ? esc(card.imageThumbUrl) : "";

  return shell(`
  <a class="rc-card" href="${esc(href)}" target="_blank" rel="noopener">
    ${img ? `<img class="rc-img" src="${img}" alt="" loading="lazy" />` : `<div class="rc-img rc-noimg">🃏</div>`}
    <div class="rc-body">
      <div class="rc-name" title="${esc(card.name)}">${esc(card.name)}</div>
      <div class="rc-meta">${esc(card.setCode.toUpperCase())} · ${esc(card.collectorNumber)} · ${esc(card.rarity)}</div>
      <div class="rc-price-row">
        <span class="rc-from">from</span>
        <span class="rc-price">${esc(priceLabel)}</span>
      </div>
      <div class="rc-sub">${esc(sub)}</div>
    </div>
    <div class="rc-cta">Compare&nbsp;→</div>
  </a>
  <div class="rc-foot">
    <span>Live prices by <strong>${esc(SITE_NAME)}</strong></span>
  </div>`);
}

function renderMissing(): string {
  return shell(`
  <a class="rc-card" href="${SITE_URL}?utm_source=embed&utm_medium=widget" target="_blank" rel="noopener">
    <div class="rc-img rc-noimg">🔍</div>
    <div class="rc-body">
      <div class="rc-name">Card not found</div>
      <div class="rc-meta">Search every Pokémon card on ${esc(SITE_NAME)}</div>
      <div class="rc-sub">dexcompare.app</div>
    </div>
    <div class="rc-cta">Open&nbsp;→</div>
  </a>`);
}

// Self-contained dark widget. Inline CSS only (it loads in a sandboxed iframe).
// Accent = DexCompare brand red (#ff4d4d) to match the Market Terminal theme.
function shell(inner: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${esc(SITE_NAME)} price</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:transparent;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  a{text-decoration:none;color:inherit}
  .rc-card{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #252b38;border-radius:14px;
    background:linear-gradient(135deg,#0e1116,#13171f);color:#e2e8f0;transition:border-color .15s,transform .15s}
  .rc-card:hover{border-color:#ff4d4d;transform:translateY(-1px)}
  .rc-img{width:48px;height:67px;border-radius:8px;object-fit:cover;flex:none;background:#191e28}
  .rc-noimg{display:flex;align-items:center;justify-content:center;font-size:24px}
  .rc-body{min-width:0;flex:1}
  .rc-name{font-weight:800;font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rc-meta{font-size:11px;color:#94a3b8;margin-top:1px}
  .rc-price-row{display:flex;align-items:baseline;gap:5px;margin-top:5px}
  .rc-from{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em}
  .rc-price{font-size:19px;font-weight:800;color:#eef1f5}
  .rc-sub{font-size:11px;color:#64748b;margin-top:1px}
  .rc-cta{flex:none;align-self:center;background:rgba(255,77,77,.12);color:#ff6a6a;font-weight:700;
    font-size:12px;padding:7px 11px;border-radius:9px;border:1px solid rgba(255,77,77,.35)}
  .rc-foot{margin-top:6px;text-align:right;font-size:10px;color:#64748b}
  .rc-foot strong{color:#94a3b8}
</style></head><body>${inner}</body></html>`;
}
