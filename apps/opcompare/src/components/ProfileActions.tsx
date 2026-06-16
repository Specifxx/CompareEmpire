"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className="btn-ghost"
    >
      Sign out
    </button>
  );
}

export function ResendVerifyButton() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <button
      disabled={loading || sent}
      onClick={async () => {
        setLoading(true);
        await fetch("/api/auth/resend-verify", { method: "POST" }).catch(() => {});
        setSent(true);
        setLoading(false);
      }}
      className="text-xs font-semibold text-gold underline hover:text-white disabled:no-underline disabled:opacity-70"
    >
      {sent ? "Sent — check your inbox" : loading ? "Sending…" : "Resend confirmation email"}
    </button>
  );
}
