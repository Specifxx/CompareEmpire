// Transactional email through Resend's HTTP API (no SDK). Inert until
// RESEND_API_KEY is set: send() returns false and the callers leave their
// state untouched, so nothing is lost while email isn't configured.
import { SITE_NAME, SITE_URL } from "./site";

const FROM = process.env.EMAIL_FROM || `${SITE_NAME} <alerts@dexcompare.com>`;

export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function send(opts: { to: string; subject: string; html: string; text: string; unsubscribeUrl?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        headers: opts.unsubscribeUrl
          ? { "List-Unsubscribe": `<${opts.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
          : undefined,
      }),
    });
    if (!res.ok) console.warn(`email to ${opts.to.replace(/(.).*@/, "$1…@")} failed: ${res.status} ${await res.text().catch(() => "")}`);
    return res.ok;
  } catch (e) {
    console.warn("email send failed:", (e as Error).message);
    return false;
  }
}

/** The page a person lands on from the email footer (confirms before deleting). */
export function unsubscribeUrl(token: string): string {
  return `${SITE_URL}/alerts/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** RFC 8058 one-click target for the List-Unsubscribe header (mail clients POST to it). */
export function oneClickUnsubscribeUrl(token: string): string {
  return `${SITE_URL}/api/alerts/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** A plain, readable email body: heading, items, footer with the unsubscribe link. */
export function layout(heading: string, bodyHtml: string, token: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#15171c">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<div style="font-weight:800;font-size:18px;letter-spacing:-0.02em;margin-bottom:18px">Dex<span style="color:#e3350d">Compare</span></div>
<div style="background:#fff;border-radius:14px;padding:22px 22px 8px;border:1px solid #e6e6ea">
<h1 style="font-size:20px;line-height:1.3;margin:0 0 14px">${escapeHtml(heading)}</h1>
${bodyHtml}
</div>
<p style="font-size:12px;color:#6b6f7a;line-height:1.5;margin:16px 4px">You asked ${SITE_NAME} to tell you when these were back in stock. Prices and stock change fast — check the store before you buy.<br>
<a href="${unsubscribeUrl(token)}" style="color:#6b6f7a">Unsubscribe from all restock alerts</a></p>
</div></body></html>`;
}
