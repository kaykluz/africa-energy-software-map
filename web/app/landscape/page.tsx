import type { Metadata } from "next";
import { LandscapeExplorer } from "@/components/landscape-explorer";
import { loadPublicOrganisationRegistry } from "@/db/canonical-organisations";
import { organisationCatalogue } from "@/lib/organisation-catalogue";

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
  const { canonicalDirectory } = await loadPublicOrganisationRegistry();
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
