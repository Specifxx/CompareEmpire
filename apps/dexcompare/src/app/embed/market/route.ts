import { readIndexSeries, computeIndexStats, INDEX_LABELS, ALL_INDEX_KEYS, type IndexKey } from "@/lib/market-index";
import { formatMoney } from "@/lib/format";
import { SITE_URL, SITE_NAME } from "@/lib/site";

// Embeddable DexCompare Index widget — same shell pattern as /embed/card/[id].
export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function isIndexKey(v: string | null): v is IndexKey {
  return !!v && (ALL_INDEX_KEYS as string[]).includes(v);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key: IndexKey = isIndexKey(url.searchParams.get("index")) ? (url.searchParams.get("index") as IndexKey) : "GLOBAL";

  const series = await readIndexSeries(key, 730).catch(() => []);
  const stats = computeIndexStats(series);
  const href = `${SITE_URL}/market?index=${key}&utm_source=embed&utm_medium=widget&utm_campaign=index-badge`;

  const value = stats.latest ? stats.latest.value.toFixed(1) : "—";
  const change = stats.changePct != null ? `${stats.changePct >= 0 ? "+" : ""}${stats.changePct.toFixed(1)}%` : null;
  const basket = stats.latest ? formatMoney(stats.latest.basketCents, "USD") : null;

  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${esc(SITE_NAME)} Index</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:transparent;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  a{text-decoration:none;color:inherit}
  .card{display:flex;flex-direction:column;gap:4px;padding:14px;border:1px solid #252b38;border-radius:14px;
    background:linear-gradient(135deg,#0e1116,#13171f);color:#e2e8f0}
  .label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em}
  .value{font-size:26px;font-weight:800;color:#fff}
  .change{font-size:13px;font-weight:700;color:${stats.changePct != null && stats.changePct >= 0 ? "#34d17e" : "#f87171"}}
  .sub{font-size:11px;color:#64748b}
</style></head><body>
  <a class="card" href="${esc(href)}" target="_blank" rel="noopener">
    <div class="label">${esc(INDEX_LABELS[key])}</div>
    <div class="value">${esc(value)} ${change ? `<span class="change">${esc(change)}</span>` : ""}</div>
    ${basket ? `<div class="sub">Basket value ${esc(basket)}</div>` : ""}
    <div class="sub">${esc(SITE_NAME)}.app</div>
  </a>
</body></html>`;

  return new Response(body, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
  });
}
