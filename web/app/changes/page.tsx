import type { Metadata } from "next";
import { ChangesPage } from "@/components/content-pages";

export const metadata: Metadata = { title: "Changes" };

export default function Changes() {
  return <ChangesPage />;
}
