import { ImageResponse } from "next/og";
import { getArticle } from "@/lib/articles";
import { articleOgElement, ARTICLE_OG_SIZE } from "@/lib/article-og";

// Per-post share card (title + excerpt + read time) — without this every
// blog post fell back to the generic site-wide opengraph-image.tsx.
export const size = ARTICLE_OG_SIZE;
export const contentType = "image/png";
export const alt = "DexCompare Blog";

export default function Image({ params }: { params: { slug: string } }) {
  const a = getArticle(params.slug);
  return new ImageResponse(articleOgElement(a?.category === "blog" ? a : undefined, "Blog"), { ...size });
}
