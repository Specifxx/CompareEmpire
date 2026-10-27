import { SITE_NAME, SITE_URL } from "./site";
import { formatMoney } from "./format";
import { currencyOf, type Country } from "./country";

export function isEmailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// Send a transactional email via Resend's REST API. Requires RESEND_API_KEY (and
// a sender on a domain verified in Resend, via EMAIL_FROM) to actually deliver;
// otherwise it no-ops and logs, so the rest of the app keeps working without
// email configured.
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set — "${subject}" to ${to} was NOT sent.`);
    return false;
  }
  // The sender domain must be verified in Resend or delivery is restricted to the
  // account owner. Override with EMAIL_FROM once dexcompare.app is verified. `||`
  // (not `??`) so an env var accidentally set to "" still falls back to a valid
  // sender instead of an empty From header that bounces the send.
  const from = process.env.EMAIL_FROM || `${SITE_NAME} <noreply@dexcompare.app>`;
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

// ─── Wishlist price-drop alerts ──────────────────────────────────────────────

export interface PriceDropItem {
  name: string;
  setCode: string;
  collectorNumber: string;
  url: string; // absolute card-page link
  oldCents: number;
  newCents: number;
  market: Country;
}

// Footer with an unsubscribe link, appended to every alert email so recipients
// always have a one-click way out (and so we stay CAN-SPAM/GDPR-friendly).
function alertFooter(unsubUrl: string): string {
  return `<tr><td style="padding:16px 32px 26px;border-top:1px solid #233047;font-size:12px;color:#6b7585">
    You're getting this because you asked ${SITE_NAME} to watch your wishlist for price drops.<br/>
    <a href="${unsubUrl}" style="color:#9aa4b2;text-decoration:underline">Unsubscribe from price-drop emails</a> · ${SITE_NAME} · Pokémon card price comparison.
  </td></tr>`;
}

function emailShell(heading: string, inner: string, footer: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0b0e14;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0e14;padding:32px 0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#131a26;border:1px solid #233047;border-radius:16px">
      <tr><td style="padding:28px 32px 6px"><div style="font-size:22px;font-weight:800;color:#fff">Dex<span style="color:#34d17e">Compare</span></div></td></tr>
      <tr><td style="padding:6px 32px 4px"><h1 style="margin:0;font-size:20px;color:#fff">${heading}</h1></td></tr>
      ${inner}
      ${footer}
    </table></td></tr></table></body></html>`;
}

// One row in the price-drop table.
function dropRow(item: PriceDropItem): string {
  const cur = currencyOf(item.market);
  const pct = item.oldCents > 0 ? Math.round(((item.oldCents - item.newCents) / item.oldCents) * 100) : 0;
  return `<tr><td style="padding:12px 0;border-bottom:1px solid #233047">
    <a href="${item.url}" style="color:#fff;font-weight:700;text-decoration:none;font-size:15px">${item.name}</a>
    <div style="font-size:12px;color:#6b7585;margin-top:2px">${item.setCode} · ${item.collectorNumber}</div>
    <div style="margin-top:6px;font-size:14px;color:#b8c0cc">
      <span style="color:#6b7585;text-decoration:line-through">${formatMoney(item.oldCents, cur)}</span>
      &nbsp;→&nbsp;<span style="color:#34d17e;font-weight:700">${formatMoney(item.newCents, cur)}</span>
      ${pct > 0 ? `&nbsp;<span style="background:#13351f;color:#34d17e;font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px">-${pct}%</span>` : ""}
    </div>
  </td></tr>`;
}

// The daily "a card on your wishlist got cheaper" email. Lists every card that
// dropped since the last check in one message.
export async function sendPriceDropEmail(to: string, items: PriceDropItem[], unsubUrl: string): Promise<boolean> {
  const count = items.length;
  const heading = count === 1 ? "A wishlist card just got cheaper" : `${count} wishlist cards just got cheaper`;
  const intro = `Good news — ${count === 1 ? "a card you're watching" : "some cards you're watching"} dropped in price:`;
  const inner = `
    <tr><td style="padding:8px 32px 4px;font-size:14px;line-height:1.6;color:#b8c0cc">${intro}</td></tr>
    <tr><td style="padding:4px 32px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.map(dropRow).join("")}</table></td></tr>
    <tr><td style="padding:4px 32px 24px"><a href="${SITE_URL}/wishlist" style="display:inline-block;background:#34d17e;color:#06210f;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px">View your wishlist</a></td></tr>`;
  const subject = count === 1 ? `Price drop: ${items[0]!.name} is now ${formatMoney(items[0]!.newCents, currencyOf(items[0]!.market))}` : `Price drops on ${count} of your wishlist cards`;
  return sendEmail(to, subject, emailShell(heading, inner, alertFooter(unsubUrl)));
}

