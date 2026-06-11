import { ImageResponse } from "next/og";

// Share-card for /dexdle links (Reddit/Discord/X previews).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Dexdle — the daily Pokémon card guessing game";

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
          background: "linear-gradient(135deg, #13171f 0%, #0a0c10 60%, #2a1212 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 110, display: "flex" }}>⚡</div>
        <div style={{ fontSize: 92, fontWeight: 800, display: "flex", marginTop: 8 }}>
          Dex<span style={{ color: "#ee1515" }}>dle</span>
        </div>
        <div style={{ fontSize: 34, color: "#cbd5e1", marginTop: 18, display: "flex" }}>
          Guess the Pokémon card of the day — 8 tries, free
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 34 }}>
          {["🟩", "🟨", "⬛", "🟩", "🟩"].map((e, i) => (
            <div key={i} style={{ fontSize: 52, display: "flex" }}>{e}</div>
          ))}
        </div>
        <div style={{ fontSize: 26, color: "#64748b", marginTop: 36, display: "flex" }}>dexcompare.app/dexdle</div>
      </div>
    ),
    { ...size }
  );
}
