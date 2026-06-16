import { Logo } from "@/components/Logo";
import { SUBSIDIARIES, getAllStats, subsidiaryUrl } from "@/lib/subsidiaries";

export const dynamic = "force-dynamic"; // always read live counts

function fmt(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("en-AU");
}

export default async function Home() {
  const stats = await getAllStats();

  const totalProducts = SUBSIDIARIES.reduce((a, s) => a + (stats[s.key]?.products ?? 0), 0);
  const totalPrices = SUBSIDIARIES.reduce((a, s) => a + (stats[s.key]?.pricePoints ?? 0), 0);
  const liveCount = SUBSIDIARIES.filter((s) => stats[s.key]?.online).length;

  return (
    <main className="imperial-grid">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <span className="text-lg font-extrabold tracking-tight">
            Compare<span className="text-brand-400">Empire</span>
          </span>
        </div>
        <nav className="hidden gap-7 text-sm text-white/70 sm:flex">
          <a href="#subsidiaries" className="hover:text-white">Subsidiaries</a>
          <a href="#about" className="hover:text-white">About</a>
          <a href="mailto:hello@compareempire.com" className="hover:text-white">Contact</a>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-10 text-center sm:pt-20">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> {liveCount} live site{liveCount === 1 ? "" : "s"} · tracking {fmt(totalProducts)} products
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            The home of <span className="bg-gradient-to-r from-brand-400 to-gold bg-clip-text text-transparent">smart price comparison</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            CompareEmpire builds focused price-comparison sites for the things people love to
            collect and create with — trading cards, cameras and more. One playbook, many verticals.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href="#subsidiaries" className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600">
              Explore the empire
            </a>
            <a href="#about" className="rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/5">
              How it works
            </a>
          </div>
        </div>

        {/* Aggregate stats */}
        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Products tracked", value: fmt(totalProducts) },
            { label: "Live price points", value: fmt(totalPrices) },
            { label: "Compare sites", value: `${SUBSIDIARIES.length}` },
            { label: "Markets", value: "AU · US · UK · NZ" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left shadow-card">
              <div className="text-2xl font-black text-white">{s.value}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/50">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Subsidiaries */}
      <section id="subsidiaries" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-extrabold sm:text-3xl">Our subsidiaries</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-white/60">
          Each site runs the same comparison engine, tuned to its vertical. Live counts below are
          read straight from each subsidiary's database.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {SUBSIDIARIES.map((s) => {
            const st = stats[s.key];
            return (
              <a
                key={s.key}
                href={subsidiaryUrl(s)}
                target="_blank"
                rel="noreferrer"
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-card transition hover:-translate-y-1 hover:border-white/20"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: `linear-gradient(90deg, ${s.accent}, transparent)` }}
                />
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                    style={{ backgroundColor: `${s.accent}22`, border: `1px solid ${s.accent}55` }}
                  >
                    {s.emoji}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      st?.online ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"
                    }`}
                  >
                    {st?.online ? "● Live" : "○ Offline"}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-extrabold">{s.name}</h3>
                <div className="text-xs font-medium uppercase tracking-wide" style={{ color: s.accent }}>
                  {s.vertical} · {s.region}
                </div>
                <p className="mt-3 text-sm text-white/65">{s.tagline}</p>

                {s.external && st?.products == null ? (
                  <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-white/50">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold text-white/70">Owned</span>
                    <span>Independently hosted compare site</span>
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
                    <div>
                      <div className="text-base font-bold text-white">{fmt(st?.products ?? null)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-white/45">products</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-white">{fmt(st?.retailers ?? null)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-white/45">retailers</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-white">{fmt(st?.pricePoints ?? null)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-white/45">prices</div>
                    </div>
                  </div>
                )}

                <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: s.accent }}>
                  Visit {s.name}
                  <span className="transition group-hover:translate-x-1">→</span>
                </div>
              </a>
            );
          })}
        </div>

        {/* Coming soon */}
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-6 text-white/50">
            <div className="text-2xl">🏠</div>
            <h3 className="mt-4 text-lg font-bold text-white/80">More verticals</h3>
            <p className="mt-2 text-sm">The same comparison engine, new categories. On the roadmap.</p>
            <span className="mt-4 inline-block rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold">Coming soon</span>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-card sm:p-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">One playbook, many verticals</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-3">
            {[
              { t: "Find the lowest price", d: "We aggregate live prices from trusted retailers and marketplaces so buyers click straight through to the cheapest in-stock option." },
              { t: "Built for each niche", d: "Every subsidiary shares the same comparison core but speaks its vertical — sets & rarities for cards, sensor formats for cameras, body types & fuel for cars." },
              { t: "Multi-market", d: "Localised pricing and currency across Australia, the US, the UK and New Zealand, with more markets to come." },
            ].map((c) => (
              <div key={c.t}>
                <div className="h-1 w-10 rounded bg-gradient-to-r from-brand-400 to-gold" />
                <h3 className="mt-4 font-bold">{c.t}</h3>
                <p className="mt-2 text-sm text-white/60">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-sm text-white/40">
        <div className="flex items-center justify-center gap-2">
          <Logo size={22} />
          <span className="font-semibold text-white/60">CompareEmpire</span>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} CompareEmpire. A family of price-comparison sites.</p>
        <p className="mt-4">
          <a
            href="https://buymeacoffee.com/riftcompare"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FFDD00] px-4 py-1.5 text-sm font-semibold text-[#0b0e14] transition hover:opacity-90"
          >
            ☕ Buy me a coffee
          </a>
        </p>
      </footer>
    </main>
  );
}
