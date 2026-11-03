// Finds newly announced Pokémon sets (lib/set-discovery.ts) and writes data/sets/discovered.json. Run by the sealed import before
// it reads the stores, so a new set's pre-orders are filed under it the same morning. TCGCSV (TCGplayer's catalogue as daily JSON,
// public, no key): one request for the group list, then one product list per candidate group, 300 ms apart. Never fails the import:
// on any error it keeps the file as it is and says why in the job summary.
import fs from "node:fs";
import path from "node:path";
import { candidates, mergeDiscovered, type DiscoveredSet, type TcgGroup } from "../src/lib/set-discovery";
import { HAND_SETS } from "../src/lib/sets";

const FILE = path.join(process.cwd(), "data/sets/discovered.json");
const API = "https://tcgcsv.com/tcgplayer/3"; // 3 = Pokémon (English)
const HEADERS = { "User-Agent": "DexCompare/1.0 (+https://dexcompare.app)", Accept: "application/json" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function results<T>(url: string): Promise<T[] | null> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30_000) });
  if (res.status !== 200) return null;
  const body = (await res.json()) as { results?: T[] };
  return Array.isArray(body.results) ? body.results : null;
}

function summary(lines: string[]): void {
  const text = ["### New sets (TCGplayer)", "", ...lines, ""].join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + "\n");
  console.log(text);
}

async function main(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const previous: DiscoveredSet[] = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : [];

  const groups = await results<TcgGroup>(`${API}/groups`);
  if (!groups || groups.length < 50) {
    summary(["TCGplayer's set list could not be read; data/sets/discovered.json kept as it was."]);
    return;
  }

  const { take, skipped } = candidates(groups, HAND_SETS, today);
  const products = new Map<number, string[]>();
  for (const c of take) {
    await sleep(300);
    try {
      const rows = await results<{ name?: string }>(`${API}/${c.group.groupId}/products`);
      if (rows) products.set(c.group.groupId, rows.map((r) => r.name ?? ""));
    } catch {
      // Read again tomorrow; the previous entry (if any) stays.
    }
  }

  // Undated hand-written rows don't exist; the newest one's series is the current era's.
  const newest = [...HAND_SETS].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))[0];
  const next = mergeDiscovered(previous, take, products, newest?.series ?? "Special", HAND_SETS, today);
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + "\n");

  const added = next.filter((d) => !previous.some((p) => p.tcgGroupId === d.tcgGroupId));
  const noSealed = take.filter((c) => products.has(c.group.groupId) && !next.some((d) => d.tcgGroupId === c.group.groupId));
  summary([
    `${next.length} discovered set(s) beside the ${HAND_SETS.length} in lib/sets.ts.`,
    ...next.map((d) => `- ${added.includes(d) ? "**new** " : ""}${d.code} ${d.name}: ${d.releaseDate}, ${d.series}${d.noBoosterBox ? ", no booster box listed" : ""} (/sets/${d.slug})`),
    ...noSealed.map((c) => `- not yet: ${c.group.name} (TCGplayer lists no Elite Trainer Box or booster product in it)`),
    ...skipped.map((s) => `- skipped ${s.name}: ${s.why}`),
  ]);
}

main().catch((err) => {
  summary([`Set discovery failed (${err instanceof Error ? err.message : String(err)}); data/sets/discovered.json kept as it was.`]);
});
