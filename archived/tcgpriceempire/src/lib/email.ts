import { SITE_NAME } from "./site";
import { formatMoney } from "./format";

export function isEmailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// Send a transactional email via Resend's REST API (no SDK — one fetch is all
// it takes). Requires RESEND_API_KEY (and a sender on a domain verified in
// Resend, via EMAIL_FROM) to actually deliver; otherwise it no-ops and logs,
// so the rest of the app keeps working without email configured.
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set — "${subject}" to ${to} was NOT sent.`);
    return false;
  }
  // `||` (not `??`) so an env var accidentally set to "" still falls back to a
  // valid sender instead of an empty From header that bounces the send.
  const from = process.env.EMAIL_FROM || "TCGPriceEmpire <alerts@tcgpriceempire.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) console.warn(`[email] Resend returned ${res.status} for "${subject}".`);
    return res.ok;
  } catch (e) {
    console.warn("[email] send failed:", e);
    return false;
  }
}

// ─── Price-drop alert emails ─────────────────────────────────────────────────

// Brand palette (inline because email clients ignore stylesheets):
// imperial purple #8b5cf6 for actions, gold #fbbf24 for prices, ink dark shell.
const PURPLE = "#8b5cf6";
const GOLD = "#fbbf24";

// Footer with an unsubscribe link, appended to every alert email so recipients
// always have a one-click way out (and so we stay CAN-SPAM/GDPR-friendly).
function alertFooter(unsubUrl: string): string {
  return `<tr><td style="padding:16px 32px 26px;border-top:1px solid #252b38;font-size:12px;color:#6b7585">
    You're getting this because you asked ${SITE_NAME} to watch this card's price.<br/>
    <a href="${unsubUrl}" style="color:#9aa4b2;text-decoration:underline">Unsubscribe from price alerts</a> · ${SITE_NAME} · TCG price comparison.
  </td></tr>`;
}

function emailShell(heading: string, inner: string, unsubUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0b0e14;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0e14;padding:32px 0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#13171f;border:1px solid #252b38;border-radius:16px">
      <tr><td style="padding:28px 32px 6px"><div style="font-size:22px;font-weight:800;color:#fff">TCGPrice<span style="color:${GOLD}">Empire</span></div></td></tr>
      <tr><td style="padding:6px 32px 4px"><h1 style="margin:0;font-size:20px;color:#fff">${heading}</h1></td></tr>
      ${inner}
      ${alertFooter(unsubUrl)}
    </table></td></tr></table></body></html>`;
}

// Sent once when someone subscribes to a card's price alert, confirming the
// watch and surfacing the unsubscribe link up front.
export async function sendAlertConfirmationEmail(to: string, cardName: string, unsubUrl: string): Promise<boolean> {
  const inner = `
    <tr><td style="padding:8px 32px 16px;font-size:14px;line-height:1.6;color:#b8c0cc">
      You're all set — we'll email you when the market price drops on
      <strong style="color:#fff">${cardName}</strong>. We check prices once a day.
    </td></tr>`;
  return sendEmail(to, `You're watching ${cardName} on ${SITE_NAME}`, emailShell("Price alert is on", inner, unsubUrl));
}

// The "it dropped!" email — fired by runPriceAlerts when a watched card hits the
// subscriber's target (or just falls week-on-week for target-less watches).
export async function sendPriceDropEmail(
  to: string,
  cardName: string,
  currentCents: number,
  targetCents: number | null,
  cardUrl: string,
  unsubUrl: string
): Promise<boolean> {
  const price = formatMoney(currentCents, "USD");
  const why =
    targetCents != null
      ? `that's at or below your target of <strong style="color:#fff">${formatMoney(targetCents, "USD")}</strong>`
      : "that's a real drop versus last week";
  const inner = `
    <tr><td style="padding:8px 32px 4px;font-size:14px;line-height:1.6;color:#b8c0cc">
      Good news — <a href="${cardUrl}" style="color:#fff;font-weight:700;text-decoration:none">${cardName}</a>
      is now <strong style="color:${GOLD};font-size:18px">${price}</strong> — ${why}.
    </td></tr>
    <tr><td style="padding:14px 32px 24px"><a href="${cardUrl}" style="display:inline-block;background:${PURPLE};color:#fff;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px">Compare prices now</a></td></tr>`;
  return sendEmail(to, `Price drop: ${cardName} is now ${price}`, emailShell("A card you're watching got cheaper", inner, unsubUrl));
}
