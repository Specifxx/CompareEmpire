import Link from "next/link";

export default function GuideNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <div
        className="pointer-events-none select-none text-[7rem] font-extrabold leading-none text-ink-700"
        aria-hidden
      >
        404
      </div>

      <div className="-mt-4 flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold text-white">Guide not found</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          That guide doesn&apos;t exist here. Browse all our buying guides below, or head to the
          blog for price commentary and buying angles.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/guides" className="btn-primary">
          All buying guides
        </Link>
        <Link href="/blog" className="btn-ghost">
          Blog
        </Link>
        <Link href="/" className="btn-ghost">
          Go home
        </Link>
      </div>
    </div>
  );
}
