// Confirms DexCompare's own eBay Browse API keyset works, using the same code the site
// runs (src/lib/ebay-listings.ts). Needs EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in the
// environment; tsx does not read .env, so export them or:
//
//   EBAY_CLIENT_ID=… EBAY_CLIENT_SECRET=… npx tsx scripts/ebay-check.ts [region …]
//
// It prints the token status, the number of listings per context for each region, and the
// first five normalised listings of the home feed per region: exactly what the strips
// would show. It never prints the id, the secret, a token or an Authorization header.
// Exit code 1 when the token cannot be fetched or nothing came back anywhere, so CI can use it.
//
// Cost: one token, then 6 searches for the home feed and 3 for each other context, per
// marketplace (au+nz share one, us+sg share one): about 45 of the 5,000 daily calls for all seven regions.
import { parseContext } from "../src/lib/ebay-context-parse";
import { createEbayClient, EbayError, ebayListingsEnabled, MARKETPLACE, realDeps } from "../src/lib/ebay-listings";
import { createTokenManager } from "../src/lib/ebay-listings";
import { REGION_LIST, isRegion, type Region } from "../src/lib/regions";
import { SETS } from "../src/lib/sets";

async function main() {
  const deps = realDeps();
  if (!ebayListingsEnabled(deps.env)) {
    console.error("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are not both set (or EBAY_LISTINGS=off). Nothing to check.");
    process.exit(1);
  }
  const wanted = process.argv.slice(2).filter(isRegion) as Region[];
  const regions = wanted.length ? wanted : REGION_LIST.map((r) => r.region);

  try {
    await createTokenManager(deps).get();
    console.log("token: OK (client-credentials grant, scope api_scope)");
  } catch (e) {
    console.error(`token: FAILED (${e instanceof EbayError ? e.code : "error"}). Check the keyset is a PRODUCTION one (not Sandbox) and belongs to DexCompare's own application.`);
    process.exit(1);
  }

  const client = createEbayClient(deps);
  const contexts = ["home", `set:${SETS.find((s) => s.releaseDate <= new Date().toISOString().slice(0, 10))!.slug}`, "sealed"];
  let total = 0;
  for (const region of regions) {
    const m = MARKETPLACE[region];
    console.log(`\n${region.toUpperCase()}  (${m.id}, ${m.currency})`);
    for (const c of contexts) {
      const out = await client.listings(region, parseContext(c)!);
      total += out.items.length;
      console.log(`  ${c.padEnd(28)} ${String(out.items.length).padStart(2)} listings${out.reason ? `   (${out.reason})` : ""}`);
      if (c === "home") {
        for (const it of out.items.slice(0, 5)) console.log(`    ${it.price.currency} ${it.price.value.padStart(8)}  ${it.title.slice(0, 60).padEnd(60)}  ${it.condition ?? ""}`);
      }
    }
  }
  console.log(`\nsearch calls made: ${client.callsToday()}`);
  if (!total) {
    console.error("No listings came back for any region. The token works, so look at the reasons above (budget, rate-limited, unavailable, empty).");
    process.exit(1);
  }
}

main().catch(() => {
  console.error("ebay-check failed unexpectedly (no detail is printed, to keep the credentials out of logs).");
  process.exit(1);
});
