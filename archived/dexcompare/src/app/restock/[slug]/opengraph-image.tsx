import { ImageResponse } from "next/og";
import { getFeaturedRestock } from "@/lib/restocks";

// Per-product share card for the restock trackers — without this every
// /restock/[slug] page fell back to the generic site-wide opengraph-image.tsx
// (off-brand purple/lightning-bolt card) even though these pages carry real
// high-intent "is it back in stock" search + social-share traffic. Reads only
// the static FEATURED_RESTOCKS config (no DB call), so it's unaffected by
// this sandbox's Prisma-auth build limitation.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "DexCompare Restock Tracker";

function titleSize(name: string): number {
  if (name.length <= 18) return 76;
  if (name.length <= 30) return 60;
  return 46;
}

export default function Image({ params }: { params: { slug: string } }) {
  const product = getFeaturedRestock(params.slug);
  const name = product?.name ?? "Restock Tracker";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #13171f 0%, #0a0c10 55%, #1a1013 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header: brand mark + kicker */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#ee1515",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
              color: "white",
            }}
          >
            D
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 800, display: "flex" }}>
              Dex<span style={{ color: "#ff4d4d" }}>Compare</span>
            </div>
            <div style={{ fontSize: 18, color: "#94a3b8", display: "flex", marginTop: 2 }}>
              {product?.series ? `${product.series} Series` : "Restock Tracker"}
            </div>
          </div>
        </div>

        {/* Middle: product name + status hook */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: titleSize(name),
              fontWeight: 800,
              color: "#f1f5f9",
              display: "flex",
              lineHeight: 1.15,
              maxWidth: 1050,
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 26, color: "#94a3b8", display: "flex", marginTop: 18 }}>
            In stock now? · live across every store we track
          </div>
        </div>

        {/* Footer: url */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 24, color: "#64748b", display: "flex" }}>
            Free restock email alert
          </div>
          <div style={{ fontSize: 24, color: "#64748b", display: "flex" }}>dexcompare.app</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
