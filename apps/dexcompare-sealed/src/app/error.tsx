"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page flex-1 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Something went wrong.</h1>
      <p className="mt-3 text-muted">It&rsquo;s probably temporary. Try again in a moment.</p>
      <button onClick={reset} className="btn-primary mt-6">
        Try again
      </button>
    </main>
  );
}
