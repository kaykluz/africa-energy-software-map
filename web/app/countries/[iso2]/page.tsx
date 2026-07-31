import type { Metadata } from "next";
import { CountryProfile } from "@/components/record-pages";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ iso2: string }>;
}): Promise<Metadata> {
  const { iso2 } = await params;
  return {
    alternates: { canonical: `/countries/${iso2.toLowerCase()}` },
    title: "Country record",
    description: "Country-level energy-software evidence and research coverage.",
  };
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ iso2: string }>;
}) {
  const { iso2 } = await params;
  return <CountryProfile iso2={iso2} />;
}
