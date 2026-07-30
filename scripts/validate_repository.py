#!/usr/bin/env python3
"""Validate repository JSON files and CSV template contracts using the stdlib."""

from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")
ISO2_PATTERN = re.compile(r"^[A-Z]{2}$")
YEAR_PATTERN = re.compile(r"^(19|20|21)\d{2}$")
SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")
FORMULA_PREFIX = re.compile(r"^[=+@]|^-(?!\d+(?:\.\d+)?$)")
PRIVATE_HEADER_TOKENS = {
    "email",
    "phone",
    "submitter_name",
    "person_name",
    "personal_contact",
}
SOURCE_INDEPENDENCE = {
    "customer_or_official",
    "independent_primary",
    "independent_secondary",
    "provider_authored",
    "aggregator",
    "community_submission",
}


def load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def validate_json_files(errors: list[str]) -> None:
    for path in sorted(ROOT.rglob("*.json")):
        try:
            load_json(path)
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"{path.relative_to(ROOT)}: invalid JSON: {exc}")


def validate_csv_templates(errors: list[str]) -> None:
    schema_path = ROOT / "schemas" / "tables.json"
    schema = load_json(schema_path)
    template_dir = ROOT / "data" / "templates"

    for filename, definition in schema["tables"].items():
        path = template_dir / filename
        if not path.exists():
            errors.append(f"missing CSV template: {path.relative_to(ROOT)}")
            continue

        with path.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.reader(handle))

        if not rows:
            errors.append(f"{path.relative_to(ROOT)}: empty file")
            continue

        expected = definition["fields"]
        if rows[0] != expected:
            errors.append(
                f"{path.relative_to(ROOT)}: header mismatch\n"
                f"  expected: {expected}\n  actual:   {rows[0]}"
            )

        id_field = definition.get("id_field")
        if not id_field or len(rows) == 1:
            continue

        index = rows[0].index(id_field)
        seen: set[str] = set()
        for line_number, row in enumerate(rows[1:], start=2):
            if len(row) != len(rows[0]):
                errors.append(
                    f"{path.relative_to(ROOT)}:{line_number}: "
                    f"expected {len(rows[0])} columns, found {len(row)}"
                )
                continue
            value = row[index].strip()
            if not value:
                errors.append(
                    f"{path.relative_to(ROOT)}:{line_number}: missing {id_field}"
                )
            elif value in seen:
                errors.append(
                    f"{path.relative_to(ROOT)}:{line_number}: duplicate ID {value}"
                )
            elif not ID_PATTERN.fullmatch(value):
                errors.append(
                    f"{path.relative_to(ROOT)}:{line_number}: invalid ID {value}"
                )
            seen.add(value)

    source_register = ROOT / "data" / "source-register.csv"
    with source_register.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.reader(handle))
    expected_source_header = schema["tables"]["source-register.csv"]["fields"]
    if not rows or rows[0] != expected_source_header:
        errors.append(
            "data/source-register.csv: header does not match "
            "the source-register table contract"
        )


def validate_taxonomy(errors: list[str]) -> None:
    taxonomy = load_json(ROOT / "data" / "taxonomy.json")
    ids: list[str] = []
    for stage in taxonomy["stages"]:
        ids.append(stage["id"])
        ids.extend(category["id"] for category in stage["categories"])
    ids.extend(category["id"] for category in taxonomy["cross_cutting"])

    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    if duplicates:
        errors.append(f"data/taxonomy.json: duplicate IDs: {duplicates}")
    invalid = sorted(value for value in ids if not ID_PATTERN.fullmatch(value))
    if invalid:
        errors.append(f"data/taxonomy.json: invalid IDs: {invalid}")