// Sent once when someone subscribes via the wishlist pop-up, confirming the watch
// and surfacing the unsubscribe link up front.
export async function sendAlertConfirmationEmail(to: string, cardCount: number, unsubUrl: string): Promise<boolean> {
  const inner = `
    <tr><td style="padding:8px 32px 16px;font-size:14px;line-height:1.6;color:#b8c0cc">
      You're all set — we'll email you whenever the price drops on
      ${cardCount === 1 ? "the card" : `any of the ${cardCount} cards`} on your wishlist. We check prices once a day.
    </td></tr>
    <tr><td style="padding:4px 32px 24px"><a href="${SITE_URL}/wishlist" style="display:inline-block;background:#34d17e;color:#06210f;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px">View your wishlist</a></td></tr>`;
  return sendEmail(to, `You're watching your ${SITE_NAME} wishlist for price drops`, emailShell("Price-drop alerts are on", inner, alertFooter(unsubUrl)));
}

// ─── Weekly newsletter digest ────────────────────────────────────────────────

// Newsletter footer: the audience opted in via the footer signup, so the copy
// reflects that consent (distinct from the wishlist-alert footer above).
function newsletterFooter(unsubUrl: string): string {
  return `<tr><td style="padding:16px 32px 26px;border-top:1px solid #233047;font-size:12px;color:#6b7585">
    You're getting this because you signed up for the weekly ${SITE_NAME} Index summary.<br/>
    <a href="${unsubUrl}" style="color:#9aa4b2;text-decoration:underline">Unsubscribe</a> · ${SITE_NAME} · Pokémon card price comparison.
  </td></tr>`;
}

// The weekly digest itself; `inner` is built by lib/newsletter.ts so the content
// (movers tables, Index summary) lives next to the data that produces it.
export async function sendNewsletterDigestEmail(to: string, subject: string, heading: string, inner: string, unsubUrl: string): Promise<boolean> {
  return sendEmail(to, subject, emailShell(heading, inner, newsletterFooter(unsubUrl)));
}

// Sent once on first signup so subscribers hear from us immediately (and get the
// unsubscribe link up front) instead of silence until the next edition.
export async function sendNewsletterWelcomeEmail(to: string, unsubUrl: string): Promise<boolean> {
  const inner = `
    <tr><td style="padding:8px 32px 16px;font-size:14px;line-height:1.6;color:#b8c0cc">
      You're on the list — every week you'll get the ${SITE_NAME} Index summary: the Pokémon cards that
      spiked, the cards that dropped, and what the market did across AU, US and UK stores.
      The next edition lands this Saturday morning (Sydney time).
    </td></tr>
    <tr><td style="padding:4px 32px 24px"><a href="${SITE_URL}/market?utm_source=newsletter&utm_medium=email&utm_campaign=welcome" style="display:inline-block;background:#34d17e;color:#06210f;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px">See the live market index</a></td></tr>`;
  return sendEmail(to, `You're on the ${SITE_NAME} weekly Index summary`, emailShell("Welcome aboard", inner, newsletterFooter(unsubUrl)));
}

// ─── Restock alerts (featured sealed product) ────────────────────────────────

// Generic shell with a restock-specific footer (the wishlist footer copy doesn't fit).
function restockShell(heading: string, inner: string, unsubUrl: string): string {
  const footer = `<tr><td style="padding:16px 32px 26px;border-top:1px solid #233047;font-size:12px;color:#6b7585">
    You asked ${SITE_NAME} to tell you when this product restocks.<br/>
    <a href="${unsubUrl}" style="color:#9aa4b2;text-decoration:underline">Unsubscribe from restock alerts</a> · ${SITE_NAME} · Pokémon card &amp; sealed price comparison.
  </td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#0b0e14;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0e14;padding:32px 0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#131a26;border:1px solid #233047;border-radius:16px">
      <tr><td style="padding:28px 32px 6px"><div style="font-size:22px;font-weight:800;color:#fff">Dex<span style="color:#34d17e">Compare</span></div></td></tr>
      <tr><td style="padding:6px 32px 4px"><h1 style="margin:0;font-size:20px;color:#fff">${heading}</h1></td></tr>
      ${inner}
      ${footer}
    </table></td></tr></table></body></html>`;
}

