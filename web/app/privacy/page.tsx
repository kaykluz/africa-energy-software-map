import type { Metadata } from "next";
import { PolicyPage } from "@/components/content-pages";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: "Privacy",
};

export default function Privacy() {
  return (
    <PolicyPage
      eyebrow="Privacy notice"
      intro="Browsing is public and requires no account. The intended product uses privacy-friendly aggregate analytics and excludes free-text searches, form content and confidential data from analytics."
      sections={[
        { heading: "Browsing data", body: "The public site does not add third-party advertising or behavioural tracking. Necessary hosting logs may still be processed for security and reliability." },
        { heading: "Contribution data", body: "Completed forms enter a private editorial queue. Local drafts omit email. Contact email is stored separately, excluded from public exports and retained for no more than 180 days, including the managed database recovery window. Do not submit sensitive infrastructure data, credentials or unnecessary personal information." },
        { heading: "Private receipts", body: "A submission creates a private status link. The secret in that link is not stored in readable form. Keep the link private; it is excluded from search indexing and analytics." },
        { heading: "Public attribution", body: "Data changes may link to a public pull request or source. Personal contributor details remain private unless attribution is explicitly chosen and appropriate." },
      ]}
      title="Privacy"
    />
  );
}
