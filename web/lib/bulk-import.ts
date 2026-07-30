import { africanCountries, categories as registryCategories } from "@/lib/registry-data";

export const bulkImportFields = [
  "row_key",
  "record_type",
  "organisation_name",
  "existing_organisation_id",
  "organisation_website",
  "country_of_origin",
  "headquarters_country",
  "origin_classification",
  "product_name",
  "existing_product_id",
  "product_website",
  "open_source_url",
  "product_description",
  "primary_category_id",
  "sector_id",
  "product_lifecycle_status",
  "access_model",
  "deployment_country_iso2",
  "customer_name",
  "customer_disclosure",
  "deployment_lifecycle_status",
  "started_year",
  "source_url",
  "source_title",
  "source_publisher",
  "source_publication_date",
  "source_independence_class",
  "source_license",
  "evidence_status",
  "source_locator",
  "notes",
  "confirms_no_sensitive_data",
] as const;

export type BulkImportField = (typeof bulkImportFields)[number];
export type BulkImportRow = Record<BulkImportField, string>;
export type BulkImportBatch = {
  number: number;
  rowKeys: string[];
  entityCount: number;
  assertionEstimate: number;
};
export type BulkImportPayload = {
  filename: string;
  workbookHash: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
};
export type ValidatedBulkImport = {
  filename: string;
  workbookHash: string;
  rows: BulkImportRow[];
  warnings: string[];
  entityCount: number;
  batches: BulkImportBatch[];
};

export type BulkImportValidation =
  | { ok: true; value: ValidatedBulkImport }
  | { ok: false; errors: string[] };

export const bulkSectorIds = [
  "sector_power_utilities",
  "sector_distributed_energy_access",
  "sector_generation_storage",
  "sector_commercial_industrial",
  "sector_emobility_batteries",
  "sector_markets_finance_carbon",
] as const;

const allowedAfricanCountries = new Set(
  africanCountries.map(([iso2]) => iso2),
);
const categories = new Set(
  registryCategories.map((category) => category.id),
);
const sectors = new Set<string>(bulkSectorIds);
const origins = new Set([
  "africa_built",
  "africa_founded_global_hq",
  "global_deployed_in_africa",
  "public_or_open_infrastructure",
]);
const lifecycles = new Set([
  "active",
  "pilot",
  "historical",
  "acquired",
  "merged",
  "inactive",
  "under_review",
]);
const evidenceStatuses = new Set([
  "provider_claim_only",
  "public_source",
  "independently_evidenced",
  "customer_confirmed",
]);
const recordTypes = new Set(["product", "deployment"]);
const accessModels = new Set([
  "",
  "commercial",
  "open_source",
  "public",
  "freemium",
  "unknown",
]);
const disclosureStates = new Set([
  "named",
  "undisclosed",
  "unknown",
  "confidential",
]);
const independenceClasses = new Set([
  "customer_or_official",
  "independent_primary",
  "independent_secondary",
  "provider_authored",
  "aggregator",
  "community_submission",
]);
const weakSourceClasses = new Set([
  "provider_authored",
  "aggregator",
  "community_submission",
]);
const rowKeyPattern = /^[a-z0-9][a-z0-9._-]{2,79}$/;
const entityIdPattern = /^[a-z][a-z0-9_-]{2,95}$/;
const iso2Pattern = /^[A-Z]{2}$/;
const datePattern = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const coordinatePattern =
  /[-+]?\d{1,2}\.\d{4,}\s*[,;]\s*[-+]?\d{1,3}\.\d{4,}/;
const secretPattern =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:api[_ -]?key|password|secret|bearer)\s*[:=]\s*\S{8,}/i;

