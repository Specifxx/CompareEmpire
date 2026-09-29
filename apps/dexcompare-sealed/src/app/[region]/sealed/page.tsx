import type { Metadata } from "next";
import { regionOrNotFound } from "@/lib/regions";
import { BrowsePage, browseMeta } from "./Browse";

export const revalidate = 86400;

export function generateMetadata({ params }: { params: { region: string } }): Metadata {
  return browseMeta(regionOrNotFound(params.region), 1);
}

export default function SealedPage({ params }: { params: { region: string } }) {
  return <BrowsePage r={regionOrNotFound(params.region)} page={1} />;
}
