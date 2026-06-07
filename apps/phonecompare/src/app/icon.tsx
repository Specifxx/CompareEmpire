import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// PhoneCompare favicon — white "P" on emerald.
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
          background: "linear-gradient(135deg,#34d399,#059669)",
          color: "#fff",
          fontSize: 44,
          fontWeight: 800,
          borderRadius: 14,
        }}
      >
        P
      </div>
    ),
    { ...size }
  );
}
