import type { Metadata } from "next";
import { REGION_LIST, type Region } from "./regions";
import { SITE_NAME, SITE_URL } from "./site";

/**
 * JSON-LD for a <script> tag. Store titles flow into this, so "<" is escaped:
 * a title containing "</script>" must not be able to close the tag.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

/** Canonical + hreflang alternates for a page that exists in every region at /<region><rest>. */
export function regionAlternates(region: Region, rest: string): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const r of REGION_LIST) languages[r.hreflang] = `${SITE_URL}/${r.region}${rest}`;
  return { canonical: `${SITE_URL}/${region}${rest}`, languages };
}

export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  alternates?: Metadata["alternates"];
  image?: string | null;
  noindex?: boolean;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: opts.alternates ?? { canonical: `${SITE_URL}${opts.path}` },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: `${SITE_URL}${opts.path}`,
      siteName: SITE_NAME,
      type: "website",
      ...(opts.image ? { images: [{ url: opts.image }] } : {}),
    },
    twitter: { card: opts.image ? "summary_large_image" : "summary", title: opts.title, description: opts.description },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
