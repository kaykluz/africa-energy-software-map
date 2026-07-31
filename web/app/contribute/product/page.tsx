import type { Metadata } from "next";
import { ContributionFlow } from "@/components/contribution-flow";

export const metadata: Metadata = {
  alternates: { canonical: "/contribute/product" },
  title: "Submit a product",
};

export default function SubmitProduct() {
  return <ContributionFlow type="product" />;
}
