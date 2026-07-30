import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://africa-energy-software-map-2026.kaykluz.chatgpt.site",
  ),
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
    images: [
      {
        url: "/social-card.jpg",
        width: 1200,
        height: 630,
        alt: "Abstract equal-area map of Africa with evidence tiles and a cobalt data route",
      },
    ],
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
