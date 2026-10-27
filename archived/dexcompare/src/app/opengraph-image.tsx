import { ImageResponse } from "next/og";

// Default social share card — Next auto-applies this as both og:image and
// twitter:image to every route that doesn't override its own. Without it the
// site declares `summary_large_image` with no image (blank/broken cards).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "DexCompare — Pokémon Card Database & Price Comparison";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #13171f 0%, #0a0c10 60%, #1a1230 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand Pokéball mark. */}
        <div style={{ fontSize: 110, display: "flex" }}>⚡</div>
        <div style={{ fontSize: 84, fontWeight: 800, display: "flex", marginTop: 8 }}>
          Dex<span style={{ color: "#7c6cff" }}>Compare</span>
        </div>
        <div style={{ fontSize: 34, color: "#cbd5e1", marginTop: 18, display: "flex" }}>
          Pokémon Card Database &amp; Price Comparison
        </div>
        <div style={{ fontSize: 26, color: "#64748b", marginTop: 36, display: "flex" }}>dexcompare.app</div>
      </div>
    ),
    { ...size }
  );
}
