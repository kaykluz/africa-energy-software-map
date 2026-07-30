import type { Metadata } from "next";
import { RegistryExplorer } from "@/components/registry-explorer";

export const metadata: Metadata = {
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
      view="deployments"
    />
  );
}
