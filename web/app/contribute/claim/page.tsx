import type { Metadata } from "next";
import { ContributionFlow } from "@/components/contribution-flow";

export const metadata: Metadata = {
  alternates: { canonical: "/contribute/claim" },
  title: "Claim a profile",
};

export default function ClaimProfile() {
  return <ContributionFlow type="claim" />;
}
