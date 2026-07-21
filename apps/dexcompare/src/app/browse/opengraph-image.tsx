import { ImageResponse } from "next/og";
import { POKEMON_SETS } from "@/lib/pokemon-sets";

// /browse share card — previously fell back to the generic site-wide
// opengraph-image.tsx (off-brand purple/lightning-bolt card). Reads only the
// static POKEMON_SETS catalogue (no DB call), so it's unaffected by this
// sandbox's Prisma-auth build limitation.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Browse the Pokémon Card Database — DexCompare";

export default function Image() {
  const setCount = POKEMON_SETS.length;

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
          background: "linear-gradient(135deg, #13171f 0%, #0a0c10 55%, #1a1013 100%)",
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
              Card Database
            </div>
          </div>
        </div>

        {/* Middle: headline + stats */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "#f1f5f9",
              display: "flex",
              lineHeight: 1.15,
              maxWidth: 1050,
            }}
          >
            Browse every Pokémon card
          </div>
          <div style={{ fontSize: 26, color: "#94a3b8", display: "flex", marginTop: 18 }}>
            {[`${setCount} sets`, "search & filter", "cheapest price across every store"].join(" · ")}
          </div>
        </div>

        {/* Footer: url */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 24, color: "#64748b", display: "flex" }}>
            AU · NZ · US · UK, updated daily
          </div>
          <div style={{ fontSize: 24, color: "#64748b", display: "flex" }}>dexcompare.app</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
