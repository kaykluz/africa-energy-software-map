import type { Metadata } from "next";
import { OrganisationAtlas } from "@/components/organisation-atlas";

export const metadata: Metadata = {
  alternates: { canonical: "/organisations" },
  title: "Organisations",
  description: "Browse organisations connected to reviewed African energy-software records.",
};

export default async function OrganisationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <OrganisationAtlas
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
