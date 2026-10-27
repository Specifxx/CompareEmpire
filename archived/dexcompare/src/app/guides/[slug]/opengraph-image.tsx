import { ImageResponse } from "next/og";
import { getArticle } from "@/lib/articles";
import { articleOgElement, ARTICLE_OG_SIZE } from "@/lib/article-og";

// Per-guide share card (title + excerpt + read time) — without this every
// guide fell back to the generic site-wide opengraph-image.tsx.
export const size = ARTICLE_OG_SIZE;
export const contentType = "image/png";
export const alt = "DexCompare Guides";

export default function Image({ params }: { params: { slug: string } }) {
  const a = getArticle(params.slug);
  return new ImageResponse(articleOgElement(a?.category === "guide" ? a : undefined, "Guide"), { ...size });
}
