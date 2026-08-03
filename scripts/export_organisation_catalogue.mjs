#!/usr/bin/env node

/**
 * Build the inclusion-first organisation catalogue from the research workbook.
 *
 * Workbook reads deliberately use @oai/artifact-tool. The output is a public-safe
 * candidate register: it is not the canonical reviewed release.
 */

import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const input = process.argv[2];
const output = process.argv[3] ?? path.join(root, "web/generated/organisation-catalogue.json");

if (!input) {
  throw new Error("Usage: export_organisation_catalogue.mjs <input.xlsx> [output.json]");
}

const expectedHeaders = [
  "Org ID", "Organization", "Aliases / Former Names", "Parent / Group",
  "Organization Type", "Primary Role", "All Roles", "Value Chain Detail",
  "HQ City", "HQ Country", "Africa Headquartered?", "HQ Africa Region",
  "African Regions Active", "Countries Active / Product Available", "Country Count",
  "Market Segments", "Technologies / Solutions", "Customer / Project Focus", "Status",
  "Website / Profile", "Short Description", "Primary Evidence URL",
  "Additional Evidence URLs", "Source Directory / Inclusion Basis", "Evidence Confidence",
  "Last Reviewed", "Coverage Caveat / Notes", "Role Flag – Financier",
  "Role Flag – Developer", "Role Flag – OEM", "Role Flag – EPC", "Role Flag – Operator",
  "Role Flag – Software/Data", "Role Flag – Enabler", "Role Flag – Public Institution",
  "Segment Flag – Utility-scale", "Segment Flag – T&D", "Segment Flag – Mini-grids",
  "Segment Flag – SHS/PAYGo", "Segment Flag – C&I", "Segment Flag – E-mobility",
  "Segment Flag – Storage", "Segment Flag – Clean Cooking", "Segment Flag – Efficiency",
  "Segment Flag – Productive Use", "Segment Flag – Carbon Markets", "Evidence Source Count",
];

const privateEditorialPatterns = [
  /\b(?:i|we) (?:currently )?(?:work|worked) (?:at|for|with)\b/i,
  /\b(?:i|we) (?:own|owned|founded|co-?founded|invested in)\b/i,
  /\b(?:i am|i'm|we are) (?:currently )?(?:employed|working|an? (?:employee|adviser|advisor|consultant|director|shareholder|investor))\b/i,
  /\b(?:my|our) (?:company|employer|workplace|job|role|stake|holding|shareholding|client|competitor|investment|portfolio company)\b/i,
  /\b(?:owned|employed) by (?:me|us)\b/i,
  /\b(?:a|the|direct|indirect|our|my) competitor(?:s| relationship)?\b/i,
  /\bconflict of interest\b/i,
  /\bdisclosure\s*:/i,
];

const bytes = await fs.readFile(input);
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(input));
const master = workbook.worksheets.getItem("Master Directory");
const headers = master.getRange("A4:AU4").values[0].map(clean);
if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
  throw new Error("Master Directory headers do not match the supported 2026-08-03 workbook.");
}

const values = master.getRange("A5:AU1957").values;
const snapshot = JSON.parse(
  await fs.readFile(path.join(root, "web/generated/registry-snapshot.json"), "utf8"),
);
const canonicalByName = new Map();
const canonicalByDomain = new Map();
for (const organisation of snapshot.organisations) {
  addIndex(canonicalByName, normaliseName(organisation.name), organisation);
  const host = domain(organisation.website);
  if (host) addIndex(canonicalByDomain, host, organisation);
}
for (const alias of snapshot.organisationAliases ?? []) {
  const organisation = snapshot.organisations.find((item) => item.id === alias.organisationId);
  if (organisation) addIndex(canonicalByName, normaliseName(alias.alias), organisation);
}

let removedPrivateCells = 0;
const records = values
  .map((row) => Object.fromEntries(expectedHeaders.map((header, index) => [header, row[index]])))
  .filter((row) => clean(row["Org ID"]) && clean(row.Organization))
  .map((row) => {
    const name = clean(row.Organization);
    const website = cleanUrl(row["Website / Profile"]);
    const sourceUrl = cleanUrl(row["Primary Evidence URL"]) || website;
    const canonical = reconcile(name, website);
    // Audit and strip narrative cells. The public catalogue reuses factual
    // metadata, attribution and links only; it does not republish source prose.
    publicText(row["Short Description"]);
    const coverageNotes = publicText(row["Coverage Caveat / Notes"]);
    publicText(row["Customer / Project Focus"]);
    return {
      id: `listing_${clean(row["Org ID"]).toLowerCase().replaceAll("-", "_")}`,
      sourceRow: recordsRowNumber(row["Org ID"]),
      workbookId: clean(row["Org ID"]),
      name,
      aliases: split(row["Aliases / Former Names"]),
      parent: clean(row["Parent / Group"]),
      organisationType: clean(row["Organization Type"]),
      primaryRole: clean(row["Primary Role"]),
      roles: split(row["All Roles"]),
      valueChainDetail: publicTaxonomy(row["Value Chain Detail"]),
      headquartersCity: clean(row["HQ City"]),
      headquartersCountry: canonicalCountry(row["HQ Country"]),
      africaHeadquartered: clean(row["Africa Headquartered?"]).toLowerCase() === "yes",
      headquartersRegion: clean(row["HQ Africa Region"]),
      africanRegionsActive: split(row["African Regions Active"]),
      countriesActive: split(row["Countries Active / Product Available"]).map(canonicalCountry),
      countryCount: numeric(row["Country Count"]),
      segments: split(row["Market Segments"]),
      technologies: split(row["Technologies / Solutions"]),
      projectFocus: "",
      lifecycle: clean(row.Status),
      website,
      description: "",
      sourceUrl,
      additionalSourceUrls: split(row["Additional Evidence URLs"]).map(cleanUrl).filter(Boolean),
      inclusionBasis: clean(row["Source Directory / Inclusion Basis"]),
      confidence: clean(row["Evidence Confidence"]) || "Unclassified",
      lastReviewed: excelDate(row["Last Reviewed"]),
      coverageNotes,
      evidenceSourceCount: numeric(row["Evidence Source Count"]),
      reconciliation: canonical
        ? { status: "reviewed_match", canonicalOrganisationId: canonical.id, canonicalHref: `/organisations/${canonical.slug}` }
        : { status: "candidate" },
      reviewState: canonical ? "reviewed" : "needs_review",
    };
  });

