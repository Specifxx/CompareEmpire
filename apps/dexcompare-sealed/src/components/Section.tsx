import Link from "next/link";

export function Section({
  title,
  kicker,
  href,
  linkLabel = "See all",
  children,
}: {
  title: string;
  kicker?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {kicker && <div className="eyebrow mb-1">{kicker}</div>}
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="shrink-0 text-sm font-semibold text-brand hover:underline">
            {linkLabel} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card px-6 py-10 text-center text-muted">{children}</div>;
}
