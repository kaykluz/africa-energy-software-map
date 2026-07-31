import type { Metadata } from "next";
import { PolicyPage } from "@/components/content-pages";

export const metadata: Metadata = {
  alternates: { canonical: "/accessibility" },
  title: "Accessibility",
};

export default function Accessibility() {
  return (
    <PolicyPage
      eyebrow="Accessibility statement"
      intro="The project targets WCAG 2.2 AA and is being designed for keyboard, screen-reader, zoom, reduced-motion and non-spatial use. This prototype is not yet claiming formal conformance."
      sections={[
        { heading: "What we are building for", body: "Semantic landmarks, one H1, visible focus, generous targets, non-colour status wording, table/list alternatives for geography, reflow at 320 CSS pixels and useful server-rendered content." },
        { heading: "Known prototype limitations", body: "Formal screen-reader and 200% zoom testing has not yet been completed; the geographic prototype currently provides an equal-area grid and ranked list rather than an official-geometry choropleth." },
        { heading: "Feedback route", body: "Use Correct a record for data issues or the project GitHub issue tracker for interface barriers. Include the page, browser, assistive technology and task where possible." },
      ]}
      title="Accessibility"
    />
  );
}
