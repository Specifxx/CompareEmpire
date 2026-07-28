import type { Article } from "@/lib/articles";

// Shared social-share card renderer for /guides/[slug] and /blog/[slug] —
// both route folders import this so an article gets a real per-page OG image
// (title + excerpt + read time) instead of falling through to the generic
// site-wide default: red "D" mark, red wordmark accent, ink gradient
// background — the on-brand pattern, not the older purple/emoji default at
// src/app/opengraph-image.tsx.
export const ARTICLE_OG_SIZE = { width: 1200, height: 630 };

function titleSize(title: string): number {
  if (title.length <= 45) return 60;
  if (title.length <= 70) return 48;
  return 40;
}

export function articleOgElement(article: Article | undefined, kicker: "Guide" | "Blog") {
  const title = article?.title ?? `DexCompare ${kicker}s`;
  const excerpt = article?.excerpt ?? "Buy Pokémon cards smarter — pricing, conditions, grading and deals.";

  return (
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
            {kicker === "Guide" ? "Buying Guide" : "Blog"}
          </div>
        </div>
      </div>

      {/* Middle: title + excerpt */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: titleSize(title),
            fontWeight: 800,
            color: "#f1f5f9",
            display: "flex",
            lineHeight: 1.15,
            maxWidth: 1050,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#94a3b8",
            display: "flex",
            marginTop: 22,
            maxWidth: 980,
            lineHeight: 1.4,
          }}
        >
          {excerpt.length > 140 ? `${excerpt.slice(0, 140).trimEnd()}…` : excerpt}
        </div>
      </div>

      {/* Footer: read time + url */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 24, color: "#64748b", display: "flex" }}>
          {article ? `${article.readMins} min read · ${article.author}` : "Live Pokémon card prices across AU · NZ · US · UK"}
        </div>
        <div style={{ fontSize: 24, color: "#64748b", display: "flex" }}>dexcompare.app</div>
      </div>
    </div>
  );
}
