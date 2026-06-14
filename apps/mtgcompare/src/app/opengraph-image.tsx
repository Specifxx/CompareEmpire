import { ImageResponse } from "next/og";

export const alt = "MTGCompare — Magic: The Gathering prices";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social / share card: brand tile + wordmark + tagline on a dark backdrop.
export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 28,
          background: "#0a0c10", color: "#fff",
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 180, height: 180, borderRadius: 40, fontSize: 120, fontWeight: 800,
            background: "linear-gradient(135deg,#60a5fa,#1d4ed8)",
          }}
        >
          M
        </div>
        <div style={{ fontSize: 64, fontWeight: 800 }}>MTGCompare</div>
        <div style={{ fontSize: 30, color: "#9aa3ad" }}>Magic: The Gathering prices</div>
      </div>
    ),
    { ...size }
  );
}