def csv_records(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def valid_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def valid_iso_date(value: str) -> bool:
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_checksums(package: Path, errors: list[str]) -> None:
    checksum_path = package / "checksums.txt"
    if not checksum_path.exists():
        errors.append(f"{package.relative_to(ROOT)}: missing checksums.txt")
        return
    seen: set[str] = set()
    for line_number, line in enumerate(
        checksum_path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if not line.strip():
            continue
        try:
            expected, relative = line.split("  ", 1)
        except ValueError:
            errors.append(
                f"{checksum_path.relative_to(ROOT)}:{line_number}: malformed checksum"
            )
            continue
        target = package / relative
        if relative in seen:
            errors.append(
                f"{checksum_path.relative_to(ROOT)}:{line_number}: duplicate path {relative}"
            )
            continue
        seen.add(relative)
        if not SHA256_PATTERN.fullmatch(expected):
            errors.append(
                f"{checksum_path.relative_to(ROOT)}:{line_number}: invalid SHA-256"
            )
        elif not target.is_file():
            errors.append(
                f"{checksum_path.relative_to(ROOT)}:{line_number}: missing {relative}"
            )
        elif file_sha256(target) != expected:
            errors.append(
                f"{checksum_path.relative_to(ROOT)}:{line_number}: checksum mismatch for {relative}"
            )
    expected_files = {
        path.relative_to(package).as_posix()
        for path in package.rglob("*")
        if path.is_file() and path.name != "checksums.txt"
    }
    missing = expected_files.difference(seen)
    extra = seen.difference(expected_files)
    if missing:
        errors.append(
            f"{checksum_path.relative_to(ROOT)}: files missing from checksums: {sorted(missing)}"
        )
    if extra:
        errors.append(
            f"{checksum_path.relative_to(ROOT)}: unknown checksum paths: {sorted(extra)}"
        )


def validate_candidate_package(package: Path, errors: list[str]) -> None:
    schema = load_json(ROOT / "schemas" / "tables.json")
    taxonomy = load_json(ROOT / "data" / "taxonomy.json")
    category_ids = {
        category["id"]
        for stage in taxonomy["stages"]
        for category in stage["categories"]
    }
    category_ids.update(category["id"] for category in taxonomy["cross_cutting"])
    origin_values = set(taxonomy["origin_classifications"])
    lifecycle_values = set(taxonomy["lifecycle_statuses"])
    evidence_values = set(taxonomy["evidence_statuses"])
    relative_package = package.relative_to(ROOT)

    tables: dict[str, list[dict[str, str]]] = {}
    for filename, definition in schema["tables"].items():
        path = package / filename
        if not path.exists():
            errors.append(f"{relative_package}: missing {filename}")
            continue
        headers, rows = csv_records(path)
        if headers != definition["fields"]:
            errors.append(
                f"{path.relative_to(ROOT)}: header does not match table contract"
            )
            continue
        unsafe_headers = sorted(
            header for header in headers if header.lower() in PRIVATE_HEADER_TOKENS
        )
        if unsafe_headers:
            errors.append(
                f"{path.relative_to(ROOT)}: private headers prohibited: {unsafe_headers}"
            )
        for line_number, row in enumerate(rows, start=2):
            for field, value in row.items():
                if value and FORMULA_PREFIX.search(value):
                    errors.append(
                        f"{path.relative_to(ROOT)}:{line_number}: formula-like value in {field}"
                    )
        id_field = definition.get("id_field")
        if id_field:
            seen: set[str] = set()
            for line_number, row in enumerate(rows, start=2):
                value = row[id_field]
                if not ID_PATTERN.fullmatch(value):
                    errors.append(
                        f"{path.relative_to(ROOT)}:{line_number}: invalid {id_field} {value!r}"
                    )
                elif value in seen:
                    errors.append(
                        f"{path.relative_to(ROOT)}:{line_number}: duplicate {id_field} {value}"
                    )
                seen.add(value)
        tables[filename] = rows

    required_table_names = set(schema["tables"])
    if set(tables) != required_table_names:
        return

    organisations = {row["id"]: row for row in tables["organisations.csv"]}
    products = {row["id"]: row for row in tables["products.csv"]}
    deployments = {row["id"]: row for row in tables["deployments.csv"]}
    sources = {row["id"]: row for row in tables["sources.csv"]}
    subject_ids = {
        "organisation": set(organisations),
        "product": set(products),
        "deployment": set(deployments),
        "source": set(sources),
    }

    for line_number, row in enumerate(tables["organisations.csv"], start=2):
        if row["origin_classification"] not in origin_values:
            errors.append(
                f"{relative_package}/organisations.csv:{line_number}: invalid origin classification"
            )
        if row["lifecycle_status"] not in lifecycle_values:
            errors.append(
                f"{relative_package}/organisations.csv:{line_number}: invalid lifecycle status"
            )
        for field in ("country_of_origin", "headquarters_country"):
            if row[field] and not ISO2_PATTERN.fullmatch(row[field]):
                errors.append(
                    f"{relative_package}/organisations.csv:{line_number}: invalid {field}"
                )
        if row["website"] and not valid_url(row["website"]):
            errors.append(
                f"{relative_package}/organisations.csv:{line_number}: invalid website"
            )
        if row["last_checked_at"] and not valid_iso_date(row["last_checked_at"]):
            errors.append(
                f"{relative_package}/organisations.csv:{line_number}: invalid last_checked_at"
            )

    for line_number, row in enumerate(tables["products.csv"], start=2):
        if row["organisation_id"] not in organisations:
            errors.append(
                f"{relative_package}/products.csv:{line_number}: unknown organisation_id"
            )
        if row["primary_category_id"] not in category_ids:
            errors.append(
                f"{relative_package}/products.csv:{line_number}: invalid primary_category_id"
            )
        if row["lifecycle_status"] not in lifecycle_values:
            errors.append(
                f"{relative_package}/products.csv:{line_number}: invalid lifecycle status"
            )
        for field in ("website", "open_source_url"):
            if row[field] and not valid_url(row[field]):
                errors.append(
                    f"{relative_package}/products.csv:{line_number}: invalid {field}"
                )
        if row["launched_year"] and not YEAR_PATTERN.fullmatch(row["launched_year"]):
            errors.append(
                f"{relative_package}/products.csv:{line_number}: invalid launched_year"
            )
        if row["last_checked_at"] and not valid_iso_date(row["last_checked_at"]):
            errors.append(
                f"{relative_package}/products.csv:{line_number}: invalid last_checked_at"
            )

    for line_number, row in enumerate(tables["deployments.csv"], start=2):
        if row["product_id"] not in products:
            errors.append(
                f"{relative_package}/deployments.csv:{line_number}: unknown product_id"
            )
        if not ISO2_PATTERN.fullmatch(row["country_iso2"]):
            errors.append(
                f"{relative_package}/deployments.csv:{line_number}: invalid country_iso2"
            )
        if row["customer_disclosure"] not in {
            "named",
            "undisclosed",
            "unknown",
            "confidential",
        }:
            errors.append(
                f"{relative_package}/deployments.csv:{line_number}: invalid customer_disclosure"
            )
        if row["customer_disclosure"] != "named" and row["customer_name"]:
            errors.append(
                f"{relative_package}/deployments.csv:{line_number}: customer name must be blank"
            )
        if row["customer_disclosure"] == "named" and not row["customer_name"]:
            errors.append(
                f"{relative_package}/deployments.csv:{line_number}: named customer missing"
            )
        if row["lifecycle_status"] not in lifecycle_values:
            errors.append(
                f"{relative_package}/deployments.csv:{line_number}: invalid lifecycle status"
            )
        for field in ("started_year", "ended_year"):
            if row[field] and not YEAR_PATTERN.fullmatch(row[field]):
                errors.append(
                    f"{relative_package}/deployments.csv:{line_number}: invalid {field}"
                )
        if row["last_checked_at"] and not valid_iso_date(row["last_checked_at"]):
            errors.append(
                f"{relative_package}/deployments.csv:{line_number}: invalid last_checked_at"
            )

    for line_number, row in enumerate(tables["deployment-parties.csv"], start=2):
        if row["deployment_id"] not in deployments:
            errors.append(
                f"{relative_package}/deployment-parties.csv:{line_number}: unknown deployment_id"
            )
        if row["organisation_id"] not in organisations:
            errors.append(
                f"{relative_package}/deployment-parties.csv:{line_number}: unknown organisation_id"
            )

    for line_number, row in enumerate(tables["sources.csv"], start=2):
        if not valid_url(row["url"]):
            errors.append(
                f"{relative_package}/sources.csv:{line_number}: invalid source URL"
            )
        expected_source_id = (
            "src_"
            + hashlib.sha256(row["url"].encode("utf-8")).hexdigest()[:16]
        )
        if row["id"] != expected_source_id:
            errors.append(
                f"{relative_package}/sources.csv:{line_number}: source ID does "
                "not match its URL"
            )
        if row["independence_class"] not in SOURCE_INDEPENDENCE:
            errors.append(
                f"{relative_package}/sources.csv:{line_number}: invalid independence_class"
            )
        if row["retrieved_at"] and not valid_iso_date(row["retrieved_at"]):
            errors.append(
                f"{relative_package}/sources.csv:{line_number}: invalid retrieved_at"
            )
        if row["publication_date"] and not valid_iso_date(row["publication_date"]):
            errors.append(
                f"{relative_package}/sources.csv:{line_number}: invalid publication_date"
            )

    assertions_by_subject: dict[tuple[str, str], set[str]] = {}
    for line_number, row in enumerate(tables["assertions.csv"], start=2):
        if row["subject_type"] not in subject_ids:
            errors.append(
                f"{relative_package}/assertions.csv:{line_number}: invalid subject_type"
            )
            continue
        if row["subject_id"] not in subject_ids[row["subject_type"]]:
            errors.append(
                f"{relative_package}/assertions.csv:{line_number}: unknown subject_id"
            )
        if row["source_id"] not in sources:
            errors.append(
                f"{relative_package}/assertions.csv:{line_number}: unknown source_id"
            )
            continue
        if row["evidence_status"] not in evidence_values:
            errors.append(
                f"{relative_package}/assertions.csv:{line_number}: invalid evidence_status"
            )
        source = sources[row["source_id"]]
        if (
            source["independence_class"] == "provider_authored"
            and row["evidence_status"]
            in {"independently_evidenced", "customer_confirmed"}
        ):
            errors.append(
                f"{relative_package}/assertions.csv:{line_number}: provider source improperly upgrades evidence"
            )
        assertions_by_subject.setdefault(
            (row["subject_type"], row["subject_id"]), set()
        ).add(row["predicate"])

    required_predicates = {
        "organisation": {"name", "origin_classification"},
        "product": {"name", "organisation_id", "primary_category_id"},
        "deployment": {
            "product_id",
            "country_iso2",
            "customer_disclosure",
            "lifecycle_status",
        },
    }
    for subject_type, ids in subject_ids.items():
        if subject_type not in required_predicates:
            continue
        for subject_id in ids:
            predicates = assertions_by_subject.get((subject_type, subject_id), set())
            missing = required_predicates[subject_type].difference(predicates)
            if missing:
                errors.append(
                    f"{relative_package}: {subject_type} {subject_id} missing assertions {sorted(missing)}"
                )

    report_path = package / "migration-report.json"
    if not report_path.exists():
        errors.append(f"{relative_package}: missing migration-report.json")
    else:
        report = load_json(report_path)
        if report.get("status") != "candidate_only":
            errors.append(f"{report_path.relative_to(ROOT)}: must be candidate_only")
        if report.get("privacy", {}).get("personal_records_emitted") != 0:
            errors.append(
                f"{report_path.relative_to(ROOT)}: personal records must be zero"
            )
        excluded = set(report.get("privacy", {}).get("excluded_sheets", []))
        if not {"People", "Submission_Template"}.issubset(excluded):
            errors.append(
                f"{report_path.relative_to(ROOT)}: required privacy exclusions missing"
            )
        source_hash = report.get("source", {}).get("sha256", "")
        if not SHA256_PATTERN.fullmatch(source_hash):
            errors.append(
                f"{report_path.relative_to(ROOT)}: invalid source SHA-256"
            )
        expected_counts = {
            "organisations": len(organisations),
            "products": len(products),
            "deployments": len(deployments),
            "sources": len(sources),
            "assertions": len(tables["assertions.csv"]),
        }
        for key, value in expected_counts.items():
            if report.get("output_counts", {}).get(key) != value:
                errors.append(
                    f"{report_path.relative_to(ROOT)}: output count mismatch for {key}"
                )
        for batch in report.get("review_batches", []):
            if batch.get("entity_count", 0) > 25:
                errors.append(
                    f"{report_path.relative_to(ROOT)}: batch exceeds 25 entities"
                )
            if batch.get("assertion_count", 0) > 100:
                errors.append(
                    f"{report_path.relative_to(ROOT)}: batch exceeds 100 assertions"
                )
        research_review = report.get("research_review")
        if research_review:
            if (
                research_review.get("status")
                != "ai_researched_human_pending"
            ):
                errors.append(
                    f"{report_path.relative_to(ROOT)}: research review must "
                    "remain human-pending"
                )
            if not SHA256_PATTERN.fullmatch(
                research_review.get("sha256", "")
            ):
                errors.append(
                    f"{report_path.relative_to(ROOT)}: invalid research review "
                    "SHA-256"
                )
            if research_review.get("sources_inspected") != len(sources):
                errors.append(
                    f"{report_path.relative_to(ROOT)}: research source count "
                    "does not reconcile"
                )
            if research_review.get("record_changes") != len(
                tables["changes.csv"]
            ):
                errors.append(
                    f"{report_path.relative_to(ROOT)}: research change count "
                    "does not reconcile"
                )
            research_assertions = [
                row
                for row in tables["assertions.csv"]
                if row["extracted_by"] == "ai_assisted_research"
            ]
            expected_research_assertions = (
                research_review.get("assertions_relinked", 0)
                + research_review.get("assertions_added", 0)
            )
            if len(research_assertions) != expected_research_assertions:
                errors.append(
                    f"{report_path.relative_to(ROOT)}: research assertion count "
                    "does not reconcile"
                )
            if any(
                row["reviewed_by"] or row["reviewed_at"]
                for row in research_assertions
            ):
                errors.append(
                    f"{relative_package}: AI-assisted assertions cannot record "
                    "a human reviewer"
                )
            if any(
                source["title"].startswith("Editorial review required")
                for source in sources.values()
            ):
                errors.append(
                    f"{relative_package}: researched package retains incomplete "
                    "source metadata"
                )

    ui_manifest_path = package / "ui" / "data-manifest.json"
    if not ui_manifest_path.exists():
        errors.append(f"{relative_package}: missing UI data manifest")
    else:
        ui_manifest = load_json(ui_manifest_path)
        if ui_manifest.get("status") != "candidate_only":
            errors.append(
                f"{ui_manifest_path.relative_to(ROOT)}: must be candidate_only"
            )
        expected_counts = {
            "organisations": len(organisations),
            "products": len(products),
            "deployments": len(deployments),
            "sources": len(sources),
            "assertions": len(tables["assertions.csv"]),
        }
        if ui_manifest.get("counts") != expected_counts:
            errors.append(
                f"{ui_manifest_path.relative_to(ROOT)}: UI counts do not reconcile"
            )
        expected_ui_lengths = {
            "organisations.json": len(organisations),
            "products.json": len(products),
            "deployments.json": len(deployments),
            "sources.json": len(sources),
            "assertions.json": len(tables["assertions.csv"]),
        }
        listed_files = set(ui_manifest.get("files", []))
        for filename, expected_length in expected_ui_lengths.items():
            if filename not in listed_files:
                errors.append(
                    f"{ui_manifest_path.relative_to(ROOT)}: missing file listing {filename}"
                )
                continue
            ui_path = package / "ui" / filename
            if not ui_path.exists():
                errors.append(f"{relative_package}: missing UI file {filename}")
                continue
            content = load_json(ui_path)
            if not isinstance(content, list) or len(content) != expected_length:
                errors.append(
                    f"{ui_path.relative_to(ROOT)}: row count does not reconcile"
                )
        for filename in listed_files:
            if not (package / "ui" / filename).exists():
                errors.append(
                    f"{ui_manifest_path.relative_to(ROOT)}: listed UI file missing {filename}"
                )

    prohibited_names = {"people.csv", "submission-contacts.csv", "contacts.csv"}
    found_prohibited = sorted(
        path.name for path in package.rglob("*") if path.name.lower() in prohibited_names
    )
    if found_prohibited:
        errors.append(
            f"{relative_package}: prohibited personal-data files: {found_prohibited}"
        )
    validate_checksums(package, errors)


def validate_candidate_imports(errors: list[str]) -> None:
    imports_root = ROOT / "data" / "imports"
    if not imports_root.exists():
        return
    for package in sorted(imports_root.glob("*/batches/*")):
        if package.is_dir():
            validate_candidate_package(package, errors)
    for audit_path in sorted(imports_root.glob("*/full-audit.json")):
        audit = load_json(audit_path)
        if audit.get("status") != "candidate_only":
            errors.append(f"{audit_path.relative_to(ROOT)}: must be candidate_only")
        if audit.get("privacy", {}).get("personal_records_emitted") != 0:
            errors.append(
                f"{audit_path.relative_to(ROOT)}: personal records must be zero"
            )
        excluded = set(audit.get("privacy", {}).get("excluded_sheets", []))
        if not {"People", "Submission_Template"}.issubset(excluded):
            errors.append(
                f"{audit_path.relative_to(ROOT)}: required privacy exclusions missing"
            )
        for batch in audit.get("review_batches", []):
            if batch.get("entity_count", 0) > 25:
                errors.append(
                    f"{audit_path.relative_to(ROOT)}: batch exceeds 25 entities"
                )
            if batch.get("assertion_count", 0) > 100:
                errors.append(
                    f"{audit_path.relative_to(ROOT)}: batch exceeds 100 assertions"
                )


def main() -> int:
    errors: list[str] = []
    validate_json_files(errors)
    validate_csv_templates(errors)
    validate_taxonomy(errors)
    validate_candidate_imports(errors)

    if errors:
        print("Repository validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Repository validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
