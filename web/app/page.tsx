import type { Metadata } from "next";
import { RegistryExplorer } from "@/components/registry-explorer";

export const metadata: Metadata = {
  title: "The software powering African energy",
  description:
    "Browse candidate energy-software records by value-chain stage, category and evidence.",
};

export default async function Home({
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
      key={JSON.stringify(params)}
      view="stack"
    />
  );
}