// Sent once when someone subscribes to a product's restock alert.
export async function sendRestockConfirmationEmail(
  to: string,
  productName: string,
  trackerUrl: string,
  unsubUrl: string
): Promise<boolean> {
  const inner = `
    <tr><td style="padding:8px 32px 16px;font-size:14px;line-height:1.6;color:#b8c0cc">
      You're on the list — we'll email you the moment <strong style="color:#fff">${productName}</strong> is back in stock in your market.
      We check stock regularly; you'll be among the first to know.
    </td></tr>
    <tr><td style="padding:4px 32px 24px"><a href="${trackerUrl}" style="display:inline-block;background:#34d17e;color:#06210f;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px">View the live tracker</a></td></tr>`;
  return sendEmail(to, `You'll be notified when ${productName} restocks`, restockShell("Restock alert is on", inner, unsubUrl));
}

// One in-stock item shown in the "it's back!" email (the exact thing that
// restocked — so the reader can click straight through in the ~20-minute window).
export interface RestockItem {
  productType: string;
  retailerName: string;
  priceCents: number;
  url: string; // affiliate-tagged buy link
  currency: string;
}

function restockItemRow(it: RestockItem): string {
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #233047">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:14px;color:#fff">
        <strong>${it.productType}</strong> — ${it.retailerName}
        <div style="font-size:13px;color:#34d17e;font-weight:700;margin-top:2px">${formatMoney(it.priceCents, it.currency)}</div>
      </td>
      <td align="right" style="white-space:nowrap">
        <a href="${it.url}" style="display:inline-block;background:#34d17e;color:#06210f;font-weight:700;text-decoration:none;padding:9px 16px;border-radius:8px;font-size:13px">Buy →</a>
      </td>
    </tr></table>
  </td></tr>`;
}

// The "it's back!" email — fired when a watched product flips to in-stock. Lists
// exactly what restocked (type, store, price) with direct buy links, because in a
// 20-minute window every extra click costs the reader the box.
export async function sendRestockEmail(
  to: string,
  productName: string,
  items: RestockItem[],
  trackerUrl: string,
  unsubUrl: string
): Promise<boolean> {
  const list =
    items.length > 0
      ? `<tr><td style="padding:4px 32px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.map(restockItemRow).join("")}</table></td></tr>`
      : "";
  const inner = `
    <tr><td style="padding:8px 32px 4px;font-size:15px;line-height:1.6;color:#b8c0cc">
      Good news — <strong style="color:#fff">${productName}</strong> is <strong style="color:#34d17e">back in stock</strong> right now.
      Sealed stock on hyped sets goes fast, so don't wait:
    </td></tr>
    ${list}
    <tr><td style="padding:10px 32px 24px"><a href="${trackerUrl}" style="display:inline-block;background:#1e2a3d;color:#fff;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;border:1px solid #34d17e">See all stock on the tracker →</a></td></tr>`;
  return sendEmail(to, `🔔 ${productName} is back in stock`, restockShell(`${productName} is back in stock`, inner, unsubUrl));
}

// ─── Auth: email verification & password reset ───────────────────────────────

// On-brand HTML wrapper for transactional auth emails (single primary CTA). Same
// dark shell + DexCompare green as the other emails, but with a generic footer
// (no unsubscribe — these are account-essential, not marketing).
function authLayout(heading: string, body: string, cta: { label: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#0b0e14;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0e14;padding:32px 0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#131a26;border:1px solid #233047;border-radius:16px">
      <tr><td style="padding:28px 32px 6px"><div style="font-size:22px;font-weight:800;color:#fff">Dex<span style="color:#34d17e">Compare</span></div></td></tr>
      <tr><td style="padding:6px 32px 4px"><h1 style="margin:0;font-size:20px;color:#fff">${heading}</h1></td></tr>
      <tr><td style="padding:8px 32px 16px;font-size:14px;line-height:1.6;color:#b8c0cc">${body}</td></tr>
      <tr><td style="padding:4px 32px 26px"><a href="${cta.url}" style="display:inline-block;background:#34d17e;color:#06210f;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px">${cta.label}</a></td></tr>
      <tr><td style="padding:16px 32px 26px;border-top:1px solid #233047;font-size:12px;color:#6b7585">${SITE_NAME} · Pokémon card price comparison.<br/>If you didn't request this, you can safely ignore this email.</td></tr>
    </table></td></tr></table></body></html>`;
}

export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  return sendEmail(
    to,
    `Confirm your ${SITE_NAME} email`,
    authLayout("Confirm your email", `Thanks for signing up — confirm your email address to finish setting up your ${SITE_NAME} account.`, {
      label: "Confirm email",
      url: `${SITE_URL}/verify?token=${encodeURIComponent(token)}`,
    })
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  return sendEmail(
    to,
    `Reset your ${SITE_NAME} password`,
    authLayout("Reset your password", `We received a request to reset your ${SITE_NAME} password. This link expires in 1 hour.`, {
      label: "Reset password",
      url: `${SITE_URL}/reset?token=${encodeURIComponent(token)}`,
    })
  );
}
