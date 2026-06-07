import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CompareEmpire — the home of smart price comparison",
  description:
    "CompareEmpire is the hub for a family of price-comparison sites — RiftCompare, CameraCompare and DexCompare — helping you find the best price, every time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
