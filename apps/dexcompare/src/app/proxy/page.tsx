import { ProxyBuilder } from "@/components/ProxyBuilder";
import { SITE_NAME } from "@/lib/site";

export const metadata = {
  title: `Proxy Printer — pick cards to print | ${SITE_NAME}`,
  robots: { index: false },
};

export default function ProxyPage({ searchParams }: { searchParams: { list?: string } }) {
  return <ProxyBuilder initialList={searchParams.list} />;
}
