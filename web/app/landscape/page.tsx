import type { Metadata } from "next";
import { LandscapeExplorer } from "@/components/landscape-explorer";
import { OrganisationWall } from "@/components/organisation-wall";
import { loadPublicOrganisationRegistry } from "@/db/canonical-organisations";
import { organisationCatalogue } from "@/lib/organisation-catalogue";
import { landscapeSoftwareItems } from "@/lib/landscape-data";

export const dynamic = "force-dynamic";

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
  const { canonicalDirectory, catalogueRecords } = await loadPublicOrganisationRegistry();
  if (params.object === "organisations") {
    return <OrganisationWall
      initialCountry={params.country}
      initialQuery={params.q}
      initialRole={params.role}
      initialScope={params.scope}
      initialSegment={params.segment}
      records={catalogueRecords}
      softwareCount={landscapeSoftwareItems.length}
    />;
  }
  return (
    <LandscapeExplorer
      canonicalOrganisations={canonicalDirectory.map((record) => ({
        aliases: record.aliases,
        organisation: {
          name: record.organisation.name,
          slug: record.organisation.slug,
        },
      }))}
      initialAfricaUse={params.africaUse}
      initialFunction={params.function}
      initialKind={params.kind}
      initialQuery={params.q}
      initialRelationship={params.relationship}
      initialReviewStatus={params.status}
      initialSector={params.sector}
      initialStage={params.stage}
      initialView="wall"
      mode="wall"
      organisationCount={organisationCatalogue.counts.total}
    />
  );
}
