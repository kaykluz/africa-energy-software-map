import type { Metadata } from "next";
import { LandscapeExplorer } from "@/components/landscape-explorer";
import { organisationCatalogue } from "@/lib/organisation-catalogue";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Database",
  description:
    "Search and filter software and digital tools connected to African energy.",
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
      initialReviewStatus={params.status}
      initialSector={params.sector}
      initialStage={params.stage}
      initialView="listings"
      mode="explore"
      organisationCount={organisationCatalogue.counts.total}
    />
  );
}
