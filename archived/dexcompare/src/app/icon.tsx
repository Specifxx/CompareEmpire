import { ImageResponse } from "next/og";

// 96×96 — Google Search only shows favicons that are a multiple of 48px
// (48/96/144…), so 96 covers Search results and stays crisp in browser tabs.
export const size = { width: 96, height: 96 };
export const contentType = "image/png";

// DexCompare favicon — a Pokéball. The cross-section gradient gives the red top,
// dark equator band and white base; the centre button sits on top.
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
          borderRadius: "50%",
          background:
            "linear-gradient(to bottom,#ff6a6a 0%,#d61a1a 41%,#161018 41%,#161018 59%,#eef1f5 59%,#ffffff 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "#161018",
          }}
        >
          <div style={{ width: 15, height: 15, borderRadius: "50%", background: "#fff" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
