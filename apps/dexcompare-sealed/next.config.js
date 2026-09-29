/** @type {import('next').NextConfig} */

// Safe defaults on every response. The Content-Security-Policy is REPORT-ONLY:
// product photos are hotlinked from ~250 store CDNs, and an enforcing policy
// that is wrong silently blanks them. Report-only never blocks anything; a
// violation shows in the browser console (there is no report endpoint), and the
// audit before switching it to enforce is: browse a few pages, read the console.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "img-src https: data:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "connect-src 'self' https://vitals.vercel-insights.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Product photos are plain <img> tags pointing at each store's own CDN. Never
  // route them through Vercel Image Optimization, which is metered.
  images: { unoptimized: true },
  // The old DexCompare was a singles site. Its section URLs now point at the
  // sealed equivalents in Australia (its home market); old card pages 404.
  // Upper-case region prefixes (/AU) are lowercased by src/middleware.ts: a
  // redirect here matches case-insensitively, so "/AU/:path*" → "/au/:path*"
  // would match /au too and loop.
  async redirects() {
    return [
      { source: "/sealed", destination: "/au/sealed", permanent: true },
      { source: "/sealed/:slug", destination: "/au/sealed", permanent: true },
      { source: "/browse", destination: "/au/sealed", permanent: true },
      { source: "/sets", destination: "/au/sets", permanent: true },
      { source: "/sets/:set", destination: "/au/sets/:set", permanent: true },
      { source: "/stores", destination: "/au/stores", permanent: true },
      { source: "/restock", destination: "/au", permanent: true },
      { source: "/restock/:slug", destination: "/au", permanent: true },
      { source: "/deals", destination: "/au/sealed", permanent: true },
      { source: "/guides/:path*", destination: "/about", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
