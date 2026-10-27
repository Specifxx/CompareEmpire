"use client";

import { WishlistSync } from "@/components/WishlistSync";
import { CollectionSync } from "@/components/CollectionSync";
import { useMe } from "@/lib/use-me";

// Mounted once in the root layout. Resolves the current session CLIENT-SIDE
// (via /api/me — a server-side cookies() read here used to force every route
// dynamic, killing ISR) and hands the loggedIn flag to the sync components,
// which merge the account's saved data with the anonymous local data on
// sign-in and then keep it synced. Renders nothing visible. The sync
// components mount only after the session resolves so they never see a
// false→true loggedIn transition on a signed-in load.
export function AccountSync() {
  const { user, loaded } = useMe();
  if (!loaded) return null;
  const loggedIn = !!user;
  return (
    <>
      <WishlistSync loggedIn={loggedIn} />
      <CollectionSync loggedIn={loggedIn} />
    </>
  );
}
