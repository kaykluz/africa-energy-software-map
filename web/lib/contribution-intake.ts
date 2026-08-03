import { africanCountries, categories } from "@/lib/registry-data";
import { organisationEcosystemGroups } from "@/lib/organisation-data";

export const contributionTypes = [
  "product",
  "organisation",
  "deployment",
  "correction",
  "claim",
] as const;

export type ContributionType = (typeof contributionTypes)[number];

export type ContributionInput = {
  type: ContributionType;
  product: string;
  organisation: string;
  category: string;
  country: string;
  customerDisclosure: "named" | "undisclosed";
  customer: string;
  year: string;
  lifecycle: "live" | "pilot" | "active" | "planned" | "historical" | "unknown";
  presenceType:
    | "operations"
    | "project_participation"
    | "office"
    | "legal_entity"
    | "product_deployment"
    | "product_availability";
  field: string;
  proposedValue: string;
  source: string;
  relationship: string;
  authority: string;
  email: string;
  notes: string;
  sensitiveConfirmed: boolean;
  companyWebsite: string;
};

export type IntakeValidation =
  | { ok: true; value: ContributionInput }
  | { ok: false; fields: Record<string, string>; message: string };

const allowedRelationships = new Set([
  "",
  "provider",
  "customer",
  "researcher",
  "public",
]);
const allowedLifecycles = new Set(["live", "pilot", "active", "planned", "historical", "unknown"]);
const allowedPresenceTypes = new Set([
  "operations",
  "project_participation",
  "office",
  "legal_entity",
  "product_deployment",
  "product_availability",
]);
const allowedDisclosures = new Set(["named", "undisclosed"]);
const allowedCountries = new Set(africanCountries.map(([iso2]) => iso2));
const allowedCategories = new Set(categories.map((category) => category.name));
const allowedActorGroups = new Set(
  organisationEcosystemGroups.map((group) => group.name),
);
const coordinatePattern =
  /[-+]?\d{1,2}\.\d{4,}\s*[,;]\s*[-+]?\d{1,3}\.\d{4,}/;
