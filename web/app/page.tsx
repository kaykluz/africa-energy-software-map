import type { Metadata } from "next";
import { LandscapeExplorer } from "@/components/landscape-explorer";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "The software powering African energy",
  description:
    "Search 540 classified software and enabling-infrastructure listings connected to African energy.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <LandscapeExplorer
      initialQuery={params.q}
      initialView="listings"
      mode="explore"
    />
  );
}
