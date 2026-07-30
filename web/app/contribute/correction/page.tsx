import type { Metadata } from "next";
import { ContributionFlow } from "@/components/contribution-flow";

export const metadata: Metadata = { title: "Correct a record" };

export default function CorrectRecord() {
  return <ContributionFlow type="correction" />;
}
