import type { Metadata } from "next";
import { ContributionStatus } from "@/components/contribution-status";

export const metadata: Metadata = {
  title: "Contribution status · Africa Energy Software Map",
  description: "Private contribution receipt and editorial status.",
  robots: { index: false, follow: false },
};

export default async function ContributionStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <ContributionStatus id={id} token={query.token ?? ""} />;
}