export function validateBulkImport(input: unknown): BulkImportValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["The bulk import must be a JSON object."] };
  }
  const payload = input as Record<string, unknown>;
  const filename = clean(payload.filename, 180);
  const workbookHash = clean(payload.workbookHash, 64).toLowerCase();
  const headers = Array.isArray(payload.headers)
    ? payload.headers.map((value) => clean(value, 80))
    : [];
  const sourceRows = Array.isArray(payload.rows) ? payload.rows : [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!filename.toLowerCase().endsWith(".xlsx")) {
    errors.push("Upload the unmodified .xlsx template.");
  }
  if (!/^[a-f0-9]{64}$/.test(workbookHash)) {
    errors.push("The workbook fingerprint is missing or invalid.");
  }
  if (
    headers.length !== bulkImportFields.length ||
    headers.some((header, index) => header !== bulkImportFields[index])
  ) {
    errors.push("The Bulk Records headers do not match the current template.");
  }
  if (!sourceRows.length) {
    errors.push("Add at least one row to Bulk Records.");
  }
  if (sourceRows.length > 100) {
    errors.push("One upload may contain at most 100 populated rows.");
  }

  const rows: BulkImportRow[] = [];
  const rowKeys = new Set<string>();
  for (const [index, sourceRow] of sourceRows.entries()) {
    if (!sourceRow || typeof sourceRow !== "object" || Array.isArray(sourceRow)) {
      errors.push(`Row ${index + 4}: could not be read.`);
      continue;
    }
    const source = sourceRow as Record<string, unknown>;
    const row = Object.fromEntries(
      bulkImportFields.map((field) => [
        field,
        clean(source[field], maximumLength(field)),
      ]),
    ) as BulkImportRow;
    const label = `Row ${index + 4}`;
    validateRow(row, label, errors, warnings);
    if (rowKeys.has(row.row_key)) {
      errors.push(`${label}: row_key must be unique.`);
    }
    rowKeys.add(row.row_key);
    rows.push(row);
  }

  if (errors.length) return { ok: false, errors: errors.slice(0, 100) };
  const batches = planBatches(rows);
  return {
    ok: true,
    value: {
      filename,
      workbookHash,
      rows,
      warnings: Array.from(new Set(warnings)),
      entityCount: uniqueEntities(rows).size,
      batches,
    },
  };
}

function validateRow(
  row: BulkImportRow,
  label: string,
  errors: string[],
  warnings: string[],
) {
  required(row, label, errors, [
    "row_key",
    "record_type",
    "organisation_name",
    "origin_classification",
    "product_name",
    "primary_category_id",
    "sector_id",
    "product_lifecycle_status",
    "source_url",
    "source_title",
    "source_publisher",
    "source_independence_class",
    "evidence_status",
    "source_locator",
  ]);
  if (!rowKeyPattern.test(row.row_key)) {
    errors.push(`${label}: row_key must use lowercase letters, numbers, dots, dashes or underscores.`);
  }
  if (!recordTypes.has(row.record_type)) {
    errors.push(`${label}: record_type is not supported.`);
  }
  for (const field of [
    "existing_organisation_id",
    "existing_product_id",
  ] as const) {
    if (row[field] && !entityIdPattern.test(row[field])) {
      errors.push(`${label}: ${field} is not a valid registry ID.`);
    }
  }
  for (const field of ["country_of_origin", "headquarters_country"] as const) {
    row[field] = row[field].toUpperCase();
    if (row[field] && !iso2Pattern.test(row[field])) {
      errors.push(`${label}: ${field} must be an ISO alpha-2 code.`);
    }
  }
  row.deployment_country_iso2 = row.deployment_country_iso2.toUpperCase();
  if (!origins.has(row.origin_classification)) {
    errors.push(`${label}: origin_classification is not recognised.`);
  }
  if (!categories.has(row.primary_category_id)) {
    errors.push(`${label}: primary_category_id is not recognised.`);
  }
  if (!sectors.has(row.sector_id)) {
    errors.push(`${label}: sector_id is not recognised.`);
  }
  if (!lifecycles.has(row.product_lifecycle_status)) {
    errors.push(`${label}: product_lifecycle_status is not recognised.`);
  }
  if (!accessModels.has(row.access_model)) {
    errors.push(`${label}: access_model is not recognised.`);
  }
  if (!independenceClasses.has(row.source_independence_class)) {
    errors.push(`${label}: source_independence_class is not recognised.`);
  }
  if (!evidenceStatuses.has(row.evidence_status)) {
    errors.push(`${label}: evidence_status is not recognised.`);
  }
  for (const field of [
    "organisation_website",
    "product_website",
    "open_source_url",
    "source_url",
  ] as const) {
    if (row[field] && !isHttpUrl(row[field])) {
      errors.push(`${label}: ${field} must be a direct http or https URL.`);
    }
  }
  if (row.source_publication_date && !datePattern.test(row.source_publication_date)) {
    errors.push(`${label}: source_publication_date must use yyyy-mm-dd.`);
  }
  if (row.started_year && !validYear(row.started_year)) {
    errors.push(`${label}: started_year must be a supported four-digit year.`);
  }
  if (
    weakSourceClasses.has(row.source_independence_class) &&
    ["independently_evidenced", "customer_confirmed"].includes(
      row.evidence_status,
    )
  ) {
    errors.push(`${label}: this source class cannot independently confirm the claim.`);
  }
  if (
    row.evidence_status === "customer_confirmed" &&
    row.source_independence_class !== "customer_or_official"
  ) {
    errors.push(`${label}: customer confirmation needs a customer or official source.`);
  }
  if (!row.source_license) {
    warnings.push("One or more sources need a rights or licence decision.");
  }

  if (row.record_type === "deployment") {
    required(row, label, errors, [
      "deployment_country_iso2",
      "customer_disclosure",
      "deployment_lifecycle_status",
      "confirms_no_sensitive_data",
    ]);
    if (!allowedAfricanCountries.has(row.deployment_country_iso2)) {
      errors.push(`${label}: deployment_country_iso2 must be an African country.`);
    }
    if (!disclosureStates.has(row.customer_disclosure)) {
      errors.push(`${label}: customer_disclosure is not recognised.`);
    }
    if (!lifecycles.has(row.deployment_lifecycle_status)) {
      errors.push(`${label}: deployment_lifecycle_status is not recognised.`);
    }
    if (row.customer_disclosure === "named" && !row.customer_name) {
      errors.push(`${label}: a named customer requires customer_name.`);
    }
    if (
      row.customer_disclosure === "confidential" &&
      row.customer_name
    ) {
      errors.push(`${label}: remove customer_name when disclosure is confidential.`);
    }
    if (row.confirms_no_sensitive_data.toLowerCase() !== "true") {
      errors.push(`${label}: confirm that no sensitive infrastructure data is included.`);
    }
  } else if (
    row.deployment_country_iso2 ||
    row.customer_name ||
    row.deployment_lifecycle_status ||
    row.started_year
  ) {
    errors.push(`${label}: deployment fields require record_type deployment.`);
  }

  const publishableText = [
    row.product_description,
    row.customer_name,
    row.source_locator,
    row.notes,
  ].join("\n");
  if (coordinatePattern.test(publishableText)) {
    errors.push(`${label}: remove precise coordinates.`);
  }
  if (secretPattern.test(publishableText)) {
    errors.push(`${label}: remove credentials, tokens or other secret material.`);
  }
}

