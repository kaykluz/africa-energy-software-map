import type { Metadata } from "next";
import { ContributeHubPage } from "@/components/content-pages";

export const metadata: Metadata = {
  title: "Contribute",
  description: "Submit products, deployments, corrections and profile claims for review.",
};

export default function Contribute() {
  return <ContributeHubPage />;
}
