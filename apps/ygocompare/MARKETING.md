# DexCompare — growth & exit playbook

Goal: users → revenue history → sellable asset. A comparison/affiliate site
sells for roughly **30–40× monthly profit** on marketplaces like Flippa,
Acquire.com, Motion Invest or Empire Flippers — so every $100/mo of proven,
recurring profit ≈ $3–4k of exit value. Everything below serves that math.

## The honest position

- **Product**: genuinely strong — 4-market price comparison, sealed DB, deals
  engine, restock alerts, fresh content, all automated daily. Smoke + accuracy
  CI green.
- **Gap**: distribution. Nobody knows it exists. SEO compounds but takes
  months; community channels work in days. Do both.
- **The wave to ride**: the Mega Evolution era + 30th Celebration (Sept 16) is
  the biggest Pokémon TCG demand year since 2021. The site is now positioned
  for exactly that demand (Hot-right-now band, Drops hub, trackers, articles).

## 30-day sprint (do these, in order)

### Week 1 — plant the flags (≈1h/day)
1. **Reddit accounts + lurk first.** r/pkmntcg, r/PokemonTCG, r/PokeInvesting,
   r/pkmntcgtrades + your country subs. Read the daily question threads.
2. **Answer questions with genuine value.** Every day someone asks "where can
   I get Chaos Rising at MSRP?" / "is $X a fair price for Y?". Answer
   substantively, link the tracker/compare page ONLY where it truly answers
   the question. Never blast links; build the account's karma + history.
3. **Submit new pages in Search Console**: /deals, /sealed, /restock, the 3
   new articles. Request indexing individually — these target live demand.
4. **Discord**: join 3–5 Pokémon collector/restock servers (search "pokemon
   restock discord"). Same rule: be useful first.

### Week 2 — the alert flywheel
5. **Post the Chaos Rising tracker** as a standalone resource where rules
   allow (many subs allow self-promo in dedicated threads / with mod
   permission — ASK MODS FIRST, it converts a ban risk into an endorsement).
   Framing that works: "I built a free tracker that watches 80+ specialist
   stores for Chaos Rising restocks and emails you — no signup wall, no fee."
6. **Facebook groups** (huge for AU/NZ collectors): Pokémon TCG Australia
   buy/sell groups etc. Share deal finds ("X is 40% under market at Y right
   now — found via my comparison site") — deals are inherently shareable.
7. **Capture every email**: the restock + price alerts ARE the mailing list.

### Week 3 — content velocity + creators
8. **One article per week minimum** (the engine is file-based — or ask Claude
   to draft from fresh research). Next up: "Ascended Heroes chase price
   guide", "Pitch Black EV: rip or buy singles?", "30th Celebration updates".
9. **Micro-creators**: DM 5–10 small Pokémon YouTubers/TikTokers (1k–20k
   subs, AU/NZ especially — they're underserved). Offer: free shoutout swap,
   or a custom "deals found by DexCompare" segment. Small creators reply.
10. **Store partnerships**: email the 5 stores you send the most clicks
    (see /api click data) — "we're sending you buyers; want a direct
    affiliate deal / will you mention us?" Direct deals beat Sovrn rates AND
    create relationships.

### Week 4 — measure, double down
11. Check Vercel Analytics + GSC: which pages/channels brought users? Do 2×
    more of the top channel, drop the bottom one.
12. **Weekly deals email** to the alert list (one email, 5 best deals — the
    list exists, Resend is wired).

## Recurring cadence (after the sprint)
- Daily 15 min: answer 2–3 Reddit/Discord questions where a link genuinely helps.
- Weekly: 1 article + 1 deals email + update lib/hot.ts if demand shifted.
- Monthly: refresh creator outreach; check store-partnership replies.
- Event-driven: Pitch Black (Jul 17) and 30th Celebration (Sept 16) — have
  the tracker + article live BEFORE preorders open; post the resource the day
  hype peaks. These two dates are the year's traffic jackpots.

## "I need people to help me"
- **Community mod/VA** (the realistic first hire): recruit a collector from
  your own Discord/Reddit interactions, pay revenue share or small monthly
  fee to handle daily Reddit/Discord presence. They already speak the
  language and care.
- **Short-form editor** on Fiverr/Upwork ($5–15/video) if you go the TikTok
  route: "today's top 3 Pokémon deals" is a repeatable 30-second format fed
  directly by /deals.
- **Claude (these sessions)**: feature builds, weekly article drafts from
  fresh research, hot.ts refreshes, data work — ask anytime.

## Sell-readiness checklist (start now, sale in 6–12 months)
- [x] Automated ops (daily imports, accuracy CI, smoke tests, alerts)
- [x] Documentation (SETUP, workflows, this playbook)
- [x] Diversified revenue rails (AdSense + eBay EPN + TCGplayer/Impact +
      Amazon + Sovrn-ready) — buyers pay more for multi-rail revenue
- [ ] 6+ months of Vercel Analytics + GSC history (started — never break it)
- [ ] 6+ months of revenue history (EPN/Impact/AdSense dashboards — screenshot
      monthly into a folder; buyers want the trail)
- [ ] Email list size (alerts) — a 1,000+ list adds real value
- [ ] Transferability: keep everything in env vars/secrets (done), document
      the affiliate accounts that must transfer
- When ready: list on Flippa/Acquire (any size) or Motion Invest ($500+/mo
  profit) / Empire Flippers ($1k+/mo). Multiple: ~30–40× monthly net.

## What NOT to do
- Don't buy traffic (ads) for an affiliate site this young — payback math fails.
- Don't spam links from fresh accounts — one subreddit ban costs more than 50
  honest answers earn.
- Don't chase every feature — distribution beats features from here on. The
  product is already ahead of its traffic.
