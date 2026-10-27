import { ImageResponse } from "next/og";
import { Logo } from "@/components/Logo";

export const alt = "YGOCompare — Yu-Gi-Oh! prices";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social / share card: themed brand mark + wordmark + tagline on a dark backdrop.
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
        <Logo size={200} />
        <div style={{ fontSize: 64, fontWeight: 800 }}>YGOCompare</div>
        <div style={{ fontSize: 30, color: "#9aa3ad" }}>Yu-Gi-Oh! prices</div>
      </div>
    ),
    { ...size }
  );
}
