"use client";

import { unzipSync } from "fflate";
import { bulkImportFields, type BulkImportPayload } from "@/lib/bulk-import";

const maximumWorkbookBytes = 2_000_000;
const maximumExpandedBytes = 6_000_000;
const spreadsheetNamespace =
  "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const relationshipNamespace =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export async function parseBulkWorkbook(
  file: File,
): Promise<BulkImportPayload> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Choose the .xlsx bulk-import template.");
  }
  if (file.size > maximumWorkbookBytes) {
    throw new Error("The workbook is too large. Use batches of 100 rows.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const archive = unzipSync(bytes, {
    filter: (entry) =>
      entry.originalSize <= maximumExpandedBytes &&
      [
        "xl/workbook.xml",
        "xl/_rels/workbook.xml.rels",
        "xl/sharedStrings.xml",
      ].includes(entry.name) ||
      (
        entry.name.startsWith("xl/worksheets/") &&
        entry.name.endsWith(".xml") &&
        entry.originalSize <= maximumExpandedBytes
      ),
  });
  const expandedBytes = Object.values(archive).reduce(
    (total, entry) => total + entry.byteLength,
    0,
  );
  if (expandedBytes > maximumExpandedBytes) {
    throw new Error("The workbook expands beyond the safe import limit.");
  }
  const workbook = xmlFile(archive, "xl/workbook.xml");
  const relationships = xmlFile(
    archive,
    "xl/_rels/workbook.xml.rels",
  );
  const sheet = Array.from(
    workbook.getElementsByTagNameNS(spreadsheetNamespace, "sheet"),
  ).find((item) => item.getAttribute("name") === "Bulk Records");
  if (!sheet) throw new Error("The workbook has no Bulk Records sheet.");
  const relationshipId =
    sheet.getAttributeNS(relationshipNamespace, "id") ??
    sheet.getAttribute("r:id");
  const relationship = Array.from(
    relationships.getElementsByTagName("Relationship"),
  ).find((item) => item.getAttribute("Id") === relationshipId);
  const target = relationship?.getAttribute("Target");
  if (!target) throw new Error("The Bulk Records sheet cannot be located.");
  const targetPath = target.startsWith("/")
    ? target.slice(1)
    : `xl/${target.replace(/^(\.\.\/)+/, "")}`;
  const worksheet = xmlFile(archive, targetPath);
  if (
    worksheet.getElementsByTagNameNS(spreadsheetNamespace, "f").length
  ) {
    throw new Error("Bulk Records cannot contain formulas.");
  }
  const sharedStrings = archive["xl/sharedStrings.xml"]
    ? parseSharedStrings(xmlFile(archive, "xl/sharedStrings.xml"))
    : [];
  const rows = Array.from(
    worksheet.getElementsByTagNameNS(spreadsheetNamespace, "row"),
  );
  const headerRow = rows.find((row) => Number(row.getAttribute("r")) === 3);
  if (!headerRow) throw new Error("The Bulk Records header row is missing.");
  const headers = parseRow(headerRow, sharedStrings).map((value) =>
    String(value ?? "").trim(),
  );
  if (
    headers.length !== bulkImportFields.length ||
    headers.some((header, index) => header !== bulkImportFields[index])
  ) {
    throw new Error("The Bulk Records headers have been changed.");
  }
  const parsedRows = rows
    .filter((row) => Number(row.getAttribute("r")) >= 4)
    .map((row) => parseRow(row, sharedStrings))
    .map((values) =>
      Object.fromEntries(
        bulkImportFields.map((field, index) => [
          field,
          normaliseCell(field, values[index]),
        ]),
      ),
    )
    .filter((row) =>
      Object.values(row).some((value) => String(value).trim()),
    );
  if (!parsedRows.length) {
    throw new Error("Add at least one row to Bulk Records.");
  }
  if (parsedRows.length > 100) {
    throw new Error("Upload no more than 100 populated rows at a time.");
  }
  return {
    filename: file.name,
    workbookHash: await sha256(bytes),
    headers,
    rows: parsedRows,
  };
}

function xmlFile(
  archive: Record<string, Uint8Array>,
  filename: string,
) {
  const entry = archive[filename];
  if (!entry) throw new Error(`The workbook is missing ${filename}.`);
  const document = new DOMParser().parseFromString(
    new TextDecoder().decode(entry),
    "application/xml",
  );
  if (document.querySelector("parsererror")) {
    throw new Error(`The workbook contains invalid XML in ${filename}.`);
  }
  return document;
}

function parseSharedStrings(document: Document) {
  return Array.from(
    document.getElementsByTagNameNS(spreadsheetNamespace, "si"),
  ).map((item) =>
    Array.from(item.getElementsByTagNameNS(spreadsheetNamespace, "t"))
      .map((text) => text.textContent ?? "")
      .join(""),
  );
}

function parseRow(row: Element, sharedStrings: string[]) {
  const values: unknown[] = [];
  for (const cell of Array.from(
    row.getElementsByTagNameNS(spreadsheetNamespace, "c"),
  )) {
    const reference = cell.getAttribute("r") ?? "";
    const index = columnIndex(reference);
    const type = cell.getAttribute("t") ?? "n";
    const valueNode = cell.getElementsByTagNameNS(
      spreadsheetNamespace,
      "v",
    )[0];
    const inlineNode = cell.getElementsByTagNameNS(
      spreadsheetNamespace,
      "is",
    )[0];
    const raw = valueNode?.textContent ?? "";
    let value: unknown = "";
    if (type === "inlineStr") {
      value = Array.from(
        inlineNode?.getElementsByTagNameNS(spreadsheetNamespace, "t") ?? [],
      )
        .map((item) => item.textContent ?? "")
        .join("");
    } else if (type === "s") {
      value = sharedStrings[Number(raw)] ?? "";
    } else if (type === "b") {
      value = raw === "1";
    } else if (type === "e") {
      throw new Error(`Bulk Records contains an Excel error at ${reference}.`);
    } else if (raw) {
      const numeric = Number(raw);
      value = Number.isFinite(numeric) ? numeric : raw;
    }
    values[index] = value;
  }
  return values;
}

function normaliseCell(
  field: (typeof bulkImportFields)[number],
  value: unknown,
) {
  if (
    field === "source_publication_date" &&
    typeof value === "number" &&
    value > 1
  ) {
    return excelDate(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value.trim() : "";
}

function excelDate(serial: number) {
  const date = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
  return date.toISOString().slice(0, 10);
}

function columnIndex(reference: string) {
  const letters = reference.match(/^[A-Z]+/)?.[0] ?? "";
  return (
    letters
      .split("")
      .reduce(
        (total, character) =>
          total * 26 + character.charCodeAt(0) - 64,
        0,
      ) - 1
  );
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    Uint8Array.from(bytes).buffer,
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
