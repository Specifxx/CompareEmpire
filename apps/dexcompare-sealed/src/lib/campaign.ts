// WHICH CREATOR OR POST brought a visitor (owner, 2026-11-18: "how do we measure exactly the impact of creator outreach and social
// media?"). Every link we give a creator or post on social carries ?utm_source=<platform>&utm_medium=creator|social&
// utm_campaign=<handle or post>. SiteAnalytics already keeps those three tags on the page view, so Vercel counts the VISITORS of a
// campaign. The tag is gone after the first page, so this keeps the tab's first-touch campaign and the buy click sends ONE extra event,
// campaign_buy { campaign, retailer }, only for a visit that arrived tagged. buy_click and buy_product are not touched (Pro keeps just
// two properties per event, both already used), the quick view and the A/B tests are unaffected, and an untagged visit sends nothing.
// A tag, never a person: letters, digits, dash and underscore, 40 characters.
import type { AnalyticsEvent } from "./click-events";

const KEY = "dc_campaign";

/** Pure: a safe campaign tag from a landing URL's query string, or undefined. */
export function cleanCampaign(search: string): string | undefined {
  const raw = (new URLSearchParams(search).get("utm_campaign") ?? "").trim().toLowerCase();
  return raw.replace(/[^a-z0-9_-]/g, "").slice(0, 40) || undefined;
}

/** Pure: the extra event for a tagged visit's buy click, or null. */
export function campaignEvent(campaign: string | undefined, retailer: string): AnalyticsEvent | null {
  return campaign ? ["campaign_buy", { campaign, retailer: retailer.slice(0, 255) }] : null;
}

/** Client: the tab's first-touch campaign (only the first call in a tab writes), or undefined. */
export function readCampaign(): string | undefined {
  try {
    if (sessionStorage.getItem(KEY) === null) sessionStorage.setItem(KEY, cleanCampaign(window.location.search) ?? "");
    return sessionStorage.getItem(KEY) || undefined;
  } catch {
    return undefined;
  }
}