const sourceRegister = workbook.worksheets.getItem("Source Register");
const sourceValues = sourceRegister.getRange("A5:H14").values;
const sources = sourceValues
  .filter((row) => clean(row[0]))
  .map((row) => ({
    name: clean(row[0]), publisher: clean(row[1]), url: cleanUrl(row[2]),
    sourceType: clean(row[3]), coverage: clean(row[4]), recordsIngested: numeric(row[5]),
    accessed: excelDate(row[6]), caveat: publicText(row[7]),
  }));

const payload = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  asOf: "2026-08-03",
  sourceWorkbook: {
    filename: path.basename(input),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sheet: "Master Directory",
    sourceRows: records.length,
  },
  publicationBoundary: {
    inclusionCatalogue: true,
    reviewedRelease: false,
    candidateRecordsRequireReview: true,
    privateEditorialCellsRemoved: removedPrivateCells,
  },
  counts: {
    total: records.length,
    reviewedMatches: records.filter((record) => record.reviewState === "reviewed").length,
    needsReview: records.filter((record) => record.reviewState === "needs_review").length,
    africaHeadquartered: records.filter((record) => record.africaHeadquartered).length,
  },
  sources,
  records,
};

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(payload)}\n`);
process.stdout.write(`${JSON.stringify({ output, counts: payload.counts, removedPrivateCells }, null, 2)}\n`);

function reconcile(name, website) {
  const matches = new Map();
  for (const item of canonicalByName.get(normaliseName(name)) ?? []) matches.set(item.id, item);
  const host = domain(website);
  if (host) for (const item of canonicalByDomain.get(host) ?? []) matches.set(item.id, item);
  return matches.size === 1 ? [...matches.values()][0] : null;
}

function publicText(value) {
  const text = clean(value);
  if (!text) return "";
  if (privateEditorialPatterns.some((pattern) => pattern.test(text))) {
    removedPrivateCells += 1;
    return "";
  }
  return text;
}

function publicTaxonomy(value) {
  const text = publicText(value);
  if (!text) return "";
  return text
    .split(/\s*;\s*/)
    .map((item) => item.trim())
    .filter((item) => item && item.length <= 80 && !/[.!?]/.test(item))
    .slice(0, 12)
    .join("; ");
}

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).replaceAll("\u0000", "").trim();
}

function canonicalCountry(value) {
  const country = clean(value);
  const aliases = {
    "cote d ivoire": "Côte d’Ivoire",
    "ivory coast": "Côte d’Ivoire",
    "gambia": "The Gambia",
    "the gambia": "The Gambia",
    "usa": "United States",
    "united states of america": "United States",
    "england": "United Kingdom",
    "scotland": "United Kingdom",
    "uk": "United Kingdom",
    "illes maurice": "Mauritius",
    "cape verde": "Cabo Verde",
    "drc": "Democratic Republic of the Congo",
    "dr congo": "Democratic Republic of the Congo",
    "congo kinshasa": "Democratic Republic of the Congo",
    "congo brazzaville": "Republic of the Congo",
    "swaziland": "Eswatini",
  };
  return aliases[normaliseName(country)] ?? country;
}

function split(value) {
  return clean(value).split(/\s*[;|]\s*/).map((item) => item.trim()).filter(Boolean);
}

function cleanUrl(value) {
  const candidate = clean(value);
  if (!candidate || candidate === "See row-level evidence URLs") return "";
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function domain(value) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return ""; }
}

function normaliseName(value) {
  return clean(value).replace(/[’‘]/g, "'").normalize("NFKD").replace(/[^\x00-\x7F]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function addIndex(index, key, value) {
  if (!key) return;
  index.set(key, [...(index.get(key) ?? []), value]);
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function excelDate(value) {
  if (typeof value === "number" && value > 1) {
    return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000).toISOString().slice(0, 10);
  }
  return clean(value).slice(0, 10);
}

function recordsRowNumber(orgId) {
  const number = Number(clean(orgId).match(/\d+/)?.[0]);
  return Number.isFinite(number) ? number + 4 : 0;
}
