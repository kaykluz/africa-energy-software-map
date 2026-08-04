import type { Metadata } from "next";
import { DataPage } from "@/components/content-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/data" },
  title: "Data and downloads",
  description: "Filtered exports, versioned releases, schema and API direction.",
};

export default function Data() {
  return <DataPage />;
}
