import type { Metadata } from "next";
import { LandscapeExplorer } from "@/components/landscape-explorer";

export const metadata: Metadata = {
  alternates: { canonical: "/landscape" },
  title: "Software wall",
  description: "Browse software and enabling infrastructure across the African energy value chain.",
};

export default async function Landscape({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <LandscapeExplorer initialQuery={params.q} initialView="wall" mode="wall" />;
}
