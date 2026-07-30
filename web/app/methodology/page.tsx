import type { Metadata } from "next";
import { MethodologyPage } from "@/components/content-pages";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "Scope, evidence, taxonomy, AI disclosure, sensitive-data and editorial-review methods.",
};

export default function Methodology() {
  return <MethodologyPage />;
}
