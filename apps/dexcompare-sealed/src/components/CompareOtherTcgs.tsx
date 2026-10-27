// "Compare other TCGs": the owner's sister sites, each with an anchor that says what it compares (SEO sprint, 2026-10-23). Plain
// followed links between the owner's own sites, server-rendered; the footer keeps its shorter "Also from us" list.
export const OTHER_TCGS: readonly { url: string; anchor: string; site: string; blurb: string }[] = [
  { url: "https://riftcompare.com", anchor: "Riftbound card prices", site: "RiftCompare", blurb: "the Riftbound TCG, compared across stores." },
  { url: "https://opcompare.app", anchor: "One Piece Card Game prices", site: "OP Compare", blurb: "the One Piece Card Game, compared across stores." },
  { url: "https://mtgcompare.app", anchor: "Magic: The Gathering sealed prices", site: "MTG Compare", blurb: "Magic: The Gathering booster boxes and bundles, compared across stores." },
];

export function CompareOtherTcgs({ className = "mt-14" }: { className?: string }) {
  return (
    <section className={className} aria-labelledby="other-tcgs-h" data-other-tcgs="">
      <h2 id="other-tcgs-h" className="font-display text-xl font-bold tracking-tight">
        Compare other TCGs
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {OTHER_TCGS.map((s) => (
          <li key={s.url} className="card p-4">
            <a href={s.url} rel="noopener" className="font-display text-[15px] font-bold text-ink underline-offset-2 hover:text-brand hover:underline">
              {s.anchor}
            </a>
            <span className="mt-1 block text-sm leading-6 text-muted">
              {s.site}: {s.blurb}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
