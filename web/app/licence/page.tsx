import type { Metadata } from "next";
import { PolicyPage } from "@/components/content-pages";

export const metadata: Metadata = { title: "Licence and attribution" };

export default function Licence() {
  return (
    <PolicyPage
      eyebrow="Licence and attribution"
      intro="Project code is MIT. Project-produced data and documentation are intended for CC BY 4.0 release, subject to third-party exclusions and final rights review."
      sections={[
        { heading: "Suggested attribution", body: "Africa Energy Software Map contributors, dataset version and release date, with a link to the project and applicable licence." },
        { heading: "Third-party material", body: "Source pages, extracts, logos and trademarks retain their original rights. Inclusion in a source register does not relicense third-party content." },
        { heading: "Responsible reuse", body: "Exports preserve stable identifiers, source linkage, evidence wording and disclosure status. Reusers must not reconstruct confidential customer identities or precise sensitive infrastructure locations." },
      ]}
      title="Licence"
    />
  );
}
