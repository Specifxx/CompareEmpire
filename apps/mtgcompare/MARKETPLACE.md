# DexCompare Marketplace — design & rollout

Status: **Phase 1 (foundations) shipped, public-facing "Coming Soon".**

## What's live now
- **Verified sellers** (`User.verifiedSeller`). Only they can create listings.
- **Secret seller/admin portal** at **`/admin`** (unlinked, `noindex`, gated by login).
  The `compareempire` account is admin + verified seller.
- **Listing system** (`Listing`): condition, foil, price, qty, market (AU/NZ/US/GB),
  per-listing or per-seller shipping.
- **Price-comparison integration**: every ACTIVE listing is mirrored into
  `RetailerPrice` as the seller's own store (`mkt_<sellerId>`, shown as
  "CompareEmpire Marketplace") in the listing's region, so our marketplace prices
  compete in the card pages alongside the scraped stores — for all regions.
- **`/marketplace`** public page: "Coming Soon" + verified-seller pitch.

## Shipping system (verified sellers)
- Seller default: `User.shipFlatCents` + `User.shipFreeOverCents` (ship free at/above
  a threshold).
- Per-listing override: `Listing.shipCents`.
- The card page already shows **delivered cost** (item + shipping) when shipping is
  known, and ranks by it — marketplace listings provide a real shipping number, so
  buyers see the true delivered price.
- Future: zone/weight-based rates per region.

## Buying system (foundation only — not yet live)
Models already exist: `Listing` (ask), `BuyOrder` (bid), `Order` (completed trade).
Planned flow once payments are wired:
1. Buyer clicks **Buy** on a listing → Stripe Checkout (delivered total incl. shipping).
2. On payment success (webhook) → create `Order`, decrement `Listing.quantity`,
   notify seller, hold funds.
3. Seller ships → marks fulfilled → payout released to the seller (minus platform fee).
4. Buyer protection window before payout (dispute handling).

## Payments — recommendation
**Use Stripe Connect (Express).** It's the standard for marketplaces and the least
work to do safely:
- Each seller onboards via a Stripe **Express** account (Stripe handles KYC, bank
  details, tax forms, payouts) — one onboarding link, no PII stored by us.
- Checkout uses a PaymentIntent with `application_fee_amount` (our cut) and
  `transfer_data.destination = sellerAccount` → Stripe splits the money and pays the
  seller out automatically.
- Multi-currency (AUD/NZD/USD/GBP) is built in — matches our regional pricing.
- Webhooks (`checkout.session.completed`, `charge.refunded`, …) drive order state.

Alternative: **PayPal Commerce Platform** (marketplace/multiparty) — viable, but
Connect is simpler to integrate and reconcile.

### To enable payments (needs your action)
1. Create a Stripe account; enable **Connect**.
2. Add env vars on the dexcompare Vercel project: `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID`.
3. Then I can build: seller onboarding link, Checkout, the webhook handler, and the
   `Order` lifecycle. (Left unbuilt now precisely because it needs your live keys and
   a few policy decisions — fees %, payout timing, refund window.)

## Open decisions for you
- Platform fee % (e.g. 5–10%).
- Payout timing / buyer-protection window.
- Which regions to open buying in first (AU first?).
- Returns/refunds policy.
