/**
 * READ-ONLY: probes every AU store that returned 0 products in the last import,
 * from GitHub Actions' network (the same network the real importer runs on — the
 * dev sandbox's outbound proxy gives unreliable/ambiguous results for this).
 * Writes nothing, touches no database.
 */
const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const STORES: { key: string; base: string }[] = [
  { key: "steelcity", base: "https://www.steelcitygames.com.au" },
  { key: "vaultgames", base: "https://vaultgames.com.au" },
  { key: "spindown", base: "https://spindown.com.au" },
  { key: "chimera", base: "https://chimeragaming.com.au" },
  { key: "bantertoys", base: "https://bantertoys.com.au" },
  { key: "kingofcards", base: "https://kingofcards.com.au" },
  { key: "skyfoxes", base: "https://skyfoxescards.com.au" },
  { key: "tabletopgaminghub", base: "https://tabletopgaminghub.com.au" },
  { key: "kanzengames", base: "https://kanzengames.com" },
  { key: "jrwhobby", base: "https://jrwhobbystation.myshopify.com" },
  { key: "kingdomofgeek", base: "https://kingdomofgeek.com.au" },
  { key: "hobbymaster", base: "https://www.hobbymaster.com.au" },
  { key: "epictcg", base: "https://epictcg.com.au" },
  { key: "timelesscollectables", base: "https://timelesscollectables.com.au" },
  { key: "goodgrieftcg", base: "https://goodgrieftcg.com.au" },
  { key: "nextlevelgames", base: "https://nextlevelgames.com.au" },
  { key: "gameforce", base: "https://gameforce.com.au" },
  { key: "collectorscache", base: "https://collectorscache.com" },
  { key: "chuscards", base: "https://chuscards.com" },
  { key: "hillscards", base: "https://www.hillscards.co.uk" },
  { key: "pristinepokemon", base: "https://pristinepokemon.co.uk" },
  { key: "eternalcardboard", base: "https://eternalcardboard.com" },
];

async function fetchStatus(url: string): Promise<{ status: number | "TIMEOUT" | "ERROR"; bytes: number; error?: string }> {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
    const text = await r.text();
    return { status: r.status, bytes: text.length };
  } catch (e: any) {
    return { status: e?.name === "TimeoutError" ? "TIMEOUT" : "ERROR", bytes: 0, error: String(e?.message ?? e) };
  }
}

const NON_SINGLE = /sealed|booster|box|bundle|preorder|pre-order|accessor|playmat|sleeve|merch|deck-?box|gift|case|tin|blister|collection-box/i;

async function discoverPokemonCollections(base: string): Promise<string[]> {
  const idx = await fetchStatus(`${base}/sitemap.xml`);
  if (idx.status !== 200) return [];
  const r = await fetch(`${base}/sitemap.xml`, { headers: UA, signal: AbortSignal.timeout(15000) });
  const index = await r.text();
  let sitemaps = Array.from(index.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map((m) => m[1])
    .filter((u) => /sitemap_collections/i.test(u));
  if (!sitemaps.length) sitemaps = [`${base}/sitemap_collections_1.xml`];
  const handles = new Set<string>();
  for (const sm of sitemaps.slice(0, 8)) {
    try {
      const rr = await fetch(sm, { headers: UA, signal: AbortSignal.timeout(15000) });
      if (!rr.ok) continue;
      const xml = await rr.text();
      for (const m of xml.matchAll(/\/collections\/([^<\/?#"]+)/g)) {
        const h = m[1];
        if (/pok[eé]mon|pkmn/i.test(h) && !NON_SINGLE.test(h) && !/\.(jpe?g|png|gif|webp|svg)$/i.test(h)) handles.add(h);
      }
    } catch {
      /* skip */
    }
  }
  return Array.from(handles);
}

async function main() {
  console.log(`Probing ${STORES.length} stores that returned 0 products in the last import...\n`);
  const results: { key: string; base: string; sitemapStatus: number | string; handles: string[] }[] = [];
  for (const s of STORES) {
    const sitemap = await fetchStatus(`${s.base}/sitemap.xml`);
    const handles = sitemap.status === 200 ? await discoverPokemonCollections(s.base) : [];
    results.push({ key: s.key, base: s.base, sitemapStatus: sitemap.status, handles });
    console.log(
      `${s.key.padEnd(22)} ${s.base.padEnd(42)} sitemap=${String(sitemap.status).padEnd(8)} pokemon-collections=${
        handles.length ? handles.join(",") : "(none found)"
      }`
    );
  }

  console.log("\n── Classification ──────────────────────────────────────────");
  const reachableNoCollections = results.filter((r) => r.sitemapStatus === 200 && r.handles.length === 0);
  const reachableWithCollections = results.filter((r) => r.sitemapStatus === 200 && r.handles.length > 0);
  const unreachable = results.filter((r) => r.sitemapStatus !== 200);
  console.log(`REACHABLE, Pokémon collection FOUND (should be fixable — likely non-collection issue): ${reachableWithCollections.length}`);
  reachableWithCollections.forEach((r) => console.log(`  ${r.key}: ${r.handles.join(", ")}`));
  console.log(`REACHABLE, NO Pokémon collection (genuinely doesn't stock Pokémon, or renamed): ${reachableNoCollections.length}`);
  reachableNoCollections.forEach((r) => console.log(`  ${r.key}`));
  console.log(`UNREACHABLE (dead domain / blocking bots / DNS failure): ${unreachable.length}`);
  unreachable.forEach((r) => console.log(`  ${r.key}: sitemap status ${r.sitemapStatus}`));
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
