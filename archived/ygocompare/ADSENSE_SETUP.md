# Ads (Google AdSense) — status & how to earn more

**Status: wired, pending site approval.** The publisher id `ca-pub-6842128782879909`
(the same AdSense ACCOUNT as RiftCompare — one account covers multiple sites) is
baked into the code (`src/lib/ads.ts`), so the AdSense loader and `/ads.txt` are
active in production. The remaining steps are on Google's side (adding
dexcompare.app as a site + approval) and in the AdSense dashboard (turn on Auto
ads). This doc is the checklist.

> Why AdSense: free, no minimum traffic to apply, pays per impression/click, and
> it pairs cleanly with the affiliate links already on the site (eBay / Amazon /
> TCGplayer / Sovrn). For a content + comparison site like this, AdSense is the
> right first ad network. You can layer on others later (Ezoic/Mediavine) once
> traffic grows.

## What's already done (live in production)

- **Publisher id baked in** (`ca-pub-6842128782879909`) — no env config needed.
- **Loader script** site-wide (`WebAdsLoader` in the root layout).
- **`/ads.txt`** served automatically (required to get paid).
- **`AdSlot` component** renders real responsive ad units where a slot id is set,
  and renders **nothing** (clean — no placeholder boxes) where one isn't, so Auto
  ads fill those spots instead. Visitors never see an empty ad box.
- **In-article units** (top + bottom) on every collecting guide.
- **Privacy Policy** page at `/privacy` (AdSense **requires** one) + footer link.
- **Contact page** at `/contact` (reviewers look for one).

## What you still need to do (Google's side — can't be automated)

1. **Add the site in AdSense.** Go to <https://adsense.google.com> → **Sites →
   Add site** → `dexcompare.app` → click **Verify** (the loader script + ads.txt
   are already live, so verification is instant).
2. **Turn on Auto ads** — AdSense → **Ads → By site → dexcompare.app → Auto ads
   ON**. This is what actually starts earning across the whole site using the
   loader that's already installed. No slot ids required.
3. *(Optional, for more control/revenue)* Create Display ad units and set their
   ~10-digit slot ids as env vars (see `.env.example`:
   `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE` / `_BROWSE` / `_CARD`). The hand-placed
   units then light up in the highest-value spots.

### Wait for approval

- Google reviews the site (usually a few days, sometimes up to ~2 weeks). **No
  ads show until it's approved** — that's a Google gate, not a code issue.
- Requirements the site already meets: real content (collecting guides), clear
  navigation, a Privacy Policy, contact info, and ads.txt. Keep adding content
  while you wait — more original pages = faster approval and more revenue.

### Get paid

- In AdSense → **Payments**, the existing account's details apply (one account,
  one payment setup, all sites).

## Notes & gotchas

- **`ads.txt` is mandatory** to be paid — it's automatic here, just verify it loads.
- Don't click your own ads, ever (instant ban).
- Ad revenue scales with traffic — focus on SEO and content; the plumbing is done.
- Toggle all ads off instantly by setting `NEXT_PUBLIC_ADSENSE_CLIENT=""`.
