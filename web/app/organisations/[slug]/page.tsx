import type { Metadata } from "next";
import { OrganisationProfile } from "@/components/record-pages";
import { organisationBySlug } from "@/lib/registry-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const organisation = organisationBySlug(slug);
  return {
    title: organisation?.name ?? "Organisation record",
    description:
      organisation?.description ?? "Africa energy-software organisation record.",
  };
}

export default async function OrganisationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <OrganisationProfile slug={slug} />;
}
