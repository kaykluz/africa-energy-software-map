import type { Metadata } from "next";
import { SearchResultsPage } from "@/components/content-pages";

export const metadata: Metadata = { title: "Search" };

export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  return <SearchResultsPage query={q} />;
}
