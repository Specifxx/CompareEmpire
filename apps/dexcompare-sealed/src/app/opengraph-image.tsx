import { ImageResponse } from "next/og";

export const alt = "DexCompare — Pokémon sealed prices & stock, compared";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f6f6f3", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "#e3350d", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 46, fontWeight: 800 }}>D</div>
          <div style={{ fontSize: 44, fontWeight: 800, color: "#15171c", display: "flex" }}>
            Dex<span style={{ color: "#e3350d" }}>Compare</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, color: "#15171c", lineHeight: 1.04, letterSpacing: -2 }}>Pokémon sealed, in stock,</div>
          <div style={{ fontSize: 76, fontWeight: 800, color: "#e3350d", lineHeight: 1.04, letterSpacing: -2 }}>at the best price.</div>
          <div style={{ marginTop: 28, fontSize: 32, color: "#5c606c" }}>Booster boxes · ETBs · bundles · collections — compared across independent stores.</div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 28, color: "#5c606c", fontWeight: 700, letterSpacing: 2 }}>AU · US · UK · CA · NZ · EU · SG</div>
      </div>
    ),
    size,
  );
}
