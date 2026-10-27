/**
 * Daily catalogue + price import for all five games — the GitHub Actions entry
 * point. Games run sequentially (the sources rate-limit; parallel games would
 * trip TCGplayer's 429s) and one game's failure never aborts the others: the
 * run only exits non-zero when EVERY game failed.
 *
 * Usage: npx tsx scripts/import-catalog.ts            (all games)
 *        GAME=magic npx tsx scripts/import-catalog.ts (one game)
 */
import { GAME_KEYS, isGameKey, type GameKey } from "../src/lib/games";
import { importScryfall } from "../src/lib/import-scryfall";
import { importYgoprodeck } from "../src/lib/import-ygoprodeck";
import { importTcgplayerGame } from "../src/lib/import-tcgplayer";
import { snapshotPriceHistory } from "../src/lib/import-shared";
import { prisma } from "../src/lib/db";

// magic/yugioh singles come from their dedicated sources; TCGplayer only
// contributes their sealed catalogue (importTcgplayerGame knows this and
// fetches "Sealed Products" only for those two).
async function importGame(game: GameKey): Promise<{ cards: number; prices: number }> {
  if (game === "magic") {
    const singles = await importScryfall();
    const sealed = await importTcgplayerGame("magic");
    return { cards: singles.cards + sealed.cards, prices: singles.prices + sealed.prices };
  }
  if (game === "yugioh") {
    const singles = await importYgoprodeck();
    const sealed = await importTcgplayerGame("yugioh");
    return { cards: singles.cards + sealed.cards, prices: singles.prices + sealed.prices };
  }
  return importTcgplayerGame(game);
}

type GameResult = {
  game: GameKey;
  ok: boolean;
  cards: number;
  prices: number;
  history: number;
  ms: number;
  error?: string;
};

async function main() {
  const only = process.env.GAME?.trim().toLowerCase();
  if (only && !isGameKey(only)) {
    console.error(`GAME="${only}" is not one of: ${GAME_KEYS.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  const games: GameKey[] = only && isGameKey(only) ? [only] : GAME_KEYS;

  const results: GameResult[] = [];
  for (const game of games) {
    const t0 = Date.now();
    try {
      const { cards, prices } = await importGame(game);
      const history = await snapshotPriceHistory(game);
      const ms = Date.now() - t0;
      results.push({ game, ok: true, cards, prices, history, ms });
      console.log(`${game}: OK — ${cards} cards, ${prices} prices, ${history} history rows (${ms} ms)`);
    } catch (e) {
      const ms = Date.now() - t0;
      const error = e instanceof Error ? e.message : String(e);
      results.push({ game, ok: false, cards: 0, prices: 0, history: 0, ms, error });
      console.error(`${game}: FAILED after ${ms} ms —`, e);
    }
  }

  console.log("\n── import-catalog summary ───────────────────────────────────");
  console.log("  game        status     cards     prices   history        ms");
  for (const r of results) {
    console.log(
      `  ${r.game.padEnd(10)} ${(r.ok ? "OK" : "FAIL").padEnd(6)}${String(r.cards).padStart(9)}${String(
        r.prices
      ).padStart(11)}${String(r.history).padStart(10)}${String(r.ms).padStart(10)}${r.error ? `  ${r.error}` : ""}`
    );
  }
  console.log("─────────────────────────────────────────────────────────────");

  // Partial success ships (some prices beat stale prices); total failure fails
  // the workflow loudly.
  if (results.length > 0 && results.every((r) => !r.ok)) {
    console.error("Every game failed — marking the run as failed.");
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error("import-catalog crashed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
