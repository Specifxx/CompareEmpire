import type { Metadata } from "next";
import { regionOrNotFound } from "@/lib/regions";
import { BrowsePage, browseMeta, pageNumber } from "../../Browse";

export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export function generateMetadata({ params }: { params: { region: string; n: string } }): Metadata {
  return browseMeta(regionOrNotFound(params.region), pageNumber(params.n));
}

export default function SealedPageN({ params }: { params: { region: string; n: string } }) {
  return <BrowsePage r={regionOrNotFound(params.region)} page={pageNumber(params.n)} />;
}
