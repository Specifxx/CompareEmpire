// Server-only: resolve the visitor's selected games from the cookie set by the
// game picker. Importing next/headers makes this module server-only, which is
// why it's split from the pure games.ts.
import { cookies } from "next/headers";
import { GAMES_COOKIE, normalizeGames, type GameKey } from "./games";

export function getSelectedGames(): GameKey[] {
  return normalizeGames(cookies().get(GAMES_COOKIE)?.value);
}

// Whether the visitor has made an explicit choice yet (drives the onboarding
// picker — shown only until they answer).
export function hasGamesCookie(): boolean {
  return cookies().get(GAMES_COOKIE) != null;
}
