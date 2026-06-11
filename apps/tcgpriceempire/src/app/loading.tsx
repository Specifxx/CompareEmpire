export default function Loading() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        Loading…
      </div>
    </div>
  );
}
