// "Compare other TCGs": the owner's sister sites, each with an anchor that says what it compares (SEO sprint, 2026-10-23). Plain
// followed links between the owner's own sites, server-rendered; the footer keeps its shorter "Also from us" list.
export const OTHER_TCGS: readonly { url: string; anchor: string; site: string; blurb: string }[] = [
  { url: "https://riftcompare.com", anchor: "Riftbound card prices", site: "RiftCompare", blurb: "the Riftbound TCG, compared across stores." },
  { url: "https://opcompare.app", anchor: "One Piece Card Game prices", site: "OP Compare", blurb: "the One Piece Card Game, compared across stores." },
  { url: "https://mtgcompare.app", anchor: "Magic: The Gathering sealed prices", site: "MTG Compare", blurb: "Magic: The Gathering booster boxes and bundles, compared across stores." },
];

/** One quiet line (2026-11-13: it was a heading and three cards): a label, then each sister site by what it compares. */
export function CompareOtherTcgs({ className = "mt-16 sm:mt-20" }: { className?: string }) {
  return (
    <nav className={`flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-line pt-6 text-sm ${className}`} aria-labelledby="other-tcgs-h" data-other-tcgs="">
      <p id="other-tcgs-h" className="eyebrow">
        Compare other TCGs
      </p>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {OTHER_TCGS.map((s) => (
          <li key={s.url}>
            <a href={s.url} rel="noopener" title={`${s.site}: ${s.blurb}`} className="font-medium text-muted underline-offset-2 transition-colors hover:text-ink hover:underline">
              {s.anchor}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
