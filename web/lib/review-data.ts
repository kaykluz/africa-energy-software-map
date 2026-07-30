import {
  assertions,
  deployments,
  organisations,
  products,
  registryManifest,
  sources,
  type Assertion,
  type EvidenceStatus,
} from "@/lib/registry-data";
import reviewAssistSnapshot from "@/generated/review-assist.json";

export const reviewBatchId = registryManifest.sourceBatch;

export type ReviewAssertion = Assertion & {
  subjectLabel: string;
  subjectContext: string;
  subjectHref: string;
  predicateLabel: string;
  sourceTitle: string;
  sourcePublisher: string;
  sourceUrl: string;
  sourceLicense: string;
  sourceIndependence: string;
  locator: string;
  assist: AssertionAssist;
};

export type AssertionAssist = {
  priority: number;
  recommendedAction: "editorial_review" | "request_evidence";
  signals: string[];
  automationCanDecide: false;
};

const productById = new Map(products.map((product) => [product.id, product]));
const organisationById = new Map(
  organisations.map((organisation) => [organisation.id, organisation]),
);
const deploymentById = new Map(
  deployments.map((deployment) => [deployment.id, deployment]),
);
const sourceById = new Map(sources.map((source) => [source.id, source]));
const assistByAssertionId = new Map(
  reviewAssistSnapshot.assertions.map((assist) => [
    assist.assertionId,
    assist as AssertionAssist & { assertionId: string },
  ]),
);

export const reviewAssertions: ReviewAssertion[] = assertions.map((assertion) => {
  const subject = subjectDetails(assertion);
  const source = sourceById.get(assertion.sourceId);
  const assist = assistByAssertionId.get(assertion.id);
  if (!assist) {
    throw new Error(`Review preparation is missing assertion ${assertion.id}.`);
  }
  return {
    ...assertion,
    ...subject,
    predicateLabel: sentenceLabel(assertion.predicate),
    sourceTitle: source?.title ?? "Source not found",
    sourcePublisher: source?.publisher ?? "",
    sourceUrl: source?.url ?? "",
    sourceLicense: source?.sourceLicense ?? "unknown",
    sourceIndependence: source?.independence ?? "Unknown",
    locator: locatorFromNotes(assertion.notes),
    assist,
  };
});

export const reviewSources = sources;

export const reviewEvidenceOptions: Array<{
  value: EvidenceStatus;
  label: string;
}> = [
  { value: "provider_claim_only", label: "Provider claim" },
  { value: "public_source", label: "Publicly sourced" },
  { value: "independently_evidenced", label: "Independently evidenced" },
  { value: "customer_confirmed", label: "Customer confirmed" },
];

export const reviewDecisions = [
  { value: "accept", label: "Accept", key: "1" },
  { value: "amend", label: "Amend", key: "2" },
  { value: "reject", label: "Reject", key: "3" },
  { value: "needs_evidence", label: "More evidence", key: "4" },
] as const;

export function isReviewAssertionId(value: string) {
  return reviewAssertions.some((assertion) => assertion.id === value);
}

export function isReviewSourceId(value: string) {
  return reviewSources.some((source) => source.id === value);
}

function subjectDetails(assertion: Assertion) {
  if (assertion.subjectType === "product") {
    const product = productById.get(assertion.subjectId);
    return {
      subjectLabel: product?.name ?? assertion.subjectId,
      subjectContext: product?.organisation ?? "Product",
      subjectHref: product ? `/products/${product.slug}` : "/directory",
    };
  }
  if (assertion.subjectType === "organisation") {
    const organisation = organisationById.get(assertion.subjectId);
    return {
      subjectLabel: organisation?.name ?? assertion.subjectId,
      subjectContext: "Organisation",
      subjectHref: organisation
        ? `/organisations/${organisation.slug}`
        : "/directory",
    };
  }
  if (assertion.subjectType === "deployment") {
    const deployment = deploymentById.get(assertion.subjectId);
    const product = deployment
      ? productById.get(deployment.productId)
      : undefined;
    return {
      subjectLabel: product?.name ?? assertion.subjectId,
      subjectContext: deployment
        ? `${deployment.country} · ${deployment.customer}`
        : "Deployment",
      subjectHref: product ? `/products/${product.slug}` : "/deployments",
    };
  }
  return {
    subjectLabel: assertion.subjectId,
    subjectContext: sentenceLabel(assertion.subjectType),
    subjectHref: "/directory",
  };
}

function locatorFromNotes(notes: string) {
  const marker = "Source locator and limits:";
  const markerIndex = notes.indexOf(marker);
  return markerIndex >= 0
    ? notes.slice(markerIndex + marker.length).trim()
    : notes
        .replace(
          /^AI-assisted source review candidate; human editorial approval required\.\s*/i,
          "",
        )
        .replace(/^Legacy ID: [^.]+\.\s*/i, "")
        .trim();
}

function sentenceLabel(value: string) {
  const label = value.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}
