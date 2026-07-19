import { ImageResponse } from "next/og";
import { getDeckSeed } from "@/lib/meta-decks";

// Per-deck share card — without this every /decks/[slug] page fell back to
// the generic site-wide opengraph-image.tsx (off-brand purple/lightning-bolt
// card) even though meta decks get shared on Reddit/Discord. Reads only the
// static META_DECKS seed data (no DB call), so it's unaffected by this
// sandbox's Prisma-auth build limitation.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "DexCompare Meta Deck";

function titleSize(name: string): number {
  if (name.length <= 18) return 76;
  if (name.length <= 30) return 60;
  return 46;
}

export default function Image({ params }: { params: { slug: string } }) {
  const seed = getDeckSeed(params.slug);
  const name = seed?.name ?? "Meta Deck";
  const legendName = seed?.legend.replace(/\s*-\s*Starter$/i, "");
  const cardCount = seed ? seed.cards.filter((c) => c.section !== "sideboard").reduce((n, c) => n + c.qty, 0) + 1 : null;

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
              {seed?.tier ? `${seed.tier} Meta Deck` : "Meta Deck"}
            </div>
          </div>
        </div>

        {/* Middle: deck name + stats */}
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
            {[legendName ? `Led by ${legendName}` : null, cardCount ? `${cardCount} cards` : null, "priced live"]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>

        {/* Footer: url */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 24, color: "#64748b", display: "flex" }}>
            Full decklist, priced across every store
          </div>
          <div style={{ fontSize: 24, color: "#64748b", display: "flex" }}>dexcompare.app</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
