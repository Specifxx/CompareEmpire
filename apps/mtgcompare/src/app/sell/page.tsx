import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";
import { SellForm, type SellCard } from "@/components/SellForm";

export const dynamic = "force-dynamic";

// List a Magic: The Gathering card for sale on the CompareEmpire Marketplace. Selling is
// limited to verified sellers (test-mode play-money marketplace).
export default async function SellPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/sell");

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { verifiedSeller: true },
  });

  if (!account?.verifiedSeller) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card-surface p-6 text-center">
          <h1 className="text-xl font-extrabold text-white">Become a seller</h1>
          <p className="mt-2 text-sm text-slate-400">
            Listing cards on the {SITE_NAME} Marketplace is currently limited to
            verified sellers. Reach out to get your storefront approved.
          </p>
          <Link href="/profile" className="btn-primary mt-4 inline-flex">
            Back to your profile
          </Link>
        </div>
      </div>
    );
  }

  // Cards the seller can list, with the reference price the form uses to suggest
  // a sensible listing price per condition.
  const rows = await prisma.card.findMany({
    orderBy: { marketPriceCents: "desc" },
    take: 2000,
    select: {
      id: true,
      name: true,
      domain: true,
      type: true,
      rarity: true,
      energyCost: true,
      might: true,
      collectorNumber: true,
      artSeed: true,
      orientation: true,
      imageUrl: true,
      imageThumbUrl: true,
      blurDataUrl: true,
      marketPriceCents: true,
    },
  });
  const cards: SellCard[] = rows;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-white">List a card for sale</h1>
        <p className="mt-1 text-sm text-slate-400">
          Add a Magic: The Gathering card to the {SITE_NAME} Marketplace. Buyers pay from their
          wallet — this is a test-mode marketplace with play money.
        </p>
      </div>
      <SellForm cards={cards} />
    </div>
  );
}
