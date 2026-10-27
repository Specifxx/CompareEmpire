import { ImageResponse } from "next/og";

// Favicon: gold crown on the imperial purple gradient. 96×96 — a multiple of
// 48px, which Google Search requires to show a site icon in results.
export const size = { width: 96, height: 96 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7c3aed 0%, #13171f 70%)",
          borderRadius: 20,
          fontSize: 56,
        }}
      >
        👑
      </div>
    ),
    { ...size }
  );
}
