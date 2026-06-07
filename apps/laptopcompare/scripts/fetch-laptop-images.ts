// Fetches a photo for each laptop from Wikipedia and writes prisma/laptop-images.json.
// Runs in CI (network open).  npx tsx scripts/fetch-laptop-images.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { LAPTOPS } from "../prisma/laptops";

const UA = "LaptopCompare/1.0 (price-comparison demo)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<any> {
  const url = "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({ format: "json", ...params }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function imageFor(name: string): Promise<string | null> {
  try {
    const search = await api({ action: "query", list: "search", srsearch: `${name} laptop`, srlimit: "1" });
    const title: string | undefined = search?.query?.search?.[0]?.title;
    if (!title) return null;
    const img = await api({ action: "query", titles: title, prop: "pageimages", piprop: "thumbnail", pithumbsize: "800" });
    const pages = img?.query?.pages ?? {};
    for (const k of Object.keys(pages)) {
      const src = pages[k]?.thumbnail?.source;
      if (src) return src as string;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function main() {
  const out: Record<string, string> = {};
  let found = 0;
  for (const l of LAPTOPS) {
    const key = `${l.brand}-${l.model}`.toLowerCase();
    const url = await imageFor(l.name);
    if (url) {
      out[key] = url;
      found++;
    }
    console.log(`${found}/${LAPTOPS.length} ${l.name} -> ${url ? "ok" : "—"}`);
    await sleep(300);
  }
  writeFileSync(join(process.cwd(), "prisma", "laptop-images.json"), JSON.stringify(out, null, 2));
  console.log(`Wrote prisma/laptop-images.json (${found}/${LAPTOPS.length} images).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
