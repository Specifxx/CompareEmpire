import { Header } from "@/components/Header";
import { regionOrNotFound } from "@/lib/regions";

// Empty on purpose: region pages render on their first visit and are then
// cached (ISR), never at build. A build must not depend on the database being
// reachable — when Rift Compare's database ran out of transfer, every deploy
// failed until it was replaced.
export function generateStaticParams() {
  return [];
}

// The 404 here is not enough on its own: a page's generateMetadata and body run
// alongside the layout, so every page under [region] resolves its region the
// same way before touching anything else (/terms, /foo and /AU used to 500).
export default function RegionLayout({ children, params }: { children: React.ReactNode; params: { region: string } }) {
  const r = regionOrNotFound(params.region);
  return (
    <>
      <Header region={r.region} />
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
