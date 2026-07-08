import { getGlobalIndex } from "@/lib/market-index";
import { changeOver } from "@/components/PriceChart";
import { SITE_URL, SITE_NAME } from "@/lib/site";

// Embeddable Index badge — the market-level sibling of /embed/card/[id]. A
// chrome-free HTML document showing the DexCompare Index level + 1-day move,
// meant for an <iframe> on other sites (linkable-asset / backlink engine, see
// the "Citing the Index" section on /market). Same /embed carve-out in
// next.config.js (frame-ancestors *) applies here.
export const revalidate = 1800;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const data = await getGlobalIndex({ kind: "all" }).catch(() => null);
  const body = data ? renderBadge(data) : renderMissing();
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}

function renderBadge(data: Awaited<ReturnType<typeof getGlobalIndex>>): string {
  const base = data.points[0]?.cents ?? null;
  const latest = data.points[data.points.length - 1]?.cents ?? null;
  const level = base && latest ? (latest / base) * 100 : null;
  const d1 = changeOver(data.points, 1);
  const href = `${SITE_URL}/market?utm_source=embed&utm_medium=widget&utm_campaign=index-badge`;
  const up = d1 != null && d1 > 0.05;
  const down = d1 != null && d1 < -0.05;
  const arrow = up ? "▲" : down ? "▼" : "•";
  const moveClass = up ? "ib-up" : down ? "ib-down" : "ib-flat";
  const moveLabel = d1 != null ? `${up ? "+" : down ? "−" : ""}${Math.abs(d1).toFixed(2)}%` : "—";
  const levelLabel = level != null ? level.toFixed(1) : "100.0";

  return shell(`
  <a class="ib-badge" href="${esc(href)}" target="_blank" rel="noopener">
    <div class="ib-main">
      <div class="ib-label">Pokémon Card Index</div>
      <div class="ib-level">${esc(levelLabel)}</div>
    </div>
    <div class="ib-move ${moveClass}">${arrow} ${esc(moveLabel)}<span class="ib-period">1d</span></div>
  </a>
  <div class="ib-foot"><span>Live index by <strong>${esc(SITE_NAME)}</strong></span></div>`);
}

function renderMissing(): string {
  return shell(`
  <a class="ib-badge" href="${SITE_URL}/market?utm_source=embed&utm_medium=widget" target="_blank" rel="noopener">
    <div class="ib-main">
      <div class="ib-label">Pokémon Card Index</div>
      <div class="ib-level">—</div>
    </div>
  </a>
  <div class="ib-foot"><span>Live index by <strong>${esc(SITE_NAME)}</strong></span></div>`);
}

// Self-contained dark badge, matching /embed/card's shell — inline CSS only.
function shell(inner: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${esc(SITE_NAME)} Index</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:transparent;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  a{text-decoration:none;color:inherit}
  .ib-badge{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;
    border:1px solid #252b38;border-radius:14px;background:#12151b;color:#e2e8f0;transition:border-color .15s}
  .ib-badge:hover{border-color:#ff4d4d}
  .ib-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8}
  .ib-level{margin-top:2px;font-size:26px;font-weight:800;color:#fff;font-variant-numeric:tabular-nums}
  .ib-move{flex:none;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums;text-align:right}
  .ib-move .ib-period{display:block;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:#64748b}
  .ib-up{color:#22c55e}
  .ib-down{color:#ff4d4d}
  .ib-flat{color:#94a3b8}
  .ib-foot{margin-top:6px;text-align:right;font-size:10px;color:#64748b}
  .ib-foot strong{color:#94a3b8}
</style></head><body>${inner}</body></html>`;
}
