import type { Metadata } from "next";
import { OrganisationProfile } from "@/components/record-pages";
import { canonicalOrganisationDirectoryBySlug } from "@/db/canonical-organisations";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const record = await canonicalOrganisationDirectoryBySlug(slug);
  const organisation = record?.organisation;
  return {
    alternates: { canonical: `/organisations/${slug}` },
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
  const directoryRecord = await canonicalOrganisationDirectoryBySlug(slug);
  return <OrganisationProfile directoryRecord={directoryRecord} slug={slug} />;
}
