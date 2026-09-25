import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { isRegion } from "@/lib/regions";

// Empty on purpose: region pages render on their first visit and are then
// cached (ISR), never at build. A build must not depend on the database being
// reachable — when Rift Compare's database ran out of transfer, every deploy
// failed until it was replaced.
export function generateStaticParams() {
  return [];
}

export default function RegionLayout({ children, params }: { children: React.ReactNode; params: { region: string } }) {
  if (!isRegion(params.region)) notFound();
  return (
    <>
      <Header region={params.region} />
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
