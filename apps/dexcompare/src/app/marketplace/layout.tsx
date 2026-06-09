import { MarketplaceCartProvider } from "@/components/MarketplaceCart";

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <MarketplaceCartProvider>{children}</MarketplaceCartProvider>;
}
