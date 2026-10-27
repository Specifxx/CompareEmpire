import { getCurrentUser } from "@/lib/auth";
import { WishlistSync } from "@/components/WishlistSync";
import { CollectionSync } from "@/components/CollectionSync";

// Server component mounted once in the root layout. Resolves the current session
// and hands the loggedIn flag to the client sync components, which merge the
// account's saved data with the anonymous local data on sign-in and then keep it
// synced. Renders nothing visible.
export async function AccountSync() {
  const user = await getCurrentUser();
  const loggedIn = !!user;
  return (
    <>
      <WishlistSync loggedIn={loggedIn} />
      <CollectionSync loggedIn={loggedIn} />
    </>
  );
}
