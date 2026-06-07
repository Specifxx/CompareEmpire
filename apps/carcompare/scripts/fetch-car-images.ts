// Fetches a photo for each vehicle from Wikipedia (open data, hotlinkable
// upload.wikimedia.org URLs) and writes prisma/car-images.json, which the seeder
// uses to populate each car's imageUrl. Runs in CI (network open); the dev
// container can't reach Wikipedia.
//
//   npx tsx scripts/fetch-car-images.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { VEHICLES } from "../prisma/vehicles";

const UA = "CarCompare/1.0 (price-comparison demo)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<any> {
  const url = "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({ format: "json", ...params }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function imageFor(name: string): Promise<string | null> {
  try {
    const search = await api({ action: "query", list: "search", srsearch: `${name} car`, srlimit: "1" });
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
  for (const v of VEHICLES) {
    const key = `${v.make}-${v.model}`.toLowerCase();
    const url = await imageFor(v.name);
    if (url) {
      out[key] = url;
      found++;
    }
    console.log(`${found}/${VEHICLES.length} ${v.name} -> ${url ? "ok" : "—"}`);
    await sleep(300);
  }
  writeFileSync(join(process.cwd(), "prisma", "car-images.json"), JSON.stringify(out, null, 2));
  console.log(`Wrote prisma/car-images.json (${found}/${VEHICLES.length} images).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
