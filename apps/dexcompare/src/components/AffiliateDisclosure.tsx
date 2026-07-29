// Affiliate disclosure, placed DIRECTLY ADJACENT to affiliate links.
//
// Required by the eBay Partner Network Agreement (Participation Requirements
// §I.G) and by regional advertising-disclosure law: the disclosure must be
// "clear and prominent" and immediately visible wherever an affiliate link is
// — not only in a page footer, and specifically including inside pop-ups/modals.
// A 2026 EPN compliance review flagged this site for (a) a disclosure sitting
// too far from the eBay links and (b) no disclosure at all inside the card
// quick-view pop-up, so every affiliate surface now renders one of these
// inline. TCGplayer (via Impact) is covered by the same wording.
//
// Keep the eBay Partner Network named explicitly — EPN's own guidance gives
// "As an eBay Partner Network Affiliate, I earn from qualifying purchases." as
// the model wording, and a generic "we may earn a commission" does not name the
// programme.

const TEXT =
  "Ad — affiliate links. As an eBay Partner Network and TCGplayer affiliate, we earn from qualifying purchases at no extra cost to you.";

// `inline` — a single compact line to sit right under a set of links/buttons.
// `block`  — a bordered strip for the top/bottom of a modal or price table.
export function AffiliateDisclosure({
  variant = "inline",
  className = "",
}: {
  variant?: "inline" | "block";
  className?: string;
}) {
  if (variant === "block") {
    return (
      <p
        className={`rounded-md border border-ink-800 bg-ink-950/60 px-3 py-2 text-[11px] leading-snug text-slate-400 ${className}`}
      >
        {TEXT}
      </p>
    );
  }
  // slate-400, not slate-500/600: a disclosure that is technically present but
  // visually washed out (below WCAG AA contrast) isn't "clear and prominent".
  return (
    <p className={`text-[11px] leading-snug text-slate-400 ${className}`}>{TEXT}</p>
  );
}
