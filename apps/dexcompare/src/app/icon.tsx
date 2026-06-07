import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// DexCompare favicon — white "D" on Pokémon red.
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
          fontSize: 46,
          fontWeight: 800,
          borderRadius: 14,
        }}
      >
        D
      </div>
    ),
    { ...size }
  );
}
