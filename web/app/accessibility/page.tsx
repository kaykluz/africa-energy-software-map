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
      intro="The project targets WCAG 2.2 AA and supports keyboard, screen-reader, zoom, reduced-motion and non-spatial use. Formal conformance has not yet been independently assessed."
      sections={[
        { heading: "What we are building for", body: "Semantic landmarks, one H1, visible focus, generous targets, non-colour status wording, table/list alternatives for geography, reflow at 320 CSS pixels and useful server-rendered content." },
        { heading: "Known limitations", body: "Formal assistive-technology and moderated 200% zoom testing remains outstanding. The geographic view uses country-level geometry only and retains a grid and ranked-list alternative; it does not provide site coordinates." },
        { heading: "Feedback route", body: "Use Correct a record for data issues or the project GitHub issue tracker for interface barriers. Include the page, browser, assistive technology and task where possible." },
      ]}
      title="Accessibility"
    />
  );
}
