import type { Metadata } from "next";
import { SearchResultsPage } from "@/components/content-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  return <SearchResultsPage query={q} />;
}
