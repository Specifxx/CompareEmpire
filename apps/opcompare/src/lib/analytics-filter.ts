// Which page views and events Vercel Web Analytics should never send (src/components/SiteAnalytics.tsx's beforeSend). Pro bills
// each one, and none of these is a visitor: a preview or local run, an automated browser, a bot-looking user agent, or the owner's
// own browser after ?notrack=1. Same rules as DexCompare's (apps/dexcompare-sealed).
export const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|phantom|puppeteer|playwright|selenium|python-requests|curl\/|wget/i;

export function isUncountedVisit(hostname: string, userAgent: string, webdriver: boolean, optOut: boolean): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app")) return true;
  if (webdriver || optOut) return true;
  return BOT_UA.test(userAgent);
}
