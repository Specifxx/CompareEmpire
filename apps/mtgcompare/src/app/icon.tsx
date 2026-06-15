import { ImageResponse } from "next/og";
import { Logo } from "@/components/Logo";

// 96×96 — Google Search shows favicons sized in multiples of 48px.
export const size = { width: 96, height: 96 };
export const contentType = "image/png";

// MTGCompare favicon — the five-colour mana pentagon brand mark.
export default function Icon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}><Logo size={96} /></div>,
    { ...size }
  );
}
