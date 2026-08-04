import type { Metadata } from "next";
import { OrganisationAtlas } from "@/components/organisation-atlas";
import {
  catalogueRoleFilterValue,
  catalogueSegmentFilterValue,
  queryOrganisationCatalogue,
} from "@/lib/organisation-catalogue";
import { africanCountries } from "@/lib/registry-data";
import { loadPublicOrganisationRegistry } from "@/db/canonical-organisations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/organisations" },
  title: "Organisations",
  description: "Browse the African energy ecosystem by actor role, market, headquarters, country coverage and review status.",
};

export default async function OrganisationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const catalogueCountry = africanCountries.find(([iso2]) => iso2 === params.country)?.[1] ?? "all";
  const catalogueRole = catalogueRoleFilterValue(params.role);
  const catalogueSegment = catalogueSegmentFilterValue(params.segment);
  const { canonicalDirectory, catalogueRecords } = await loadPublicOrganisationRegistry();
  const initialCatalogue = queryOrganisationCatalogue(
    {
      country: catalogueCountry,
      headquarters: params.headquarters,
      query: params.q,
      role: catalogueRole,
      scope: params.scope,
      segment: catalogueSegment,
    },
    catalogueRecords,
  );
  return (
    <OrganisationAtlas
      canonicalDirectory={canonicalDirectory}
      initialCatalogue={initialCatalogue}
      initialCatalogueCountry={catalogueCountry}
      initialCatalogueHeadquarters={params.headquarters}
      initialCatalogueRole={catalogueRole}
      initialCatalogueScope={params.scope}
      initialCatalogueSegment={catalogueSegment}
      initialGroup={params.group}
      initialCountry={params.country}
      initialOrigin={params.origin}
      initialPresence={params.presence}
      initialQuery={params.q}
      initialRole={params.role}
      initialSector={params.sector}
      initialSegment={params.segment}
      initialView={params.view}
    />
  );
}
