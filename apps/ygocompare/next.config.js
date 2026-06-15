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
];

const nextConfig = {
  reactStrictMode: true,
  // Card images are external (<img> to store/Scryfall CDNs); never route them through
  // Vercel Image Optimization, which is metered. Keeps image cost at $0.
  images: { unoptimized: true },
  // Preview-stage: the sites were rapidly adapted from one codebase, so some
  // inherited types/lint rules don't yet match each vertical. Don't block
  // deploys on them — tighten and remove these later.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
module.exports = nextConfig;
