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
      initialAfricaUse={params.africaUse}
      initialFunction={params.function}
      initialKind={params.kind}
      initialQuery={params.q}
      initialRelationship={params.relationship}
      initialSector={params.sector}
      initialStage={params.stage}
      initialView="listings"
      mode="explore"
    />
  );
}
