"use client";

import { useState } from "react";

export function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "Sign in failed");
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card-surface flex flex-col gap-3 p-5">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Username</label>
      <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Password</label>
      <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button className="btn-primary mt-1" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
