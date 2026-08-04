import type { Metadata } from "next";
import { CountryDirectory } from "@/components/country-directory";
import { loadPublicOrganisationRegistry } from "@/db/canonical-organisations";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ iso2: string }>;
}): Promise<Metadata> {
  const { iso2 } = await params;
  return {
    alternates: { canonical: `/countries/${iso2.toLowerCase()}` },
    title: "Country record",
    description: "Country-scoped software, organisation and deployment directory.",
  };
}

export default async function CountryPage({
  params,
  searchParams,
}: {
  params: Promise<{ iso2: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { iso2 } = await params;
  const filters = await searchParams;
  const { canonicalDirectory, catalogueRecords } = await loadPublicOrganisationRegistry();
  return <CountryDirectory catalogueRecords={catalogueRecords} directory={canonicalDirectory} filters={filters} iso2={iso2} />;
}
