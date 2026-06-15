import { ImageResponse } from "next/og";
import { Logo } from "@/components/Logo";

// 512×512 — Apple touch icon + the Organization logo used in Google's
// knowledge panel / rich results (referenced from the JSON-LD in layout).
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}><Logo size={512} /></div>,
    { ...size }
  );
}
