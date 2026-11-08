import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CreatorCard, PackIcon } from "@/components/creators/CreatorCard";
import { featuredCreators } from "@/lib/creators";
import { jsonLd, pageMeta } from "@/lib/seo";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

// /creators: the Pokémon creators hub, RiftCompare's /creators brought over (owner, 2026-11-03: "a really nice formatted creators
// page, just like how RiftCompare does it", on every site). Two audiences: collectors finding creators to follow and tip, and
// creators deciding whether a listing is worth a mention in their content. The list is static (src/content/creators.ts), so the
// page is prerendered like /about: no data read, no request read, nothing to cache.

export const metadata: Metadata = pageMeta({
  title: "Pokémon TCG Creators: Follow & Buy Them a Pack",
  description:
    "The Pokémon TCG content creators we feature: box openings, set reviews, pull rates and more. Follow them, and buy your favourite a pack. Creators: get featured free.",
  path: "/creators",
});

const FAQS = [
  {
    q: "What does “Buy them a pack” do?",
    a: `It opens the creator's own tip page (Ko-fi, Buy Me a Coffee, Patreon or similar). The money goes straight to them. ${SITE_NAME} never handles it and takes no cut.`,
  },
  {
    q: "Does it cost anything to be featured?",
    a: `No. A listing is free. We ask featured creators to mention ${SITE_NAME} in their content, for example a link in a video description or a price check on screen, and we send our visitors their way in return.`,
  },
  {
    q: "Who can apply?",
    a: "Anyone who makes Pokémon TCG content regularly: YouTube, TikTok, Twitch, Instagram, X, podcasts or a blog. Audience size matters less than making good Pokémon content. A real person reviews every application.",
  },
  {
    q: "Will I see how many clicks my listing sends?",
    a: "Yes. We count clicks on every featured creator's links and tip button, and share the numbers with them on request.",
  },
];

// "How to work with us" (owner, 2026-11-01): flexible on purpose, any one of these is plenty. Creators call us their "partner" in
// their own content, not "sponsor": we don't pay them for a mention.
const WORK_WITH_US = [
  { title: "Link us", body: "Put dexcompare.app in your bio, video description or a story link. That's the one thing that helps most." },
  { title: "Shout us out", body: `In the content you already make, a quick line: “check out our partner ${SITE_NAME}” while you open a box, price a pull or plan a pre-order.` },
  { title: "Show how it works", body: "A short walkthrough or honest review: look up a booster box or ETB, compare the stores, find who has it in stock cheapest. Say what you really think." },
];

const PERKS = [
  { icon: "📣", title: "A spotlight card, free", body: "Your avatar, what you make and every channel you're on, here and in the creators bubble on our homepage." },
  { icon: "🎴", title: "A “Buy them a pack” button", body: "Straight to your own Ko-fi, Patreon or tip page. Fans support you directly; we never touch the money." },
  { icon: "📈", title: "Pokémon collectors, not random traffic", body: "Collectors visit every day to price booster boxes, ETBs and pre-orders: the people who watch Pokémon content." },
  { icon: "🤝", title: "Shout-outs and real numbers", body: "We share your new videos on our socials, and tell you how many clicks your listing sent you." },
];

const APPLY_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${SITE_NAME} creator feature`)}&body=${encodeURIComponent(
  "Hi! I make Pokémon TCG content and I'd like to be featured.\n\nName / channel:\nWhat I make:\nLinks (YouTube, TikTok, Instagram, Twitch, X…):\nTip page (Ko-fi, Patreon…), if any:\nWhere I'm based:\n",
)}`;

