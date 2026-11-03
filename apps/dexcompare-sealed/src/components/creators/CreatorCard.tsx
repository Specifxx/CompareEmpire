import { initials, PLATFORM_STYLE, type Creator } from "@/lib/creators";

// One featured creator: avatar, what they make, their channels, and the "Buy them a pack" button that goes to THEIR tip page.
// Server HTML, no script. rel="noopener" without "noreferrer": the creator's analytics should see dexcompare.app as the referrer,
// that is the point of the listing.
const TINTS = ["from-brand/25 via-spark/20 to-brand/5", "from-pre/25 via-brand/10 to-spark/15", "from-open/25 via-spark/15 to-brand/10", "from-spark/30 via-brand/10 to-pre/15"];

export function CreatorCard({ creator, index = 0 }: { creator: Creator; index?: number }) {
  const main = creator.links[0];
  return (
    <article id={creator.slug} className="card group relative flex scroll-mt-24 flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`h-20 bg-gradient-to-br ${TINTS[index % TINTS.length]}`} aria-hidden />
      <div className="-mt-10 flex flex-1 flex-col px-5 pb-5">
        <div className="flex items-end justify-between gap-3">
          {creator.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.avatar} alt={`${creator.name}'s avatar`} width={80} height={80} loading="lazy" decoding="async" className="h-20 w-20 rounded-2xl border-4 border-surface bg-raised object-cover shadow-card" />
          ) : (
            <div aria-hidden className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-surface bg-brand text-2xl font-extrabold text-brand-ink shadow-card">
              {initials(creator.name)}
            </div>
          )}
          {creator.region && <span className="chip mb-1 px-2 py-0.5 text-xs">{creator.region}</span>}
        </div>
        <h3 className="mt-3 font-display text-lg font-bold">{creator.name}</h3>
        <p className="mt-1 text-sm leading-6 text-muted">{creator.blurb}</p>
        {creator.tags && creator.tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {creator.tags.slice(0, 3).map((t) => (
              <li key={t} className="rounded-full bg-raised px-2 py-0.5 text-xs font-medium text-muted">
                {t}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {creator.links.map((l) => {
            const st = PLATFORM_STYLE[l.platform];
            return (
              <a key={l.url} href={l.url} target="_blank" rel="noopener" className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-opacity hover:opacity-85" style={{ backgroundColor: st.bg, color: st.fg }}>
                {l.platform}
                {l.handle && <span className="font-medium opacity-80">{l.handle}</span>}
              </a>
            );
          })}
        </div>
        <div className="mt-auto pt-5">
          {creator.tipUrl ? (
            <a href={creator.tipUrl} target="_blank" rel="noopener" className="btn-primary flex min-h-11 w-full">
              <PackIcon /> Buy {creator.name.split(" ")[0]} a pack
            </a>
          ) : main ? (
            <a href={main.url} target="_blank" rel="noopener" className="btn-ghost flex min-h-11 w-full">
              Watch on {main.platform} →
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function PackIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 3h12l-1 3 1 3-1 3 1 3-1 3 1 3H6l1-3-1-3 1-3-1-3 1-3-1-3z" strokeLinejoin="round" />
      <path d="M10 10l2-2 2 2-2 2z" fill="currentColor" stroke="none" />
    </svg>
  );
}
