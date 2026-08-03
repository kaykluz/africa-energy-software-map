import type { Metadata } from "next";
import { OrganisationAtlas } from "@/components/organisation-atlas";
import { queryOrganisationCatalogue } from "@/lib/organisation-catalogue";
import { africanCountries } from "@/lib/registry-data";

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
  const initialCatalogue = queryOrganisationCatalogue({ query: params.q, country: catalogueCountry });
  return (
    <OrganisationAtlas
      initialCatalogue={initialCatalogue}
      initialCatalogueCountry={catalogueCountry}
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
