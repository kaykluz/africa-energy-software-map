import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Africa Energy Software Map",
    template: "%s · Africa Energy Software Map",
  },
  description:
    "An evidence-led public record of the software used across African energy systems.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    title: "Africa Energy Software Map",
    description:
      "Explore software, evidenced deployments and source-linked records across African energy.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><SiteShell>{children}</SiteShell></body>
    </html>
  );
}
