import type { Metadata } from "next";
import { DataPage } from "@/components/content-pages";

export const metadata: Metadata = {
  title: "Data and downloads",
  description: "Filtered exports, versioned releases, schema and API direction.",
};

export default function Data() {
  return <DataPage />;
}