const secretPattern =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:api[_ -]?key|password|secret|bearer)\s*[:=]\s*\S{8,}/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContribution(input: unknown): IntakeValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return invalid({}, "The contribution body must be a JSON object.");
  }
  const record = input as Record<string, unknown>;
  const type = text(record.type, 20) as ContributionType;
  const value: ContributionInput = {
    type,
    product: text(record.product, 160),
    organisation: text(record.organisation, 160),
    category: text(record.category, 160),
    country: text(record.country, 2).toUpperCase(),
    customerDisclosure: text(
      record.customerDisclosure,
      20,
    ) as ContributionInput["customerDisclosure"],
    customer: text(record.customer, 240),
    year: text(record.year, 4),
    lifecycle: text(record.lifecycle, 20) as ContributionInput["lifecycle"],
    presenceType: text(record.presenceType, 40) as ContributionInput["presenceType"],
    field: text(record.field, 120),
    proposedValue: text(record.proposedValue, 2000),
    source: text(record.source, 2048),
    relationship: text(record.relationship, 40),
    authority: text(record.authority, 1000),
    email: text(record.email, 320).toLowerCase(),
    notes: text(record.notes, 3000),
    sensitiveConfirmed: record.sensitiveConfirmed === true,
    companyWebsite: text(record.companyWebsite, 400),
  };
  const fields: Record<string, string> = {};

  if (!contributionTypes.includes(type)) {
    fields.type = "Choose a supported contribution route.";
  }
  if (!value.source || !isHttpUrl(value.source)) {
    fields.source = "Add a direct public http or https source URL.";
  }
  if (value.email && !emailPattern.test(value.email)) {
    fields.email = "Enter a valid email address.";
  }
  if (!allowedRelationships.has(value.relationship)) {
    fields.relationship = "Choose a valid relationship.";
  }
  if (value.country && !allowedCountries.has(value.country)) {
    fields.country = "Choose an African country from the list.";
  }
  if (value.year && !validYear(value.year)) {
    fields.year = "Use a four-digit year from 1900 to next year.";
  }
  if (value.lifecycle && !allowedLifecycles.has(value.lifecycle)) {
    fields.lifecycle = "Choose a supported lifecycle.";
  }
  if (
    value.customerDisclosure &&
    !allowedDisclosures.has(value.customerDisclosure)
  ) {
    fields.customerDisclosure = "Choose a valid disclosure state.";
  }

  if (type === "product") {
    required(fields, "product", value.product, "Enter the product name.");
    required(
      fields,
      "organisation",
      value.organisation,
      "Enter the owning organisation.",
    );
    required(fields, "category", value.category, "Choose a primary category.");
    if (value.category && !allowedCategories.has(value.category)) {
      fields.category = "Choose a category from the registry taxonomy.";
    }
    required(fields, "notes", value.notes, "Describe what the product does.");
  }
  if (type === "organisation") {
    required(
      fields,
      "organisation",
      value.organisation,
      "Enter the organisation name.",
    );
    required(fields, "category", value.category, "Choose an actor type.");
    if (value.category && !allowedActorGroups.has(value.category)) {
      fields.category = "Choose an actor type from the organisation taxonomy.";
    }
    required(
      fields,
      "notes",
      value.notes,
      "Describe the organisation’s specific role and energy markets.",
    );
    required(fields, "country", value.country, "Choose the country this source supports.");
    required(fields, "presenceType", value.presenceType, "Choose the type of presence.");
    if (value.presenceType && !allowedPresenceTypes.has(value.presenceType)) {
      fields.presenceType = "Choose a supported presence type.";
    }
    if (!["active", "planned", "historical", "unknown"].includes(value.lifecycle)) {
      fields.lifecycle = "Choose an organisation-presence status.";
    }
  }
  if (type === "deployment") {
    required(fields, "product", value.product, "Choose the product.");
    required(fields, "country", value.country, "Choose the country.");
    required(
      fields,
      "customer",
      value.customer,
      value.customerDisclosure === "undisclosed"
        ? "Add only a publishable customer description."
        : "Enter the customer name.",
    );
    if (!value.sensitiveConfirmed) {
      fields.sensitiveConfirmed =
        "Confirm that no sensitive infrastructure information is included.";
    }
  }
  if (type === "correction") {
    required(fields, "product", value.product, "Choose the record.");
    required(fields, "field", value.field, "Identify the field or assertion.");
    required(
      fields,
      "proposedValue",
      value.proposedValue,
      "Enter the proposed replacement.",
    );
  }
  if (type === "claim") {
    required(
      fields,
      "organisation",
      value.organisation,
      "Choose the organisation.",
    );
    required(fields, "authority", value.authority, "Explain your authority.");
    required(fields, "email", value.email, "Enter a work email address.");
  }

  const publishableText = [
    value.customer,
    value.proposedValue,
    value.authority,
    value.notes,
  ].join("\n");
  if (coordinatePattern.test(publishableText)) {
    fields.notes =
      "Remove precise coordinates. Country or safe subnational geography is sufficient.";
  }
  if (secretPattern.test(publishableText)) {
    fields.notes =
      "Remove credentials, tokens, passwords and other secret material.";
  }

  return Object.keys(fields).length
    ? invalid(fields, "Review the highlighted contribution fields.")
    : { ok: true, value };
}

export function createReceipt(type: ContributionType, now = new Date()) {
  const idBytes = new Uint8Array(8);
  const tokenBytes = new Uint8Array(24);
  crypto.getRandomValues(idBytes);
  crypto.getRandomValues(tokenBytes);
  const randomId = Array.from(idBytes, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  const token = Array.from(tokenBytes, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  const day = now.toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = {
    product: "PRO",
    organisation: "ORG",
    deployment: "DEP",
    correction: "COR",
    claim: "CLA",
  }[type];
  return {
    id: `AEM-${prefix}-${day}-${randomId.toUpperCase()}`,
    token,
  };
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function statusLabel(status: string) {
  return (
    {
      received: "Awaiting intake review",
      triaged: "Triaged",
      researching: "Research in progress",
      needs_evidence: "More evidence needed",
      reviewed: "Editorial review complete",
      accepted: "Accepted for a future release",
      published: "Published",
      rejected: "Not accepted",
      duplicate: "Duplicate",
      withdrawn: "Withdrawn",
    }[status] ?? "In editorial review"
  );
}

function text(value: unknown, maximum: number) {
  return typeof value === "string"
    ? value.trim().replaceAll("\u0000", "").slice(0, maximum)
    : "";
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) && Boolean(parsed.host);
  } catch {
    return false;
  }
}

function validYear(value: string) {
  if (!/^\d{4}$/.test(value)) return false;
  const year = Number(value);
  return year >= 1900 && year <= new Date().getUTCFullYear() + 1;
}

function required(
  fields: Record<string, string>,
  field: string,
  value: string,
  message: string,
) {
  if (!value) fields[field] = message;
}

function invalid(fields: Record<string, string>, message: string) {
  return { ok: false as const, fields, message };
}
