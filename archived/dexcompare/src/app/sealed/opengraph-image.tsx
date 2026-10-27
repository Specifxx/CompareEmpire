import { ImageResponse } from "next/og";

// /sealed (list) share card — previously fell back to the generic site-wide
// opengraph-image.tsx (off-brand purple/lightning-bolt card). Static, no DB
// call, so it's unaffected by this sandbox's Prisma-auth build limitation.
// (Filtered/query-string views canonical to this base page, so one image
// covers the whole surface — same reasoning as /browse.)
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pokémon Sealed Products — Compare Prices | DexCompare";

export default function Image() {
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
              Sealed Product Database
            </div>
          </div>
        </div>

        {/* Middle: headline + stats */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 60,
              fontWeight: 800,
              color: "#f1f5f9",
              display: "flex",
              lineHeight: 1.15,
              maxWidth: 1080,
            }}
          >
            Booster boxes, ETBs & tins
          </div>
          <div style={{ fontSize: 26, color: "#94a3b8", display: "flex", marginTop: 18 }}>
            {["compare sealed prices", "every store we track", "find the cheapest"].join(" · ")}
          </div>
        </div>

        {/* Footer: url */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 24, color: "#64748b", display: "flex" }}>
            AU · US · UK, updated daily
          </div>
          <div style={{ fontSize: 24, color: "#64748b", display: "flex" }}>dexcompare.app</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
