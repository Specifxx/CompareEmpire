/** @type {import('next').NextConfig} */

// Baseline security headers applied to every response. These are safe defaults
// that don't depend on the page's content. A Content-Security-Policy is
// deliberately omitted here: a strict CSP needs per-app tuning (Next.js inline
// hydration scripts, Vercel Analytics/Speed Insights, AdSense, the external image
// CDNs) and a wrong one silently breaks the site — add it separately once tested.
const securityHeaders = [
  // Force HTTPS for two years, including subdomains. Vercel serves HTTPS already;
  // this tells browsers to never even attempt plain HTTP.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Don't let browsers MIME-sniff responses into a different content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking protection: only this origin may frame the site.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Don't leak full URLs (incl. any ?token=… params) to third parties via Referer.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // We don't use these device APIs — deny them.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Content-Security-Policy in REPORT-ONLY mode: it logs violations but never
  // blocks anything, so it can't break ads/affiliates while we tune the allow-list.
  // Allow-lists `self` + the third parties actually referenced in the codebase:
  //   - Vercel Analytics / Speed Insights (va.vercel-scripts.com, *.vercel-insights.com)
  //   - Card image CDNs (images.pokemontcg.io, images.scrydex.com)
  //   - Affiliate creatives/links (a.impactradius-go.com, partner.tcgplayer.com)
  //   - HilltopAds delivery (deliciouslip.com)
  //   - Sovrn / VigLink (cdn.viglink.com)
  // Ad networks chain to further hosts at runtime — those will surface as reports
  // and get added before any enforcing CSP is promoted. Report-only only.
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://cdn.viglink.com https://deliciouslip.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://images.pokemontcg.io https://images.scrydex.com https://a.impactradius-go.com https://partner.tcgplayer.com https://deliciouslip.com https://cdn.viglink.com",
      "connect-src 'self' https://*.vercel-insights.com https://va.vercel-scripts.com https://cdn.viglink.com https://deliciouslip.com",
      "frame-src 'self' https://deliciouslip.com",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  // Card images are external (<img> to store/Scryfall CDNs); never route them through
  // Vercel Image Optimization, which is metered. Keeps image cost at $0.
  images: { unoptimized: true },
  // Preview-stage: the sites were rapidly adapted from one codebase, so some
  // inherited types/lint rules don't yet match each vertical. Don't block
  // deploys on them — tighten and remove these later.
  // App code is type-checked on every build now (dev-only scripts/ are excluded
  // from the app tsconfig, so they can't block a deploy). ESLint stays off during
  // builds to avoid blocking on lint-only warnings.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // /cheapest was removed (replaced by the value pages); Google still knows
      // the URL (GSC "Not found (404)"). 301 to /deals to close the 404 and
      // recover any residual link equity.
      { source: "/cheapest", destination: "/deals", permanent: true },
    ];
  },
};
module.exports = nextConfig;
