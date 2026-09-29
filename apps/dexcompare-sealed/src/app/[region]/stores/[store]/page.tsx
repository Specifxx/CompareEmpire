import type { Metadata } from "next";
import { regionOrNotFound } from "@/lib/regions";
import { StorePage, storeInRegion, storeMeta } from "./StoreListing";

export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export function generateMetadata({ params }: { params: { region: string; store: string } }): Metadata {
  const r = regionOrNotFound(params.region);
  return storeMeta(r, storeInRegion(params.store, r), 1);
}

export default function StorePage1({ params }: { params: { region: string; store: string } }) {
  const r = regionOrNotFound(params.region);
  return <StorePage r={r} s={storeInRegion(params.store, r)} page={1} />;
}
