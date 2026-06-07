import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// LaptopCompare favicon — white "L" on indigo.
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
          background: "linear-gradient(135deg,#818cf8,#4f46e5)",
          color: "#fff",
          fontSize: 44,
          fontWeight: 800,
          borderRadius: 14,
        }}
      >
        L
      </div>
    ),
    { ...size }
  );
}
