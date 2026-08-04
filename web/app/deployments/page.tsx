import type { Metadata } from "next";
import { RegistryExplorer } from "@/components/registry-explorer";
import {
  buildOrganisationCatalogueMapData,
  filterOrganisationCatalogueRecords,
  queryOrganisationCatalogue,
} from "@/lib/organisation-catalogue";
import { africanCountries } from "@/lib/registry-data";
import {
  organisationRoleName,
  organisationRoles,
  organisationSegmentName,
  organisationSegments,
} from "@/lib/organisation-data";
import { loadPublicOrganisationRegistry } from "@/db/canonical-organisations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/deployments" },
  title: "Map",
  description:
    "Map every recorded software and organisation country relationship while keeping deployments, catalogue locations, headquarters and other presence types distinct.",
};

export default async function Deployments({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { canonicalDirectory, catalogueRecords } = await loadPublicOrganisationRegistry();
  const catalogueMapOptions = queryOrganisationCatalogue(
    { pageSize: 1 },
    catalogueRecords,
  ).options;
  const catalogueRole = organisationRoles.some((role) => role.id === params.role)
    ? organisationRoleName(params.role ?? "")
    : params.role;
  const catalogueSegment = organisationSegments.some((segment) => segment.id === params.segment)
    ? organisationSegmentName(params.segment ?? "")
    : params.segment;
  const filteredCatalogueRecords = filterOrganisationCatalogueRecords({
    query: params.q,
    role: catalogueRole,
    segment: catalogueSegment,
    headquarters: params.headquarters,
    scope: params.scope,
  }, catalogueRecords);
  return (
    <RegistryExplorer
      catalogueMapData={buildOrganisationCatalogueMapData(africanCountries, filteredCatalogueRecords)}
      catalogueMapOptions={catalogueMapOptions}
      canonicalOrganisationDirectory={canonicalDirectory}
      initialCategory={params.category}
      initialCountry={params.country}
      initialStage={params.stage}
      initialEvidence={params.evidence}
      initialQuery={params.q}
      initialOrigin={params.origin}
      initialLifecycle={params.lifecycle}
      initialAccess={params.access}
      initialObject={params.object}
      initialPresence={params.presence}
      initialSoftwareLocation={params.softwareLocation}
      initialFocus={params.focus ?? params.country}
      initialRepresentation={params.representation}
      initialGroup={params.group}
      initialRole={params.role}
      initialSector={params.sector}
      initialSegment={params.segment}
      initialOrganisationOrigin={params.orgOrigin}
      initialHeadquarters={params.headquarters}
      initialScope={params.scope}
      key={JSON.stringify(params)}
      view="deployments"
    />
  );
}
