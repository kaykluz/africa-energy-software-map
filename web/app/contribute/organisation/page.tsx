import type { Metadata } from "next";
import { ContributionFlow } from "@/components/contribution-flow";

export const metadata: Metadata = {
  alternates: { canonical: "/contribute/organisation" },
  title: "Submit an organisation",
};

export default function SubmitOrganisation() {
  return <ContributionFlow type="organisation" />;
}
