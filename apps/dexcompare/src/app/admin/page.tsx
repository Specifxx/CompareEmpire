import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { AdminLogin } from "@/components/AdminLogin";
import { SellerDashboard } from "@/components/SellerDashboard";

// Unlinked ("secret") admin / verified-seller portal. Not referenced anywhere in
// the nav — reachable only by knowing the URL — and gated behind a real login.
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-sm py-10">
        <h1 className="mb-1 text-2xl font-extrabold text-white">Seller portal</h1>
        <p className="mb-6 text-sm text-slate-400">Sign in to manage your marketplace listings.</p>
        <AdminLogin />
      </div>
    );
  }
  return <SellerDashboard user={user} />;
}
