import type { Metadata } from "next";
import { PolicyPage } from "@/components/content-pages";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <PolicyPage
      eyebrow="Privacy notice"
      intro="Browsing is public and requires no account. The intended product uses privacy-friendly aggregate analytics and excludes free-text searches, form content and confidential data from analytics."
      sections={[
        { heading: "Browsing data", body: "The prototype does not add third-party advertising or tracking. Necessary hosting logs may still be processed for security and reliability." },
        { heading: "Contribution data", body: "Contribution forms collect the information required for editorial review. Local drafts omit email fields and contributors must not submit sensitive infrastructure data, credentials or unnecessary personal information." },
        { heading: "Public attribution", body: "Data changes may link to a public pull request or source. Personal contributor details remain private unless attribution is explicitly chosen and appropriate." },
      ]}
      title="Privacy"
    />
  );
}
