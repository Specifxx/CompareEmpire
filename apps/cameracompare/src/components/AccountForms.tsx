"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// --- Forgot password: enter email, we send a reset link --------------------------
export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="card-surface p-6 text-sm text-slate-700">
        <h1 className="text-lg font-bold text-slate-900">Check your email</h1>
        <p className="mt-2 text-slate-600">
          If an account exists for <span className="text-slate-900">{email}</span>, we&apos;ve sent a link to reset your
          password. It expires in 1 hour.
        </p>
        <Link href="/login" className="btn-ghost mt-4 inline-flex">Back to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card-surface p-6">
      <h1 className="text-lg font-bold text-slate-900">Reset your password</h1>
      <p className="mt-1 text-sm text-slate-600">Enter your email and we&apos;ll send you a reset link.</p>
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
        <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      </label>
      <button type="submit" className="btn-primary mt-4 w-full" disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </button>
      <p className="mt-4 text-center text-sm text-slate-600">
        <Link href="/login" className="text-brand-400 hover:underline">Back to sign in</Link>
      </p>
    </form>
  );
}

// --- Reset password: set a new password from the emailed token -------------------
export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="card-surface p-6 text-sm text-slate-700">
        <h1 className="text-lg font-bold text-slate-900">Invalid link</h1>
        <p className="mt-2 text-slate-600">This reset link is missing or malformed. Request a new one.</p>
        <Link href="/forgot" className="btn-primary mt-4 inline-flex">Request a new link</Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't reset your password.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card-surface p-6">
      <h1 className="text-lg font-bold text-slate-900">Choose a new password</h1>
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-slate-600">New password</span>
        <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoFocus autoComplete="new-password" />
      </label>
      {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
      <button type="submit" className="btn-primary mt-4 w-full" disabled={loading}>
        {loading ? "Saving…" : "Set password & sign in"}
      </button>
    </form>
  );
}

// --- Verify email: confirm the token on load -------------------------------------
export function VerifyClient({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">(token ? "loading" : "error");

  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => setState(r.ok ? "ok" : "error"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <div className="card-surface p-6 text-center">
      {state === "loading" && <p className="py-6 text-sm text-slate-600">Confirming your email…</p>}
      {state === "ok" && (
        <>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-500/15 text-brand-400">✓</div>
          <h1 className="mt-3 text-lg font-bold text-slate-900">Email confirmed</h1>
          <p className="mt-1 text-sm text-slate-600">Your CameraCompare email is verified.</p>
          <Link href="/" className="btn-primary mt-4 inline-flex">Go to CameraCompare</Link>
        </>
      )}
      {state === "error" && (
        <>
          <h1 className="text-lg font-bold text-slate-900">Link expired</h1>
          <p className="mt-1 text-sm text-slate-600">This confirmation link is invalid or has expired. Sign in and resend it from your profile menu.</p>
          <Link href="/login" className="btn-primary mt-4 inline-flex">Sign in</Link>
        </>
      )}
    </div>
  );
}
