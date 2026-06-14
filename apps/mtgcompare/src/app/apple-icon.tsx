import { ImageResponse } from "next/og";

// 512×512 — Apple touch icon + the Organization logo used in Google's
// knowledge panel / rich results (referenced from the JSON-LD in layout).
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg,#60a5fa,#1d4ed8)",
          color: "#fff", fontSize: 340, fontWeight: 800, borderRadius: 96,
        }}
      >
        M
      </div>
    ),
    { ...size }
  );
}
