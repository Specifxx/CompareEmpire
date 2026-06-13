import { ImageResponse } from "next/og";

// 96×96 — Google Search only shows favicons that are a multiple of 48px
// (48/96/144…), so 96 covers Search results and stays crisp in browser tabs.
export const size = { width: 96, height: 96 };
export const contentType = "image/png";

// YGOCompare favicon — white "D" on Yu-Gi-Oh! red.
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
          background: "linear-gradient(135deg,#ff5a5a,#c20d0d)",
          color: "#fff",
          fontSize: 69,
          fontWeight: 800,
          borderRadius: 21,
        }}
      >
        D
      </div>
    ),
    { ...size }
  );
}