export default function CreatorsPage() {
  const creators = featuredCreators();
  const openSpots = creators.length === 0 ? 3 : (3 - (creators.length % 3)) % 3 || 3;
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Pokémon TCG Creators — ${SITE_NAME}`,
    url: `${SITE_URL}/creators`,
    ...(creators.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            itemListElement: creators.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: { "@type": "Person", name: c.name, url: `${SITE_URL}/creators#${c.slug}`, sameAs: c.links.map((l) => l.url) },
            })),
          },
        }
      : {}),
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div className="page max-w-5xl py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(collection) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} />
      <Breadcrumbs items={[{ href: "/", label: SITE_NAME }, { label: "Creators" }]} />

      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-brand/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 right-10 h-56 w-56 rounded-full bg-spark/20 blur-3xl" />
        <div className="relative z-10 max-w-xl">
          <span className="eyebrow inline-flex items-center gap-1 text-brand-strong">✦ Creators</span>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Pokémon creators we <span className="text-brand">love</span>
          </h1>
          <p className="mt-3 text-base leading-7 text-muted">
            The people who make collecting Pokémon fun to follow: box openings, set reviews, pull rates and pre-order news. Watch them,
            follow them, and buy your favourite a pack.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="#featured" className="btn-primary min-h-11 px-5">
              Meet the creators
            </a>
            <a href="#apply" className="btn-ghost min-h-11 px-5">
              I make Pokémon content →
            </a>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute right-8 top-6 hidden h-56 w-72 md:block">
          {["left-0 top-8 -rotate-[10deg] from-brand/40 to-spark/40", "left-[88px] top-0 z-10 rotate-[2deg] from-pre/40 to-brand/30", "left-[176px] top-10 rotate-[11deg] from-spark/50 to-open/30"].map((cls) => (
            <div key={cls} className={`absolute h-48 w-36 rounded-xl border border-line bg-gradient-to-br shadow-card ${cls}`}>
              <div className="m-3 h-20 rounded-lg bg-surface/70" />
              <div className="mx-3 mt-3 h-2 w-20 rounded bg-surface/70" />
              <div className="mx-3 mt-2 h-2 w-12 rounded bg-surface/70" />
            </div>
          ))}
        </div>
      </header>

      {/* Featured creators */}
      <section id="featured" className="mt-10 scroll-mt-24">
        <h2 className="font-display text-2xl font-bold">Featured creators</h2>
        <p className="mt-1 text-sm text-muted">
          {creators.length ? "Newest first. Tap a channel to follow, or buy them a pack to say thanks." : "Our first creators are joining now. Want to be one of them?"}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((c, i) => (
            <CreatorCard key={c.slug} creator={c} index={i} />
          ))}
          {/* Open spots fill the last row (a full row of three while the list is empty), so the grid reads as "join us" rather than a
              finished list. Never an invented creator. */}
          {Array.from({ length: openSpots }).map((_, i) => (
            <a key={`open-${i}`} href="#apply" className="group flex min-h-72 flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-surface/50 p-6 text-center transition hover:border-brand hover:bg-brand-soft/40">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/20 to-spark/30 text-3xl transition-transform group-hover:scale-110" aria-hidden>
                ✨
              </span>
              <span className="mt-4 font-display text-base font-bold">Your channel here</span>
              <span className="mt-1 max-w-[16rem] text-sm text-muted">Make Pokémon content? Get a free spotlight card and a “Buy them a pack” button.</span>
              <span className="mt-4 text-sm font-bold text-brand-strong">Apply to be featured →</span>
            </a>
          ))}
        </div>
      </section>

      {/* How tipping works */}
      <section className="card mt-10 grid items-center gap-6 border-spark/40 bg-gradient-to-br from-spark/15 via-surface to-surface p-6 sm:grid-cols-[auto,1fr] sm:p-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-spark to-brand text-brand-ink shadow-card">
          <PackIcon className="h-10 w-10" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Buy your favourite creator a pack</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Every featured creator with a tip page gets a “Buy them a pack” button. It goes straight to their own Ko-fi, Patreon or tip page,
            so <strong className="text-ink">100% of what you send goes to them</strong>. {SITE_NAME} never handles the money and takes no cut.
            It&rsquo;s the easiest way to say thanks for the box opening that made your day.
          </p>
        </div>
      </section>

      {/* For creators */}
      <section id="apply" className="mt-10 scroll-mt-24">
        <h2 className="font-display text-2xl font-bold">Make Pokémon content? Let&rsquo;s grow together</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Mention {SITE_NAME} in your content (a link in your description, a price check on screen, a shout-out in a video) and we feature you
          here, free. Here&rsquo;s what you get.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {PERKS.map((p) => (
            <div key={p.title} className="card flex gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised text-xl" aria-hidden>
                {p.icon}
              </span>
              <div>
                <h3 className="font-bold">{p.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="card mt-5 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-bold">Apply to be featured</h3>
            <p className="mt-1 text-sm text-muted">Email us your channel links and what you make. A real person replies, usually within a few days.</p>
          </div>
          <a href={APPLY_HREF} className="btn-primary min-h-11 shrink-0 px-5">
            Email us to get featured
          </a>
        </div>
      </section>

      {/* Weekly price-movers video (owner, 2026-11-08): made every Monday by compareempiretake2's weekly-movers.yml. */}
      <section id="weekly-video" className="mt-10 scroll-mt-24">
        <h2 className="font-display text-2xl font-bold">Free weekly price-movers video</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Every Monday we make a 20-second vertical video of the week&rsquo;s biggest Pokémon sealed price moves: three up, three
          cheaper, with real prices and original music. Post it on TikTok, Reels or Shorts as it is, or talk over it. It comes
          with a ready caption; all we ask is that {SITE_NAME} stays named in the video or your caption.
        </p>
        <a href="https://github.com/Specifxx/compareempiretake2/tree/reels/movers" target="_blank" rel="noopener" className="btn-primary mt-4 inline-flex min-h-11 items-center px-5">
          Get this week&rsquo;s video
        </a>
      </section>

      {/* How to work with us */}
      <section id="work-with-us" className="mt-10 scroll-mt-24">
        <h2 className="font-display text-2xl font-bold">How to work with us</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Creators often ask how we&rsquo;d like {SITE_NAME} promoted. Honestly, however suits you: no contract, no script, no quota and nothing to
          send us first. We help you, you help us, and we keep featuring you either way.
        </p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {WORK_WITH_US.map((w, i) => (
            <li key={w.title} className="card p-5">
              <span className="eyebrow text-brand-strong">Option {i + 1}</span>
              <h3 className="mt-1 font-bold">{w.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted">{w.body}</p>
            </li>
          ))}
        </ol>
        <div className="card mt-3 p-5">
          <h3 className="font-bold">Lines you can borrow</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-muted">
            <li>“Prices checked on our partner dexcompare.app. Link in my bio.”</li>
            <li>“Be sure to check out our partner {SITE_NAME}: it compares Pokémon sealed prices across stores, so you find who has it cheapest.”</li>
          </ul>
          <p className="mt-3 text-sm leading-6 text-muted">
            Please say we&rsquo;re partners (“our partner”, or your platform&rsquo;s partnership label) so your followers know. Ad rules such as the FTC&rsquo;s
            in the US and the ASA&rsquo;s in the UK ask for that even when no money changes hands.
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-3xl" aria-labelledby="creators-faq">
        <h2 id="creators-faq" className="font-display text-2xl font-bold">
          Creators FAQ
        </h2>
        <dl className="mt-4 space-y-5">
          {FAQS.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold">{f.q}</dt>
              <dd className="mt-1 text-sm leading-6 text-muted">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-10 text-sm text-muted">
        While you&rsquo;re here:{" "}
        <Link href="/au/sealed" prefetch={false} className="font-semibold text-ink underline decoration-line underline-offset-2 hover:decoration-ink">
          compare Pokémon sealed prices
        </Link>{" "}
        across every store.
      </p>
    </div>
  );
}
