import type { Metadata } from "next";
import { ContributionFlow } from "@/components/contribution-flow";

export const metadata: Metadata = {
  alternates: { canonical: "/contribute/deployment" },
  title: "Add a deployment",
};

export default function AddDeployment() {
  return <ContributionFlow type="deployment" />;
}
