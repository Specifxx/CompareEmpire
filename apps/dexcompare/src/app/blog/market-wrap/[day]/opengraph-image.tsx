import { ImageResponse } from "next/og";
import { getMarketWrap } from "@/lib/market-wrap";

// Dynamic OG/Twitter share image for each dated Market Wrap edition — so the
// auto-posted social links (and any manual share) render a rich chart-style
// card with the headline, the Global Index delta and the day's top mover,
// instead of the generic site card. Mirrors RiftCompare's data-driven OG
// routes: nodejs runtime (it reads the DB), best-effort with a graceful
// fallback, system font (no font fetch), inline trend colors.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "DexCompare Daily Market Wrap";

const VALID_DAY = /^\d{4}-\d{2}-\d{2}$/;

const UP = "#34d17e";
const DOWN = "#f87171";
const FLAT = "#94a3b8";

function pct(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export default async function Image({ params }: { params: { day: string } }) {
  const wrap = VALID_DAY.test(params.day) ? await getMarketWrap(params.day).catch(() => null) : null;

  const d1 = wrap?.globalD1 ?? null;
  const trend = d1 == null || Math.abs(d1) < 0.005 ? FLAT : d1 > 0 ? UP : DOWN;
  const arrow = d1 == null ? "" : d1 > 0 ? "▲" : d1 < 0 ? "▼" : "■";
  const top = wrap?.insight?.gainers?.[0] ?? null;
  const longDay = VALID_DAY.test(params.day)
    ? new Date(`${params.day}T00:00:00.000Z`).toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : params.day;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #13171f 0%, #0a0c10 60%, #191019 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header: brand mark + kicker */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#ee1515",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
              color: "white",
            }}
          >
            D
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 800, display: "flex" }}>
              Dex<span style={{ color: "#ff4d4d" }}>Compare</span>
            </div>
            <div style={{ fontSize: 18, color: "#94a3b8", display: "flex", marginTop: 2 }}>
              Daily Market Wrap · {longDay}
            </div>
          </div>
        </div>

        {/* Middle: the big index number + headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, color: "#94a3b8", display: "flex", marginBottom: 6 }}>
            DexCompare Global Index
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <div style={{ fontSize: 96, fontWeight: 800, color: trend, display: "flex", lineHeight: 1 }}>
              {d1 == null ? "—" : `${arrow} ${pct(d1)}`}
            </div>
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "#f1f5f9",
              display: "flex",
              marginTop: 20,
              maxWidth: 1050,
              lineHeight: 1.15,
            }}
          >
            {wrap?.headline ?? "The Pokémon card market, every day"}
          </div>
        </div>

        {/* Footer: top mover + url */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {top ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24 }}>
                <span style={{ color: "#64748b", display: "flex" }}>Top mover</span>
                <span style={{ color: "#f1f5f9", fontWeight: 700, display: "flex" }}>
                  {top.name} ({top.setCode.toUpperCase()})
                </span>
                <span style={{ color: UP, fontWeight: 800, display: "flex" }}>▲ {pct(top.pct)}</span>
              </div>
            ) : (
              <div style={{ fontSize: 24, color: "#64748b", display: "flex" }}>
                Live Pokémon card prices across AU · NZ · US · UK
              </div>
            )}
          </div>
          <div style={{ fontSize: 24, color: "#64748b", display: "flex" }}>dexcompare.app</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