function planBatches(rows: BulkImportRow[]) {
  const batches: BulkImportBatch[] = [];
  let currentRows: BulkImportRow[] = [];
  for (const row of rows) {
    const proposed = [...currentRows, row];
    const entityCount = uniqueEntities(proposed).size;
    const assertionEstimate = estimateAssertions(proposed);
    if (
      currentRows.length &&
      (entityCount > 25 || assertionEstimate > 100)
    ) {
      batches.push(batchRecord(batches.length + 1, currentRows));
      currentRows = [row];
    } else {
      currentRows = proposed;
    }
  }
  if (currentRows.length) {
    batches.push(batchRecord(batches.length + 1, currentRows));
  }
  return batches;
}

function batchRecord(number: number, rows: BulkImportRow[]): BulkImportBatch {
  return {
    number,
    rowKeys: rows.map((row) => row.row_key),
    entityCount: uniqueEntities(rows).size,
    assertionEstimate: estimateAssertions(rows),
  };
}

function uniqueEntities(rows: BulkImportRow[]) {
  const entities = new Set<string>();
  for (const row of rows) {
    entities.add(
      `org:${row.existing_organisation_id || row.organisation_name.toLowerCase()}`,
    );
    entities.add(
      `product:${row.existing_product_id || `${row.organisation_name}:${row.product_name}`.toLowerCase()}`,
    );
    if (row.record_type === "deployment") {
      entities.add(`deployment:${row.row_key}`);
    }
  }
  return entities;
}

function estimateAssertions(rows: BulkImportRow[]) {
  return rows.reduce(
    (total, row) => total + (row.record_type === "deployment" ? 8 : 5),
    0,
  );
}

function required(
  row: BulkImportRow,
  label: string,
  errors: string[],
  fields: BulkImportField[],
) {
  for (const field of fields) {
    if (!row[field]) errors.push(`${label}: ${field} is required.`);
  }
}

function maximumLength(field: BulkImportField) {
  if (field.endsWith("_url")) return 2_048;
  if (["product_description", "notes", "source_locator"].includes(field)) {
    return 3_000;
  }
  return 320;
}

function clean(value: unknown, maximum: number) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
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
