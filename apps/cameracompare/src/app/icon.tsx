import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// CameraCompare favicon — a simple camera lens on dark, amber ring.
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
          background: "#0b0f16",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg,#fbbf24,#d97706)",
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 16, background: "#0b0f16" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
