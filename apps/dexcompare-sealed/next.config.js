/** @type {import('next').NextConfig} */

// Safe defaults on every response. No enforcing Content-Security-Policy: product
// photos are hotlinked from ~250 store CDNs, and a wrong CSP silently blanks them.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Product photos are plain <img> tags pointing at each store's own CDN. Never
  // route them through Vercel Image Optimization, which is metered.
  images: { unoptimized: true },
  // The old DexCompare was a singles site. Its section URLs now point at the
  // sealed equivalents in Australia (its home market); old card pages 404.
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
