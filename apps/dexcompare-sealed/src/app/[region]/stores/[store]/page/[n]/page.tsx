import type { Metadata } from "next";
import { regionOrNotFound } from "@/lib/regions";
import { pageNumber, StorePage, storeInRegion, storeMeta } from "../../StoreListing";

export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export function generateMetadata({ params }: { params: { region: string; store: string; n: string } }): Metadata {
  const r = regionOrNotFound(params.region);
  return storeMeta(r, storeInRegion(params.store, r), pageNumber(params.n));
}

export default function StorePageN({ params }: { params: { region: string; store: string; n: string } }) {
  const r = regionOrNotFound(params.region);
  return <StorePage r={r} s={storeInRegion(params.store, r)} page={pageNumber(params.n)} />;
}
