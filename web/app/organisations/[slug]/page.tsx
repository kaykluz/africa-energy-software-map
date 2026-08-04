import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrganisationProfile } from "@/components/record-pages";
import { loadPublicOrganisationRegistry } from "@/db/canonical-organisations";
import { catalogueCanonicalIdentity } from "@/lib/organisation-catalogue";
import { publicOrganisationDescription } from "@/lib/organisation-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { canonicalDirectory } = await loadPublicOrganisationRegistry();
  const record = canonicalDirectory.find((item) => item.organisation.slug === slug);
  const organisation = record?.organisation;
  const description = publicOrganisationDescription(organisation?.description ?? "");
  return {
    alternates: { canonical: `/organisations/${slug}` },
    title: organisation?.name ?? "Organisation record",
    description: description || "Africa energy-software organisation record.",
  };
}

export default async function OrganisationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const registry = await loadPublicOrganisationRegistry();
  const directoryRecord = registry.canonicalDirectory.find(
    (record) => record.organisation.slug === slug,
  );
  if (!directoryRecord) {
    const mergedListing = registry.catalogueRecords.find((record) =>
      catalogueCanonicalIdentity(record).slug === slug &&
      record.reconciliation.status === "reviewed_match",
    );
    if (mergedListing?.reconciliation.status === "reviewed_match") {
      redirect(mergedListing.reconciliation.canonicalHref);
    }
  }
  return (
    <OrganisationProfile
      directory={registry.canonicalDirectory}
      directoryRecord={directoryRecord}
      slug={slug}
    />
  );
}
