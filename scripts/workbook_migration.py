#!/usr/bin/env python3
"""Pure-stdlib workbook migration helpers for the starter census.

The module deliberately treats workbook content as untrusted input. It reads
only whitelisted sheets, never evaluates formulas, and emits candidate data that
still requires human editorial review.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import unicodedata
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree as ET


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"m": MAIN_NS, "r": REL_NS}
FORMULA_PREFIX = re.compile(r"^[=+@]|^-(?!\d+(?:\.\d+)?$)")
YEAR_PATTERN = re.compile(r"^\d{4}$")


TABLE_FIELDS = {
    "organisations.csv": [
        "id",
        "name",
        "slug",
        "organisation_type",
        "origin_classification",
        "country_of_origin",
        "headquarters_country",
        "lifecycle_status",
        "website",
        "description",
        "provider_profile_confirmed",
        "last_checked_at",
    ],
    "products.csv": [
        "id",
        "organisation_id",
        "name",
        "slug",
        "description",
        "primary_category_id",
        "lifecycle_status",
        "access_model",
        "open_source_url",
        "website",
        "launched_year",
        "last_checked_at",
    ],
    "capabilities.csv": ["id", "name", "description"],
    "product-capabilities.csv": ["product_id", "capability_id", "is_primary"],
    "deployments.csv": [
        "id",
        "product_id",
        "country_iso2",
        "subnational_area",
        "customer_name",
        "customer_disclosure",
        "lifecycle_status",
        "started_year",
        "ended_year",
        "location_precision",
        "last_checked_at",
    ],
    "deployment-parties.csv": ["deployment_id", "organisation_id", "role"],
    "sources.csv": [
        "id",
        "url",
        "title",
        "publisher",
        "source_type",
        "author",
        "publication_date",
        "retrieved_at",
        "archived_url",
        "source_license",
        "independence_class",
        "automation_permitted",
        "notes",
    ],
    "assertions.csv": [
        "id",
        "subject_type",
        "subject_id",
        "predicate",
        "value",
        "source_id",
        "evidence_status",
        "extracted_by",
        "extractor_run_id",
        "reviewed_by",
        "reviewed_at",
        "valid_from",
        "valid_to",
        "notes",
    ],
    "submissions.csv": [
        "id",
        "submission_type",
        "submitted_at",
        "submitter_relationship",
        "status",
        "related_entity_id",
        "evidence_url",
        "notes",
    ],
    "changes.csv": [
        "id",
        "entity_type",
        "entity_id",
        "field_name",
        "old_value",
        "new_value",
        "changed_at",
        "changed_by",
        "review_note",
    ],
    "source-register.csv": [
        "id",
        "name",
        "source_family",
        "countries",
        "categories",
        "base_url",
        "discovery_method",
        "automation_permitted",
        "expected_update_frequency",
        "default_independence_class",
        "language",
        "last_checked_at",
        "next_review_at",
        "status",
        "notes",
    ],
}


class MigrationError(RuntimeError):
    """Raised when the source cannot be migrated safely."""


def _column_index(cell_reference: str) -> int:
    letters = "".join(character for character in cell_reference if character.isalpha())
    result = 0
    for character in letters:
        result = result * 26 + (ord(character.upper()) - ord("A") + 1)
    return result - 1


def _text_content(element: ET.Element | None) -> str:
    if element is None:
        return ""
    return "".join(node.text or "" for node in element.iter(f"{{{MAIN_NS}}}t"))


class XlsxValuesReader:
    """Minimal values-only XLSX reader.

    Formula expressions are never evaluated. Cached values may be read, but the
    eligible data sheets are required to contain no formulas.
    """

    def __init__(self, path: Path):
        self.path = path

    def read(self, eligible_sheets: set[str]) -> dict[str, list[dict[str, str]]]:
        with zipfile.ZipFile(self.path) as archive:
            shared_strings = self._shared_strings(archive)
            sheet_targets = self._sheet_targets(archive)
            missing = eligible_sheets.difference(sheet_targets)
            if missing:
                raise MigrationError(
                    f"source workbook is missing eligible sheets: {sorted(missing)}"
                )

            result: dict[str, list[dict[str, str]]] = {}
            for sheet_name in sorted(eligible_sheets):
                target = sheet_targets[sheet_name]
                rows = self._read_sheet(archive, target, shared_strings)
                if not rows:
                    raise MigrationError(f"{sheet_name}: sheet is empty")
                headers = [str(value).strip() for value in rows[0]]
                if len(headers) != len(set(headers)):
                    raise MigrationError(f"{sheet_name}: duplicate column headers")
                result[sheet_name] = [
                    {
                        header: str(row[index]).strip() if index < len(row) else ""
                        for index, header in enumerate(headers)
                    }
                    for row in rows[1:]
                    if any(str(value).strip() for value in row)
                ]
            return result

    @staticmethod
    def _shared_strings(archive: zipfile.ZipFile) -> list[str]:
        try:
            content = archive.read("xl/sharedStrings.xml")
        except KeyError:
            return []
        root = ET.fromstring(content)
        return [_text_content(item) for item in root.findall(f"{{{MAIN_NS}}}si")]

    @staticmethod
    def _sheet_targets(archive: zipfile.ZipFile) -> dict[str, str]:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relationships = ET.fromstring(
            archive.read("xl/_rels/workbook.xml.rels")
        )
        relationship_targets = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in relationships.findall(f"{{{PACKAGE_REL_NS}}}Relationship")
        }
        targets: dict[str, str] = {}
        for sheet in workbook.findall("m:sheets/m:sheet", NS):
            name = sheet.attrib["name"]
            relationship_id = sheet.attrib[f"{{{REL_NS}}}id"]
            target = relationship_targets[relationship_id].lstrip("/")
            if not target.startswith("xl/"):
                target = f"xl/{target}"
            targets[name] = target
        return targets

    @staticmethod
    def _read_sheet(
        archive: zipfile.ZipFile, target: str, shared_strings: list[str]
    ) -> list[list[str]]:
        root = ET.fromstring(archive.read(target))
        rows: list[list[str]] = []
        for row_element in root.findall("m:sheetData/m:row", NS):
            values: list[str] = []
            for cell in row_element.findall("m:c", NS):
                if cell.find("m:f", NS) is not None:
                    raise MigrationError(
                        f"{target}: formulas are prohibited in eligible data sheets"
                    )
                reference = cell.attrib.get("r", "A1")
                index = _column_index(reference)
                while len(values) <= index:
                    values.append("")
                cell_type = cell.attrib.get("t")
                if cell_type == "inlineStr":
                    value = _text_content(cell.find("m:is", NS))
                else:
                    value_element = cell.find("m:v", NS)
                    raw_value = value_element.text if value_element is not None else ""
                    if cell_type == "s" and raw_value:
                        value = shared_strings[int(raw_value)]
                    elif cell_type == "b":
                        value = "true" if raw_value == "1" else "false"
                    else:
                        value = raw_value or ""
                values[index] = value
            rows.append(values)
        return rows


def canonical_id(legacy_id: str) -> str:
    value = legacy_id.strip().lower().replace("-", "_")
    if not re.fullmatch(r"[a-z][a-z0-9_]*", value):
        raise MigrationError(f"cannot create canonical ID from {legacy_id!r}")
    return value


def slug(value: str) -> str:
    normalised = unicodedata.normalize("NFKD", value)
    ascii_value = normalised.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()))


def snake(value: str) -> str:
    return slug(value).replace("-", "_")


def safe_scalar(value: object, field_name: str) -> str:
    text = "" if value is None else str(value).strip()
    if FORMULA_PREFIX.search(text):
        raise MigrationError(
            f"{field_name}: formula-like content is prohibited in CSV output"
        )
    if "\x00" in text:
        raise MigrationError(f"{field_name}: null byte is prohibited")
    return text


def domain_for_url(url: str) -> str:
    hostname = (urlparse(url).hostname or "").lower()
    return hostname.removeprefix("www.")


def stable_id(prefix: str, *parts: str) -> str:
    digest = hashlib.sha256("\x1f".join(parts).encode("utf-8")).hexdigest()[:16]
    return f"{prefix}_{digest}"


def source_metadata(url: str, config: dict) -> dict[str, str]:
    domain = domain_for_url(url)
    configured = config["source_domains"].get(domain, {})
    metadata = {
        "id": stable_id("src", url),
        "url": url,
        "title": "Editorial review required — source title not captured",
        "publisher": configured.get("publisher", domain or "unknown"),
        "source_type": configured.get("source_type", "webpage"),
        "author": "",
        "publication_date": "",
        "retrieved_at": "",
        "archived_url": "",
        "source_license": "unknown",
        "independence_class": configured.get(
            "independence_class", "provider_authored"
        ),
        "automation_permitted": "false",
        "notes": (
            "Candidate import only; complete title, publication date, locator, "
            "rights and automation review before publication."
        ),
    }
    reviewed = (
        config.get("research_review", {}).get("sources", {}).get(url, {})
    )
    permitted_fields = set(TABLE_FIELDS["sources.csv"]).difference({"id", "url"})
    unknown_fields = set(reviewed).difference(permitted_fields)
    if unknown_fields:
        raise MigrationError(
            f"research source {url} has unsupported fields: {sorted(unknown_fields)}"
        )
    for field_name, value in reviewed.items():
        metadata[field_name] = safe_scalar(value, f"research source {field_name}")
    return metadata


def evidence_status(
    original_label: str, independence_class: str, subject_type: str
) -> tuple[str, list[str]]:
    flags: list[str] = []
    label = original_label.lower()
    if "vendor" in label:
        return "provider_claim_only", flags
    if independence_class == "provider_authored":
        if "verified" in label:
            flags.append("workbook_verified_word_downgraded")
        return "provider_claim_only", flags
    if independence_class == "customer_or_official":
        if subject_type == "deployment":
            return "customer_confirmed", flags
        return "public_source", flags
    if independence_class in {"independent_primary", "independent_secondary"}:
        return "independently_evidenced", flags
    return "public_source", ["source_independence_requires_review"]


def country_code(
    raw_value: str, config: dict, *, allow_composite: bool = False
) -> tuple[str, list[str]]:
    value = raw_value.strip()
    if not value or value.lower() in {"unverified", "global", "unknown"}:
        return "", ["country_unknown"]
    if value in config["country_codes"]:
        return config["country_codes"][value], []
    if "/" in value or "multi-country" in value.lower():
        if allow_composite:
            parts = [part.strip() for part in value.split("/")]
            codes = [
                config["country_codes"].get(part, "")
                for part in parts
                if part and part.lower() not in {"global", "africa", "africa offices"}
            ]
            codes = [code for code in codes if code]
            if len(set(codes)) == 1:
                return codes[0], ["composite_country_collapsed"]
        return "", ["composite_or_multi_country_requires_review"]
    return "", ["country_not_mapped"]


def origin_classification(raw: str, origin_country: str) -> str:
    value = raw.lower()
    if "open-source" in value or "public digital" in value:
        return "public_or_open_infrastructure"
    if "african-founded" in value or "african focused / global hq" in value:
        return "africa_founded_global_hq"
    if "africa-built" in value:
        return "africa_built"
    if "utility/proprietary" in value and origin_country:
        return "africa_built"
    return "global_deployed_in_africa"


def organisation_lifecycle(raw: str) -> str:
    value = raw.lower()
    if "merged" in value:
        return "merged"
    if any(token in value for token in ("inactive", "closed")):
        return "inactive"
    if "historical" in value:
        return "historical"
    if "to verify" in value:
        return "under_review"
    return "active"


def product_lifecycle(raw: str) -> tuple[str, list[str]]:
    value = raw.lower()
    if "historical" in value:
        return "historical", ["lifecycle_inferred_from_evidence_wording"]
    if any(token in value for token in ("prototype", "pilot", "programme")):
        return "pilot", ["lifecycle_inferred_from_evidence_wording"]
    if any(
        token in value
        for token in ("live", "deployment", "product", "use", "open-source")
    ):
        return "active", ["lifecycle_inferred_from_evidence_wording"]
    return "under_review", ["product_lifecycle_requires_review"]


def deployment_lifecycle(raw: str) -> str:
    value = raw.lower()
    if "historical" in value:
        return "historical"
    if "prototype" in value or "planned" in value or "pre-pilot" in value:
        return "under_review"
    if "pilot" in value:
        return "pilot"
    if any(token in value for token in ("live", "operational", "implementation")):
        return "active"
    return "under_review"


def access_model(raw: str) -> str:
    value = raw.lower()
    if "open-source" in value or "open source" in value:
        return "open_source"
    if "public" in value or "open protocol" in value:
        return "public_access"
    if "proprietary" in value or "enterprise" in value:
        return "commercial_proprietary"
    if "saas" in value or "marketplace" in value or "platform" in value:
        return "commercial_service"
    return "not_publicly_documented"


def customer_fields(raw_customer: str, raw_notes: str) -> tuple[str, str]:
    combined = f"{raw_customer} {raw_notes}".lower()
    if any(
        token in combined
        for token in ("not publicly named", "unnamed", "undisclosed")
    ):
        return "", "undisclosed"
    if not raw_customer.strip():
        return "", "unknown"
    return raw_customer.strip(), "named"


def normalised_precision(raw: str) -> tuple[str, list[str]]:
    value = raw.strip()
    flags: list[str] = []
    if any(token in value.lower() for token in ("named plant", "control centre")):
        flags.append("sensitive_location_review")
    return snake(value) if value else "unknown", flags


def capability_ids(functions: str, config: dict) -> list[str]:
    text = functions.lower()
    return sorted(
        capability_id
        for capability_id, keywords in config["capability_keywords"].items()
        if any(keyword.lower() in text for keyword in keywords)
    )


@dataclass
class CandidatePackage:
    tables: dict[str, list[dict[str, str]]] = field(
        default_factory=lambda: {filename: [] for filename in TABLE_FIELDS}
    )
    legacy_ids: list[dict[str, str]] = field(default_factory=list)
    warnings: Counter = field(default_factory=Counter)
    sources_by_url: dict[str, dict[str, str]] = field(default_factory=dict)
    research_summary: dict[str, object] = field(default_factory=dict)

    def record_warnings(self, flags: list[str] | None) -> None:
        if flags:
            self.warnings.update(set(flags))

    def add_source(self, url: str, config: dict, retrieved_at: str = "") -> dict:
        if not url:
            raise MigrationError("material record is missing its source URL")
        if url not in self.sources_by_url:
            source = source_metadata(url, config)
            if not source["retrieved_at"]:
                source["retrieved_at"] = retrieved_at
            if retrieved_at and source["title"].startswith(
                "Editorial review required"
            ):
                source["notes"] += (
                    " Retrieved date is provisionally mapped from the workbook "
                    "Last_Verified field."
                )
            self.sources_by_url[url] = source
            if source["title"].startswith("Editorial review required"):
                self.warnings["source_metadata_requires_completion"] += 1
            if "provisionally mapped" in source["notes"]:
                self.warnings["source_retrieval_date_inferred"] += 1
            if (
                source["title"].startswith("Editorial review required")
                and domain_for_url(url) not in config["source_domains"]
            ):
                self.warnings["source_publisher_derived_from_domain"] += 1
        return self.sources_by_url[url]

    def add_assertion(
        self,
        *,
        subject_type: str,
        subject_id: str,
        predicate: str,
        value: str,
        source: dict[str, str],
        evidence: str,
        legacy_id: str,
        flags: list[str] | None = None,
    ) -> None:
        if value == "":
            return
        notes = [
            "Candidate import; human editorial review required.",
            f"Legacy ID: {legacy_id}.",
        ]
        if flags:
            notes.append(f"Transformation flags: {', '.join(sorted(set(flags)))}.")
        assertion = {
            "id": stable_id(
                "asrt", subject_type, subject_id, predicate, value, source["id"]
            ),
            "subject_type": subject_type,
            "subject_id": subject_id,
            "predicate": predicate,
            "value": value,
            "source_id": source["id"],
            "evidence_status": evidence,
            "extracted_by": "workbook_import",
            "extractor_run_id": "import_kaykluz_v0_1",
            "reviewed_by": "",
            "reviewed_at": "",
            "valid_from": "",
            "valid_to": "",
            "notes": " ".join(notes),
        }
        self.tables["assertions.csv"].append(assertion)

    def finalise(self) -> None:
        self.tables["sources.csv"] = sorted(
            self.sources_by_url.values(), key=lambda item: item["id"]
        )
        for filename, rows in self.tables.items():
            id_field = TABLE_FIELDS[filename][0] if rows else ""
            if id_field == "id":
                rows.sort(key=lambda item: item["id"])


def material_assertions(
    package: CandidatePackage,
    *,
    subject_type: str,
    subject_id: str,
    legacy_id: str,
    record: dict[str, str],
    predicates: list[str],
    source: dict[str, str],
    evidence: str,
    flags: list[str] | None = None,
) -> None:
    for predicate in predicates:
        package.add_assertion(
            subject_type=subject_type,
            subject_id=subject_id,
            predicate=predicate,
            value=record.get(predicate, ""),
            source=source,
            evidence=evidence,
            legacy_id=legacy_id,
            flags=flags,
        )


def apply_research_review(package: CandidatePackage, config: dict) -> None:
    """Apply a checked-in, source-linked research overlay.

    The overlay remains candidate research. It may correct imported values and
    evidence links, but it never records a human reviewer or publication
    approval.
    """

    review = config.get("research_review")
    if not review:
        return
    if review.get("status") != "ai_researched_human_pending":
        raise MigrationError("research review must remain human-pending")

    researched_at = safe_scalar(review.get("researched_at", ""), "researched_at")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", researched_at):
        raise MigrationError("research review requires an ISO researched_at date")
    run_id = safe_scalar(review.get("run_id", ""), "research run_id")
    if not re.fullmatch(r"[a-z][a-z0-9_]*", run_id):
        raise MigrationError("research review requires a repository-safe run_id")

    records_by_table: dict[str, dict[str, dict[str, str]]] = {}
    permitted_record_tables = {
        "organisations.csv",
        "products.csv",
        "deployments.csv",
    }
    for table_name in permitted_record_tables:
        records_by_table[table_name] = {
            row["id"]: row for row in package.tables[table_name]
        }

    changed_fields: list[tuple[str, str, str]] = []
    change_note = (
        "AI-assisted source review candidate; human editorial approval remains "
        "required."
    )
    for table_name, entity_overrides in review.get(
        "record_overrides", {}
    ).items():
        if table_name not in permitted_record_tables:
            raise MigrationError(
                f"research review cannot override table {table_name}"
            )
        permitted_fields = set(TABLE_FIELDS[table_name]).difference({"id"})
        for entity_id, field_overrides in entity_overrides.items():
            record = records_by_table[table_name].get(entity_id)
            if record is None:
                continue
            unknown_fields = set(field_overrides).difference(permitted_fields)
            if unknown_fields:
                raise MigrationError(
                    f"{entity_id} has unsupported override fields: "
                    f"{sorted(unknown_fields)}"
                )
            for field_name, raw_value in field_overrides.items():
                value = safe_scalar(
                    raw_value, f"research override {entity_id}.{field_name}"
                )
                old_value = record.get(field_name, "")
                if old_value == value:
                    continue
                record[field_name] = value
                changed_fields.append((entity_id, field_name, value))
                package.tables["changes.csv"].append(
                    {
                        "id": stable_id(
                            "chg",
                            run_id,
                            entity_id,
                            field_name,
                            old_value,
                            value,
                        ),
                        "entity_type": table_name.removesuffix(".csv"),
                        "entity_id": entity_id,
                        "field_name": field_name,
                        "old_value": old_value,
                        "new_value": value,
                        "changed_at": researched_at,
                        "changed_by": "ai_assisted_research",
                        "review_note": change_note,
                    }
                )

    legacy_by_canonical = {
        row["canonical_id"]: row["legacy_id"] for row in package.legacy_ids
    }
    subject_tables = {
        "organisation": "organisations.csv",
        "product": "products.csv",
        "deployment": "deployments.csv",
    }
    evidence_values = {
        "provider_claim_only",
        "public_source",
        "independently_evidenced",
        "customer_confirmed",
    }
    reviewed_assertions = 0
    added_assertions = 0
    removed_assertions = 0
    for rule in review.get("assertion_rules", []):
        subject_type = rule.get("subject_type", "")
        subject_id = rule.get("subject_id", "")
        if subject_type not in subject_tables:
            raise MigrationError(
                f"unsupported research assertion subject type {subject_type!r}"
            )
        record = records_by_table[subject_tables[subject_type]].get(subject_id)
        if record is None:
            continue
        predicates = rule.get("predicates", [])
        if not predicates:
            raise MigrationError(
                f"research assertion rule for {subject_id} has no predicates"
            )
        values = rule.get("values", {})
        note = safe_scalar(rule.get("note", ""), "research assertion note")
        remove = bool(rule.get("remove", False))
        evidence = rule.get("evidence_status", "")
        source = None
        if not remove:
            if evidence not in evidence_values:
                raise MigrationError(
                    f"invalid research evidence status {evidence!r}"
                )
            source_url = safe_scalar(
                rule.get("source_url", ""), "research assertion source_url"
            )
            source = package.add_source(source_url, config)
            if (
                source["independence_class"] == "provider_authored"
                and evidence
                in {"independently_evidenced", "customer_confirmed"}
            ):
                raise MigrationError(
                    f"provider source cannot upgrade evidence for "
                    f"{subject_type}/{subject_id}"
                )

        for predicate in predicates:
            matching_indexes = [
                index
                for index, assertion in enumerate(
                    package.tables["assertions.csv"]
                )
                if assertion["subject_type"] == subject_type
                and assertion["subject_id"] == subject_id
                and assertion["predicate"] == predicate
            ]
            if len(matching_indexes) > 1:
                raise MigrationError(
                    f"research rule is ambiguous for "
                    f"{subject_type}/{subject_id}/{predicate}"
                )
            if remove:
                if matching_indexes:
                    package.tables["assertions.csv"].pop(matching_indexes[0])
                    removed_assertions += 1
                continue

            value = safe_scalar(
                values.get(predicate, record.get(predicate, "")),
                f"research assertion {subject_id}.{predicate}",
            )
            if not value:
                raise MigrationError(
                    f"research assertion {subject_id}.{predicate} has no value"
                )
            assert source is not None
            notes = (
                "AI-assisted source review candidate; human editorial approval "
                f"required. Legacy ID: {legacy_by_canonical.get(subject_id, '')}."
            )
            if note:
                notes += f" Source locator and limits: {note}"
            assertion = {
                "id": stable_id(
                    "asrt",
                    subject_type,
                    subject_id,
                    predicate,
                    value,
                    source["id"],
                ),
                "subject_type": subject_type,
                "subject_id": subject_id,
                "predicate": predicate,
                "value": value,
                "source_id": source["id"],
                "evidence_status": evidence,
                "extracted_by": "ai_assisted_research",
                "extractor_run_id": run_id,
                "reviewed_by": "",
                "reviewed_at": "",
                "valid_from": "",
                "valid_to": "",
                "notes": notes,
            }
            if matching_indexes:
                package.tables["assertions.csv"][matching_indexes[0]] = assertion
                reviewed_assertions += 1
            else:
                package.tables["assertions.csv"].append(assertion)
                added_assertions += 1

    assertion_ignored_fields = {
        "id",
        "slug",
        "last_checked_at",
        "provider_profile_confirmed",
    }
    assertions = package.tables["assertions.csv"]
    for entity_id, field_name, value in changed_fields:
        if field_name in assertion_ignored_fields:
            continue
        matching = [
            assertion
            for assertion in assertions
            if assertion["subject_id"] == entity_id
            and assertion["predicate"] == field_name
        ]
        if value and not any(assertion["value"] == value for assertion in matching):
            raise MigrationError(
                f"record override {entity_id}.{field_name} lacks a matching "
                "research assertion"
            )
        if not value and matching:
            raise MigrationError(
                f"blank record override {entity_id}.{field_name} retains an "
                "assertion"
            )

    package.tables["source-register.csv"] = []
    for register_row in review.get("source_register", []):
        unknown_fields = set(register_row).difference(
            TABLE_FIELDS["source-register.csv"]
        )
        if unknown_fields:
            raise MigrationError(
                f"source register row has unsupported fields: "
                f"{sorted(unknown_fields)}"
            )
        package.tables["source-register.csv"].append(
            {
                field_name: safe_scalar(
                    register_row.get(field_name, ""),
                    f"source register {field_name}",
                )
                for field_name in TABLE_FIELDS["source-register.csv"]
            }
        )

    if review.get("prune_unused_sources", False):
        used_source_ids = {
            assertion["source_id"] for assertion in package.tables["assertions.csv"]
        }
        package.sources_by_url = {
            url: source
            for url, source in package.sources_by_url.items()
            if source["id"] in used_source_ids
        }

    for warning_name in (
        "source_metadata_requires_completion",
        "source_retrieval_date_inferred",
        "source_publisher_derived_from_domain",
    ):
        package.warnings.pop(warning_name, None)
    for source in package.sources_by_url.values():
        if source["title"].startswith("Editorial review required"):
            package.warnings["source_metadata_requires_completion"] += 1
        if "provisionally mapped" in source["notes"]:
            package.warnings["source_retrieval_date_inferred"] += 1
        if (
            source["title"].startswith("Editorial review required")
            and domain_for_url(source["url"]) not in config["source_domains"]
        ):
            package.warnings["source_publisher_derived_from_domain"] += 1

    package.research_summary = {
        "status": review["status"],
        "run_id": run_id,
        "researched_at": researched_at,
        "selected_organisation_ids": review.get(
            "selected_organisation_ids", []
        ),
        "sources_inspected": len(package.sources_by_url),
        "assertions_relinked": reviewed_assertions,
        "assertions_added": added_assertions,
        "assertions_removed": removed_assertions,
        "record_changes": len(package.tables["changes.csv"]),
        "unresolved_items": review.get("unresolved_items", []),
    }


def transform_rows(
    sheets: dict[str, list[dict[str, str]]],
    config: dict,
    selected_organisation_ids: set[str] | None = None,
) -> CandidatePackage:
    package = CandidatePackage()
    organisations_source = sheets["Organisations"]
    products_source = sheets["Products"]
    deployments_source = sheets["Deployments"]

    if selected_organisation_ids is None:
        selected_organisation_ids = {
            row["Org_ID"] for row in organisations_source if row.get("Org_ID")
        }

    known_organisations = {
        row["Org_ID"]: row
        for row in organisations_source
        if row.get("Org_ID") in selected_organisation_ids
    }
    unknown_selected = selected_organisation_ids.difference(known_organisations)
    if unknown_selected:
        raise MigrationError(
            f"selected organisation IDs not found: {sorted(unknown_selected)}"
        )

    for row in organisations_source:
        legacy_id = row.get("Org_ID", "")
        if legacy_id not in selected_organisation_ids:
            continue
        canonical = canonical_id(legacy_id)
        origin_country, origin_flags = country_code(
            row.get("Origin_Country", ""), config, allow_composite=True
        )
        headquarters_country, hq_flags = country_code(
            row.get("HQ_Country", ""), config, allow_composite=True
        )
        record_flags = sorted(set(origin_flags + hq_flags))
        record = {
            "id": canonical,
            "name": safe_scalar(row.get("Organisation", ""), "organisation name"),
            "slug": slug(row.get("Organisation", "")),
            "organisation_type": snake(row.get("Organisation_Type", "")),
            "origin_classification": origin_classification(
                row.get("Africa_Relationship", ""), origin_country
            ),
            "country_of_origin": origin_country,
            "headquarters_country": headquarters_country,
            "lifecycle_status": organisation_lifecycle(row.get("Status", "")),
            "website": safe_scalar(row.get("Website", ""), "organisation website"),
            "description": safe_scalar(
                row.get("Primary_Focus", ""), "organisation description"
            ),
            "provider_profile_confirmed": "false",
            "last_checked_at": row.get("Last_Verified", ""),
        }
        package.tables["organisations.csv"].append(record)
        package.legacy_ids.append(
            {
                "legacy_id": legacy_id,
                "canonical_id": canonical,
                "entity_type": "organisation",
            }
        )
        source = package.add_source(
            row.get("Primary_Source_URL", ""), config, row.get("Last_Verified", "")
        )
        evidence, evidence_flags = evidence_status(
            "", source["independence_class"], "organisation"
        )
        package.record_warnings(record_flags + evidence_flags)
        material_assertions(
            package,
            subject_type="organisation",
            subject_id=canonical,
            legacy_id=legacy_id,
            record=record,
            predicates=[
                "name",
                "organisation_type",
                "origin_classification",
                "country_of_origin",
                "headquarters_country",
                "lifecycle_status",
                "website",
                "description",
            ],
            source=source,
            evidence=evidence,
            flags=record_flags + evidence_flags,
        )

    selected_products: dict[str, dict[str, str]] = {}
    product_source_by_id: dict[str, dict[str, str]] = {}
    for row in products_source:
        legacy_org_id = row.get("Org_ID", "")
        if legacy_org_id not in selected_organisation_ids:
            continue
        legacy_id = row.get("Product_ID", "")
        canonical = canonical_id(legacy_id)
        category = config["category_map"].get(row.get("Primary_Value_Chain", ""), "")
        category_flags = [] if category else ["category_not_mapped"]
        lifecycle, lifecycle_flags = product_lifecycle(
            row.get("Evidence_Status", "")
        )
        source = package.add_source(
            row.get("Source_URL", ""), config, row.get("Last_Verified", "")
        )
        source_domain = domain_for_url(row.get("Source_URL", ""))
        source_is_provider = (
            source["independence_class"] == "provider_authored"
            and source_domain not in {"afd.fr", "digital-energy.eu"}
        )
        product_website = row.get("Source_URL", "") if source_is_provider else ""
        record = {
            "id": canonical,
            "organisation_id": canonical_id(legacy_org_id),
            "name": safe_scalar(row.get("Product_Name", ""), "product name"),
            "slug": slug(row.get("Product_Name", "")),
            "description": safe_scalar(
                row.get("Functions", ""), "product description"
            ),
            "primary_category_id": category,
            "lifecycle_status": lifecycle,
            "access_model": access_model(row.get("Commercial_Model", "")),
            "open_source_url": (
                row.get("Source_URL", "")
                if "github.com" in row.get("Source_URL", "").lower()
                else ""
            ),
            "website": product_website,
            "launched_year": "",
            "last_checked_at": row.get("Last_Verified", ""),
        }
        if (
            record["access_model"] == "open_source"
            and not record["open_source_url"]
        ):
            package.warnings["open_source_repository_not_captured"] += 1
        selected_products[legacy_id] = record
        product_source_by_id[legacy_id] = source
        package.tables["products.csv"].append(record)
        package.legacy_ids.append(
            {
                "legacy_id": legacy_id,
                "canonical_id": canonical,
                "entity_type": "product",
            }
        )
        evidence, evidence_flags = evidence_status(
            row.get("Evidence_Status", ""),
            source["independence_class"],
            "product",
        )
        product_flags = category_flags + lifecycle_flags + evidence_flags
        package.record_warnings(product_flags)
        material_assertions(
            package,
            subject_type="product",
            subject_id=canonical,
            legacy_id=legacy_id,
            record=record,
            predicates=[
                "organisation_id",
                "name",
                "description",
                "primary_category_id",
                "lifecycle_status",
                "access_model",
                "open_source_url",
                "website",
            ],
            source=source,
            evidence=evidence,
            flags=product_flags,
        )
        matched_capabilities = capability_ids(row.get("Functions", ""), config)
        if not matched_capabilities:
            package.warnings["product_without_capability_mapping"] += 1

    for row in deployments_source:
        legacy_org_id = row.get("Org_ID", "")
        legacy_product_id = row.get("Product_ID", "")
        if (
            legacy_org_id not in selected_organisation_ids
            or legacy_product_id not in selected_products
        ):
            continue
        legacy_id = row.get("Deployment_ID", "")
        canonical = canonical_id(legacy_id)
        country, country_flags = country_code(row.get("Country", ""), config)
        source = package.add_source(
            row.get("Source_URL", ""), config, row.get("Last_Verified", "")
        )
        evidence, evidence_flags = evidence_status(
            row.get("Evidence_Level", ""),
            source["independence_class"],
            "deployment",
        )
        if not country:
            product_record = selected_products[legacy_product_id]
            package.add_assertion(
                subject_type="product",
                subject_id=product_record["id"],
                predicate="claimed_availability",
                value=row.get("Country", "") or "unknown",
                source=source,
                evidence=evidence,
                legacy_id=legacy_id,
                flags=country_flags + evidence_flags,
            )
            package.record_warnings(country_flags + evidence_flags)
            package.warnings["deployment_withheld_without_single_country"] += 1
            continue
        customer_name, disclosure = customer_fields(
            row.get("Customer_or_Partner", ""), row.get("Notes", "")
        )
        precision, precision_flags = normalised_precision(
            row.get("Map_Precision", "")
        )
        started_year = row.get("Deployment_Year", "").strip()
        year_flags: list[str] = []
        if started_year and not YEAR_PATTERN.fullmatch(started_year):
            started_year = ""
            year_flags.append("deployment_year_invalid")
        if not started_year:
            year_flags.append("deployment_year_unknown")
        record_flags = (
            country_flags + evidence_flags + precision_flags + year_flags
        )
        package.record_warnings(record_flags)
        record = {
            "id": canonical,
            "product_id": canonical_id(legacy_product_id),
            "country_iso2": country,
            "subnational_area": safe_scalar(
                row.get("City_or_Region", ""), "deployment subnational area"
            ),
            "customer_name": safe_scalar(
                customer_name, "deployment customer name"
            ),
            "customer_disclosure": disclosure,
            "lifecycle_status": deployment_lifecycle(
                row.get("Deployment_Status", "")
            ),
            "started_year": started_year,
            "ended_year": "",
            "location_precision": precision,
            "last_checked_at": row.get("Last_Verified", ""),
        }
        package.tables["deployments.csv"].append(record)
        package.tables["deployment-parties.csv"].append(
            {
                "deployment_id": canonical,
                "organisation_id": canonical_id(legacy_org_id),
                "role": "product_provider",
            }
        )
        package.legacy_ids.append(
            {
                "legacy_id": legacy_id,
                "canonical_id": canonical,
                "entity_type": "deployment",
            }
        )
        material_assertions(
            package,
            subject_type="deployment",
            subject_id=canonical,
            legacy_id=legacy_id,
            record=record,
            predicates=[
                "product_id",
                "country_iso2",
                "subnational_area",
                "customer_name",
                "customer_disclosure",
                "lifecycle_status",
                "started_year",
                "location_precision",
            ],
            source=source,
            evidence=evidence,
            flags=record_flags,
        )

    package.finalise()
    apply_research_review(package, config)
    package.finalise()
    return package


def entity_count(package: CandidatePackage) -> int:
    return sum(
        len(package.tables[filename])
        for filename in (
            "organisations.csv",
            "products.csv",
            "deployments.csv",
            "sources.csv",
        )
    )


def plan_review_batches(
    sheets: dict[str, list[dict[str, str]]], config: dict
) -> list[dict]:
    organisation_ids = [
        row["Org_ID"] for row in sheets["Organisations"] if row.get("Org_ID")
    ]
    max_entities = config["limits"]["max_entities_per_batch"]
    max_assertions = config["limits"]["max_assertions_per_batch"]
    batches: list[dict] = []
    current_ids: list[str] = []

    def package_for(ids: list[str]) -> CandidatePackage:
        return transform_rows(sheets, config, set(ids))

    for organisation_id in organisation_ids:
        candidate_ids = current_ids + [organisation_id]
        candidate = package_for(candidate_ids)
        candidate_entities = entity_count(candidate)
        candidate_assertions = len(candidate.tables["assertions.csv"])
        if current_ids and (
            candidate_entities > max_entities
            or candidate_assertions > max_assertions
        ):
            completed = package_for(current_ids)
            batches.append(
                {
                    "id": f"batch_{len(batches) + 1:03d}",
                    "organisation_ids": list(current_ids),
                    "entity_count": entity_count(completed),
                    "assertion_count": len(completed.tables["assertions.csv"]),
                }
            )
            current_ids = [organisation_id]
        else:
            current_ids = candidate_ids

        single = package_for(current_ids)
        if (
            entity_count(single) > max_entities
            or len(single.tables["assertions.csv"]) > max_assertions
        ):
            raise MigrationError(
                f"{organisation_id}: one organisation group exceeds review limits"
            )

    if current_ids:
        completed = package_for(current_ids)
        batches.append(
            {
                "id": f"batch_{len(batches) + 1:03d}",
                "organisation_ids": list(current_ids),
                "entity_count": entity_count(completed),
                "assertion_count": len(completed.tables["assertions.csv"]),
            }
        )
    return batches


def input_counts(sheets: dict[str, list[dict[str, str]]]) -> dict[str, int]:
    return {sheet: len(rows) for sheet, rows in sorted(sheets.items())}


def write_csv(path: Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=fields,
            extrasaction="raise",
            lineterminator="\n",
        )
        writer.writeheader()
        for row in rows:
            writer.writerow({field: safe_scalar(row.get(field, ""), field) for field in fields})


def write_package(output: Path, package: CandidatePackage, manifest: dict) -> None:
    output.mkdir(parents=True, exist_ok=True)
    for filename, fields in TABLE_FIELDS.items():
        write_csv(output / filename, fields, package.tables[filename])
    write_csv(
        output / "legacy-id-map.csv",
        ["legacy_id", "canonical_id", "entity_type"],
        sorted(package.legacy_ids, key=lambda item: item["canonical_id"]),
    )
    (output / "migration-report.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    ui_bundle = build_ui_bundle(package)
    ui_directory = output / "ui"
    ui_directory.mkdir(exist_ok=True)
    for filename, content in ui_bundle.items():
        (ui_directory / filename).write_text(
            json.dumps(content, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    checksum_paths = sorted(
        path
        for path in output.rglob("*")
        if path.is_file() and path.name != "checksums.txt"
    )
    checksum_lines = [
        f"{sha256_file(path)}  {path.relative_to(output).as_posix()}"
        for path in checksum_paths
    ]
    (output / "checksums.txt").write_text(
        "\n".join(checksum_lines) + "\n", encoding="utf-8"
    )


def build_ui_bundle(
    package: CandidatePackage, status: str = "candidate_only"
) -> dict[str, object]:
    organisations = package.tables["organisations.csv"]
    products = package.tables["products.csv"]
    deployments = package.tables["deployments.csv"]
    assertions = package.tables["assertions.csv"]
    sources = package.tables["sources.csv"]
    organisations_by_id = {item["id"]: item for item in organisations}
    deployments_by_product: dict[str, list[dict]] = defaultdict(list)
    for deployment in deployments:
        deployments_by_product[deployment["product_id"]].append(deployment)
    evidence_by_subject: dict[str, set[str]] = defaultdict(set)
    for assertion in assertions:
        evidence_by_subject[assertion["subject_id"]].add(
            assertion["evidence_status"]
        )
    directory = []
    for product in products:
        product_deployments = deployments_by_product[product["id"]]
        directory.append(
            {
                **product,
                "organisation": organisations_by_id.get(
                    product["organisation_id"], {}
                ).get("name", ""),
                "deployment_countries": sorted(
                    {item["country_iso2"] for item in product_deployments}
                ),
                "evidence_statuses": sorted(evidence_by_subject[product["id"]]),
                "deployment_evidence_statuses": sorted(
                    {
                        status
                        for deployment in product_deployments
                        for status in evidence_by_subject[deployment["id"]]
                    }
                ),
            }
        )
    country_deployments: dict[str, list[dict]] = defaultdict(list)
    for deployment in deployments:
        country_deployments[deployment["country_iso2"]].append(deployment)
    category_counts = Counter(
        product["primary_category_id"] for product in products
    )
    search_index = [
        {
            "id": item["id"],
            "type": entity_type,
            "name": item["name"],
            "context": item.get("description", ""),
        }
        for entity_type, items in (
            ("organisation", organisations),
            ("product", products),
        )
        for item in items
    ]
    return {
        "data-manifest.json": {
            "status": status,
            "counts": {
                "organisations": len(organisations),
                "products": len(products),
                "deployments": len(deployments),
                "sources": len(sources),
                "assertions": len(assertions),
            },
            "files": [
                "organisations.json",
                "products.json",
                "deployments.json",
                "sources.json",
                "assertions.json",
                "directory.json",
                "countries.json",
                "stack-summary.json",
                "search-index.json",
            ],
        },
        "organisations.json": organisations,
        "products.json": products,
        "deployments.json": deployments,
        "sources.json": sources,
        "assertions.json": assertions,
        "directory.json": directory,
        "countries.json": [
            {
                "country_iso2": country,
                "deployment_count": len(country_items),
                "independent_or_customer_count": sum(
                    1
                    for deployment in country_items
                    if evidence_by_subject[deployment["id"]].intersection(
                        {"independently_evidenced", "customer_confirmed"}
                    )
                ),
                "provider_claim_count": sum(
                    1
                    for deployment in country_items
                    if evidence_by_subject[deployment["id"]]
                    == {"provider_claim_only"}
                ),
                "product_count": len(
                    {deployment["product_id"] for deployment in country_items}
                ),
                "category_counts": dict(
                    sorted(
                        Counter(
                            next(
                                product["primary_category_id"]
                                for product in products
                                if product["id"] == deployment["product_id"]
                            )
                            for deployment in country_items
                        ).items()
                    )
                ),
            }
            for country, country_items in sorted(country_deployments.items())
        ],
        "stack-summary.json": [
            {"category_id": category, "product_count": count}
            for category, count in sorted(category_counts.items())
        ],
        "search-index.json": sorted(search_index, key=lambda item: item["name"]),
    }


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
