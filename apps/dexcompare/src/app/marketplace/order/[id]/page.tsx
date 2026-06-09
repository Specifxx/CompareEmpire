import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MarketplaceBar } from "@/components/MarketplaceBar";
import { fmtMoney } from "@/components/MarketplaceCart";

export const dynamic = "force-dynamic";

interface OrderItem { cardName: string; collectorNumber: string; condition: string; qty: number; priceCents: number; currency: string; sellerName: string }

export default async function OrderConfirmation({ params }: { params: { id: string } }) {
  const order = await prisma.marketplaceOrder.findUnique({ where: { id: params.id } });
  if (!order) notFound();
  const items = order.items as unknown as OrderItem[];

  return (
    <div className="py-2">
      <MarketplaceBar />
      <div className="card-surface mx-auto max-w-xl p-6 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-3xl">✓</div>
        <h1 className="text-2xl font-extrabold text-white">Test purchase complete</h1>
        <p className="mt-1 text-sm text-slate-400">
          Order <span className="font-mono text-slate-300">{order.id.slice(0, 8)}</span> — this was a test; no payment was charged and nothing ships.
        </p>
        <div className="mt-5 text-left">
          {items.map((i, n) => (
            <div key={n} className="flex justify-between border-b border-ink-800 py-2 text-sm">
              <span className="text-slate-300">{i.qty}× {i.cardName} <span className="text-slate-500">{i.collectorNumber} · {i.condition}</span></span>
              <span className="text-slate-300">{fmtMoney(i.priceCents * i.qty, i.currency)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-sm text-slate-400"><span>Shipping</span><span>{fmtMoney(order.shippingCents, order.currency)}</span></div>
          <div className="flex justify-between py-2 text-base font-extrabold text-white"><span>Total paid (test)</span><span>{fmtMoney(order.totalCents, order.currency)}</span></div>
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/marketplace/browse" className="btn-primary">Keep browsing</Link>
          <Link href="/browse" className="btn-ghost">Back to database</Link>
        </div>
      </div>
    </div>
  );
}
