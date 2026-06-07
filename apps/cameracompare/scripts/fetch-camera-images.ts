// Fetches a product photo for each camera from Wikipedia (open data, hotlinkable
// upload.wikimedia.org URLs) and writes prisma/camera-images.json, which the
// seeder uses to populate each camera's imageUrl. Runs in CI (network open); the
// dev container can't reach Wikipedia.
//
//   npx tsx scripts/fetch-camera-images.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { CAMERAS } from "../prisma/cameras";

const UA = "CameraCompare/1.0 (price-comparison demo)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<any> {
  const url = "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({ format: "json", ...params }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function imageFor(name: string): Promise<string | null> {
  try {
    // 1. find the most relevant page
    const search = await api({ action: "query", list: "search", srsearch: `${name} camera`, srlimit: "1" });
    const title: string | undefined = search?.query?.search?.[0]?.title;
    if (!title) return null;
    // 2. get that page's lead image (800px thumb)
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
  for (const c of CAMERAS) {
    const key = `${c.brand}-${c.model}`.toLowerCase();
    const url = await imageFor(c.name);
    if (url) {
      out[key] = url;
      found++;
    }
    console.log(`${found}/${CAMERAS.length} ${c.name} -> ${url ? "ok" : "—"}`);
    await sleep(300); // be polite to the Wikipedia API
  }
  writeFileSync(join(process.cwd(), "prisma", "camera-images.json"), JSON.stringify(out, null, 2));
  console.log(`Wrote prisma/camera-images.json (${found}/${CAMERAS.length} images).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
