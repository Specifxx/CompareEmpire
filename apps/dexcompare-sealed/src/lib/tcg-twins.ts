// TCGplayer's set twins on disk (2026-11-26): the last good tcgSetTwins map (tcgplayer.ts), written by the importer after each
// TCGplayer read to data/public/tcg-twins.json and committed with the snapshot. A run that does not read TCGplayer (a failed
// read, an `--only` store run) folds with this file, so a store's rows never move back to the set-named page for a day and
// then forward again; the exporter reads it to send an emptied set-named page to its twin (focus.ts mergedInto).
//
// What it holds is public: TCGplayer's own product titles and set codes. Each entry keeps TCGplayer's title, so the identity is
// re-read by today's rules, never trusted from an old file.
import fs from "node:fs";
import path from "node:path";
import { publicDataDir } from "./public-data/format";
import { identify, isIdentity } from "./sealed-title";
import type { TcgSetTwin } from "./tcgplayer";

export const TCG_TWINS_FILE = "tcg-twins.json";

export interface TcgTwinsFile {
  /** The day TCGplayer's catalogue was read (UTC days since 1970). */
  day: number;
  /** Set-less groupKey → the set TCGplayer files it under and TCGplayer's title. */
  twins: Record<string, { set: string; title: string }>;
}

/** Write the map (the importer, after its TCGplayer read). Never throws, and never writes an empty map over a good one. */
export function writeTcgTwins(twins: ReadonlyMap<string, TcgSetTwin & { title: string }>, dir = publicDataDir()): void {
  try {
    if (!twins.size) return;
    const file: TcgTwinsFile = { day: Math.floor(Date.now() / 86_400_000), twins: {} };
    for (const [k, t] of [...twins].sort(([a], [b]) => (a < b ? -1 : 1))) file.twins[k] = { set: t.set, title: t.title };
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, TCG_TWINS_FILE), `${JSON.stringify(file, null, 1)}\n`);
    console.log(`  tcg-twins: ${twins.size} set-less TCGplayer products with their set written`);
  } catch (e) {
    console.warn(`  tcg-twins: not written (${(e as Error).message})`);
  }
}

/** The last map written, each entry re-identified by today's rules (an entry whose title no longer lands on its key is left out). */
export function readTcgTwins(dir = publicDataDir()): Map<string, TcgSetTwin> {
  const out = new Map<string, TcgSetTwin>();
  try {
    const j = JSON.parse(fs.readFileSync(path.join(dir, TCG_TWINS_FILE), "utf8")) as TcgTwinsFile;
    for (const [key, t] of Object.entries(j?.twins ?? {})) {
      const id = identify(t.title, { strict: false });
      if (isIdentity(id) && id.groupKey === key && typeof t.set === "string") out.set(key, { set: t.set, identity: id });
    }
  } catch {
    /* no file yet */
  }
  return out;
}
