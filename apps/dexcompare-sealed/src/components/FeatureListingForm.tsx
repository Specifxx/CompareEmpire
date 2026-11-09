"use client";

// The "feature your listing" form (/advertise). Posts to RiftCompare's service, which returns a Stripe Checkout URL; the card is
// only held until we approve the listing. Inline styles inherited from currentColor so it sits on light and dark.
import { useState, type CSSProperties, type FormEvent } from "react";
import { ADS_PRIVACY, ADS_SERVICE, AD_REGIONS, MAX_WEEKS, WEEK_PRICE_USD } from "@/lib/featured-ads";

const field: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 11px", border: "1px solid rgba(127,127,127,.45)", borderRadius: 8, background: "transparent", color: "inherit", font: "inherit", fontSize: 15 };
const label: CSSProperties = { display: "block", fontSize: 14, fontWeight: 600, margin: "14px 0 4px" };
const hint: CSSProperties = { fontSize: 12.5, opacity: 0.75, margin: "4px 0 0" };
const hidden: CSSProperties = { position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" };

export function FeatureListingForm({ defaultRegion = "ALL" }: { defaultRegion?: string }) {
  const [weeks, setWeeks] = useState(1);
  const [state, setState] = useState<{ s: "idle" | "sending" } | { s: "error"; message: string }>({ s: "idle" });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (String(f.get("website") ?? "")) return;
    setState({ s: "sending" });
    try {
      const r = await fetch(ADS_SERVICE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeks,
          title: f.get("title"),
          blurb: f.get("blurb"),
          destUrl: f.get("destUrl"),
          imageUrl: f.get("imageUrl"),
          priceText: f.get("priceText"),
          region: f.get("region"),
          email: f.get("email"),
          terms: f.get("terms") === "on",
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
      if (r.ok && j.ok && j.url) {
        window.location.href = j.url;
        return;
      }
      setState({ s: "error", message: j.error || "Couldn't start checkout. Please try again." });
    } catch {
      setState({ s: "error", message: "Couldn't reach checkout. Check your connection and try again." });
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 620 }} data-feature-form>
      <label style={{ ...label, marginTop: 0 }} htmlFor="fa-title">Title</label>
      <input id="fa-title" name="title" style={field} maxLength={80} minLength={6} required placeholder="Charizard ex 151 PSA 10, graded and ready to ship" />
      <label style={label} htmlFor="fa-blurb">One line about it (optional)</label>
      <input id="fa-blurb" name="blurb" style={field} maxLength={140} placeholder="Ships from Sydney in 1 business day" />
      <label style={label} htmlFor="fa-url">Where should it link?</label>
      <input id="fa-url" name="destUrl" style={field} type="url" maxLength={800} required placeholder="https://www.ebay.com/itm/..." inputMode="url" autoCapitalize="none" />
      <p style={hint}>Any website, an eBay listing, your own shop: a full https:// address.</p>
      <label style={label} htmlFor="fa-img">Photo address</label>
      <input id="fa-img" name="imageUrl" style={field} type="url" maxLength={800} required placeholder="https://.../photo.jpg" inputMode="url" autoCapitalize="none" />
      <p style={hint}>A direct link to a square-ish photo (right-click the image, copy image address). We show it as is.</p>
      <label style={label} htmlFor="fa-price">Price to show (optional)</label>
      <input id="fa-price" name="priceText" style={field} maxLength={30} placeholder="A$129.00" />
      <label style={label} htmlFor="fa-region">Show it to visitors in</label>
      <select id="fa-region" name="region" style={field} defaultValue={defaultRegion}>
        {AD_REGIONS.map(([code, name]) => (
          <option key={code} value={code} style={{ color: "#111" }}>{name}</option>
        ))}
      </select>
      <label style={label} htmlFor="fa-weeks">How long?</label>
      <select id="fa-weeks" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} style={field}>
        {Array.from({ length: MAX_WEEKS }, (_, i) => i + 1).map((w) => (
          <option key={w} value={w} style={{ color: "#111" }}>
            {w} week{w > 1 ? "s" : ""} · US${w * WEEK_PRICE_USD}
          </option>
        ))}
      </select>
      <label style={label} htmlFor="fa-email">Your email</label>
      <input id="fa-email" name="email" type="email" required autoComplete="email" style={field} maxLength={200} />
      <p style={hint}>For your receipt and to tell you if we approve it.</p>
      <div style={hidden} aria-hidden="true">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, margin: "16px 0 0", cursor: "pointer" }}>
        <input type="checkbox" name="terms" required style={{ marginTop: 4 }} />
        <span>I own or am authorised to promote this listing, it is legal and genuine, and I understand it is reviewed before it goes live.</span>
      </label>
      <button type="submit" disabled={state.s === "sending"} className="btn-primary mt-5">
        {state.s === "sending" ? "Opening checkout…" : `Continue to payment · US$${weeks * WEEK_PRICE_USD}`}
      </button>
      {state.s === "error" && (
        <p role="alert" style={{ ...hint, opacity: 1, color: "#c0392b", fontSize: 14, marginTop: 10 }}>{state.message}</p>
      )}
      <p style={{ ...hint, marginTop: 12 }}>
        Payments are taken by Stripe on our sister site RiftCompare (<a href={ADS_PRIVACY} style={{ color: "inherit" }}>privacy</a>). Your card is held, not charged, until we approve the listing.
      </p>
    </form>
  );
}
