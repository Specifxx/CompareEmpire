import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

export default async function Unsubscribe({ searchParams }: { searchParams: { token?: string; done?: string } }) {
  if (searchParams.done != null) {
    return (
      <div className="page max-w-xl py-16 text-center">
        <h1 className="font-display text-3xl font-extrabold">You&rsquo;re unsubscribed</h1>
        <p className="mt-3 text-muted">All your restock alerts have been deleted. You won&rsquo;t hear from us again.</p>
        <Link href="/" className="btn-ghost mt-6">
          Back to DexCompare
        </Link>
      </div>
    );
  }
  const token = searchParams.token ?? "";
  const alerts = token
    ? await prisma.restockAlert.findMany({ where: { token }, take: 100, select: { email: true, product: { select: { name: true } } } })
    : [];
  if (!alerts.length) {
    return (
      <div className="page max-w-xl py-16 text-center">
        <h1 className="font-display text-3xl font-extrabold">Nothing to unsubscribe</h1>
        <p className="mt-3 text-muted">This link has no active alerts — they may already have been removed.</p>
      </div>
    );
  }
  const masked = alerts[0].email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${"•".repeat(Math.min(b.length, 6))}${c}`);
  return (
    <div className="page max-w-xl py-16">
      <h1 className="font-display text-3xl font-extrabold">Unsubscribe {masked}?</h1>
      <p className="mt-3 text-muted">This deletes all {alerts.length} of your restock alerts:</p>
      <ul className="mt-3 list-disc pl-5 text-sm text-muted">
        {alerts.slice(0, 20).map((a, i) => (
          <li key={i}>{a.product.name}</li>
        ))}
      </ul>
      <form action="/api/alerts/unsubscribe" method="post" className="mt-6">
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="btn-primary px-6 py-3">
          Unsubscribe from all alerts
        </button>
      </form>
    </div>
  );
}
