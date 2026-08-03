import type { Metadata } from "next";
import { RegistryExplorer } from "@/components/registry-explorer";
import { buildOrganisationCatalogueMapData } from "@/lib/organisation-catalogue";
import { africanCountries } from "@/lib/registry-data";
import { loadPublicOrganisationRegistry } from "@/db/canonical-organisations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/deployments" },
  title: "Deployments",
  description:
    "Explore evidenced deployment geography separately from claims, headquarters and origin.",
};

export default async function Deployments({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { canonicalDirectory, catalogueRecords } = await loadPublicOrganisationRegistry();
  return (
    <RegistryExplorer
      catalogueMapData={buildOrganisationCatalogueMapData(africanCountries, catalogueRecords)}
      canonicalOrganisationDirectory={canonicalDirectory}
      initialCategory={params.category}
      initialCountry={params.country}
      initialEvidence={params.evidence}
      initialQuery={params.q}
      initialOrigin={params.origin}
      initialLifecycle={params.lifecycle}
      initialAccess={params.access}
      initialObject={params.object}
      initialPresence={params.presence}
      key={JSON.stringify(params)}
      view="deployments"
    />
  );
}
