import type { Metadata } from "next";
import { CountryProfile } from "@/components/record-pages";

export const metadata: Metadata = {
  title: "Country record",
  description: "Country-level energy-software evidence and research coverage.",
};

export default async function CountryPage({
  params,
}: {
  params: Promise<{ iso2: string }>;
}) {
  const { iso2 } = await params;
  return <CountryProfile iso2={iso2} />;
}
