import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Minigames — free Yu-Gi-Oh! card games",
  description:
    "Free Yu-Gi-Oh! minigames powered by real card data: Price Duel (higher or lower) and the Pack Rip simulator. No signup, play instantly.",
  alternates: { canonical: "/games" },
};

// The arcade hub. Every game runs on the site's real card + price data, so
// playing doubles as discovering cards — each result links to live prices.
const GAMES = [
  {
    emoji: "⚖️",
    title: "Price Duel",
    badge: "Streak game",
    desc: "Higher or lower? Two real cards, one revealed market value — guess which is worth more and ride the streak. Brutally addictive, and you'll learn the market without trying.",
    href: "/games/duel",
    cta: "Start a duel",
    tone: "#ffcb05",
  },
  {
    emoji: "🎴",
    title: "Pack Rip Simulator",
    badge: "Just for fun",
    desc: "Rip a simulated 10-card pack from any modern set — flip each card, watch the value add up, and see if your pack beat the price of a real one. All values are live market guides.",
    href: "/games/rip",
    cta: "Rip a pack",
    tone: "#3fa129",
  },
  {
    emoji: "📂",
    title: "Card Catcher",
    badge: "Arcade",
    desc: "Cards rain from the sky — slide your binder to catch them and bank their real market value. Dodge fakes, chain combos, grab gold ×2 and slow-mo. How much can you hold?",
    href: "/games/catcher",
    cta: "Start catching",
    tone: "#2980ef",
  },
  {
    emoji: "🧱",
    title: "Bulk Breaker",
    badge: "Arcade",
    desc: "Breakout, but every brick is a real card — smash them to bank their value. Holo chase cards take two hits; multi-ball, wide paddle and slow-mo keep the rally alive.",
    href: "/games/breaker",
    cta: "Start breaking",
    tone: "#ef4179",
  },
];

export default function GamesPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 text-center">
        <h1 className="font-display text-3xl font-extrabold text-white">🕹️ YGOCompare Arcade</h1>
        <p className="mx-auto mt-2 max-w-2xl text-slate-400">
          Free minigames built on the same live card database as the price comparison — every answer links
          straight to real prices. No signup, no paywall.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {GAMES.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="card-surface group relative flex flex-col overflow-hidden p-5 transition-all hover:-translate-y-1 hover:shadow-glow"
          >
            <div
              className="absolute inset-0 opacity-15 transition-opacity group-hover:opacity-30"
              style={{ background: `linear-gradient(135deg, ${g.tone}66, transparent 65%)` }}
            />
            <div className="relative flex flex-1 flex-col">
              <div className="text-4xl transition-transform duration-300 group-hover:scale-125">{g.emoji}</div>
              <div className="mt-3 flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">{g.title}</h2>
                <span className="chip bg-ink-950/70 text-[10px] font-semibold text-slate-300">{g.badge}</span>
              </div>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-400">{g.desc}</p>
              <span className="mt-4 text-sm font-bold" style={{ color: g.tone }}>
                {g.cta} →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* The bridge: gamers → the actual product. Every value they just played
          with is a real price — point that curiosity at the comparison tools. */}
      <section className="card-surface mt-8 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600/15 via-ink-850 to-gold/10 p-5 text-center">
          <h2 className="text-lg font-extrabold text-white">Every number in these games is a real, live price 👀</h2>
          <p className="mx-auto mt-1 max-w-xl text-sm text-slate-400">
            We track {`50+`} stores across AU, NZ, the US and the UK daily — the same engine behind the games
            can tell you what <em>your</em> cards are worth, and where anything is cheapest right now.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/card-value" className="btn-primary">Check what my cards are worth</Link>
            <Link href="/deals" className="btn-accent">Today&apos;s best deals</Link>
            <Link href="/browse" className="btn-ghost">Browse the database</Link>
          </div>
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-slate-600">
        Game values use TCGplayer market guides and refresh daily. Found a bug or want another game?{" "}
        <Link href="/contact" className="text-brand-400 hover:underline">Tell us</Link>.
      </p>
    </div>
  );
}
