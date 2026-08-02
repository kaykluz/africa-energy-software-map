import type { Metadata } from "next";
import { LandscapeExplorer } from "@/components/landscape-explorer";

export const metadata: Metadata = {
  alternates: { canonical: "/landscape" },
  title: "Full list",
  description: "Browse every organisation, product, tool and research lead submitted to the Africa Energy Software Map.",
};

export default async function Landscape({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <LandscapeExplorer initialQuery={params.q} />;
}

