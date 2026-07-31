import type { Metadata } from "next";
import { RegistryExplorer } from "@/components/registry-explorer";

export const metadata: Metadata = {
  alternates: { canonical: "/directory" },
  title: "Directory",
  description: "Filter, sort and export Africa energy-software records.",
};

export default async function Directory({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <RegistryExplorer
      initialCategory={params.category}
      initialCountry={params.country}
      initialEvidence={params.evidence}
      initialQuery={params.q}
      initialOrigin={params.origin}
      initialLifecycle={params.lifecycle}
      initialAccess={params.access}
      key={JSON.stringify(params)}
      view="directory"
    />
  );
}
