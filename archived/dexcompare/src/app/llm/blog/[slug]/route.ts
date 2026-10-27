import { getArticle } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

// Clean markdown version of a blog post for AI agents (linked from the blog
// page's `alternate` type=text/markdown). The posts are already authored in
// markdown (Article.body), so this serves them raw. Ported from RiftCompare;
// DexCompare stores blog posts in the shared ARTICLES list keyed by category.
// A dynamic-segment route handler can't be ISR-cached without
// generateStaticParams, so `revalidate` alone cached nothing here — every request
// re-rendered. The content is static markdown from the ARTICLES list, so a CDN
// cache is the right layer (same approach as api/v1/card/[id]/prices.json).
export const revalidate = 600;

const CACHE_CONTROL = "public, s-maxage=600, stale-while-revalidate=86400";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const post = getArticle(params.slug);
  if (!post || post.category !== "blog") {
    return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/markdown; charset=utf-8" } });
  }

  const md = [
    `# ${post.title}`,
    "",
    `_${post.date} · ${post.author}_`,
    "",
    post.excerpt,
    "",
    post.body,
    "",
    `Source: ${SITE_URL}/blog/${post.slug}`,
  ].join("\n");
  return new Response(md + "\n", {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": CACHE_CONTROL },
  });
}
