"use client";

import { UserMenu } from "./UserMenu";
import { useMe } from "@/lib/use-me";

// Client shell around UserMenu: fetches the session via /api/me after mount so
// the Navbar (and therefore every page) can be server-rendered without reading
// the session cookie — the read that used to force the whole site dynamic.
// Renders a fixed-size placeholder until the session resolves so a signed-in
// user never sees the signed-out icon flash.
export function NavUser() {
  const { user, loaded } = useMe();
  if (!loaded) return <div aria-hidden className="h-9 w-9" />;
  return <UserMenu user={user} />;
}
