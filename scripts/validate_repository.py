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
PUBLIC_REVIEWER_PATTERN = re.compile(
    r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{1,79}$"
)
FORMULA_PREFIX = re.compile(r"^[=+@]|^-(?!\d+(?:\.\d+)?$)")
EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
PRIVATE_EDITORIAL_PATTERNS = [
    re.compile(r"\b(?:map|dataset|project) maintainer\b", re.I),
    re.compile(r"\bmaintainer(?:'s)? (?:product|company|organisation)\b", re.I),
    re.compile(r"\b(?:owned|founded|built) by (?:me|the maintainer)\b", re.I),
    re.compile(r"\b(?:i|we) own\b", re.I),
    re.compile(r"\b(?:our|my) (?:company|product|competitor)\b", re.I),
    re.compile(r"\bcompetitor(?: of| to)? (?:the map|maintainer|us|me)\b", re.I),
    re.compile(r"\brecus(?:e|al|ed)\b", re.I),
    re.compile(r"\bconflict of interest\b", re.I),
    re.compile(r"\bnot graded\b", re.I),
    re.compile(r"\bdisclosure:\s", re.I),
]
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
IGNORED_VALIDATION_DIRECTORIES = {
    ".git",
    ".next",
    ".vinext",
    ".wrangler",
    "dist",
    "node_modules",
    "outputs",
    "work",
}


def load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def validate_json_files(errors: list[str]) -> None:
    for path in sorted(ROOT.rglob("*.json")):
        if any(part in IGNORED_VALIDATION_DIRECTORIES for part in path.parts):
            continue
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
    function_ids = [item["id"] for item in taxonomy.get("functions", [])]
    relationship_ids = [
        item["id"] for item in taxonomy.get("energy_relationships", [])
    ]
    ids.extend(function_ids)
    ids.extend(relationship_ids)
    sector_ids = [sector["id"] for sector in taxonomy.get("sectors", [])]
    ids.extend(sector_ids)

    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    if duplicates:
        errors.append(f"data/taxonomy.json: duplicate IDs: {duplicates}")
    invalid = sorted(value for value in ids if not ID_PATTERN.fullmatch(value))
    if invalid:
        errors.append(f"data/taxonomy.json: invalid IDs: {invalid}")
    if len(sector_ids) != 6 or any(
        not value.startswith("sector_") for value in sector_ids
    ):
        errors.append(
            "data/taxonomy.json: exactly six sector IDs are required"
        )
    if len(relationship_ids) != 6 or any(
        not value.startswith(("energy_", "enabling_", "operator_", "public_", "unclassified"))
        for value in relationship_ids
    ):
        errors.append(
            "data/taxonomy.json: exactly six energy relationship IDs are required"
        )
    stage_ids = {stage["id"] for stage in taxonomy["stages"]}
    for function in taxonomy.get("functions", []):
        if any(value not in stage_ids for value in function.get("stageIds", [])):
            errors.append(
                f"data/taxonomy.json: {function.get('id', 'function')} has an invalid stage"
            )

    try:
        from validate_bulk_template import DEFAULT_TEMPLATE, validate_template

        validate_template(DEFAULT_TEMPLATE)
    except (ImportError, OSError, RuntimeError, ValueError) as exc:
        errors.append(f"bulk intake template: {exc}")


def validate_landscape_catalogue(errors: list[str]) -> None:
    landscape_dir = ROOT / "data" / "landscape" / "shards"
    if not landscape_dir.is_dir():
        errors.append("data/landscape/shards: missing landscape catalogue")
        return

    taxonomy = load_json(ROOT / "data" / "taxonomy.json")
    stage_ids = {stage["id"] for stage in taxonomy["stages"]}
    category_ids = {
        category["id"]
        for stage in taxonomy["stages"]
        for category in stage["categories"]
    }
    category_ids.update(item["id"] for item in taxonomy["cross_cutting"])
    sector_ids = {item["id"] for item in taxonomy.get("sectors", [])}
    function_ids = {item["id"] for item in taxonomy.get("functions", [])}
    energy_relationship_ids = {
        item["id"] for item in taxonomy.get("energy_relationships", [])
    }
    allowed_kinds = {
        "organisation",
        "product",
        "public_tool",
        "research_lead",
        "source_directory",
    }
    seen: set[str] = set()
    seen_item_ids: set[str] = set()
    domain_pattern = re.compile(
        r"^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:/[a-z0-9._~!$&'()*+,;=:@%/-]*)?$",
        re.I,
    )
    coordinate_pattern = re.compile(r"-?\d{1,2}\.\d{3,}\s*[,/]\s*-?\d{1,3}\.\d{3,}")

    def contains_private_editorial_metadata(value: object) -> bool:
        if isinstance(value, dict):
            return any(contains_private_editorial_metadata(item) for item in value.values())
        if isinstance(value, list):
            return any(contains_private_editorial_metadata(item) for item in value)
        return isinstance(value, str) and any(
            pattern.search(value) for pattern in PRIVATE_EDITORIAL_PATTERNS
        )

    for path in sorted(landscape_dir.glob("*.json")):
        relative = path.relative_to(ROOT)
        shard = load_json(path)
        if shard.get("schemaVersion") != "1.0.0":
            errors.append(f"{relative}: unsupported schemaVersion")
        if contains_private_editorial_metadata(shard):
            errors.append(f"{relative}: private editorial metadata is prohibited")
        try:
            date.fromisoformat(shard.get("sourceAsOf", ""))
        except ValueError:
            errors.append(f"{relative}: invalid sourceAsOf")

        groups = [
            ("items", shard.get("items", []), "land_"),
            ("deploymentLeads", shard.get("deploymentLeads", []), "land_dep_"),
            ("relationships", shard.get("relationships", []), "land_rel_"),
        ]
        total = sum(len(rows) for _, rows, _ in groups if isinstance(rows, list))
        if total > 25:
            errors.append(f"{relative}: exceeds the 25-record shard limit")

        for group_name, rows, prefix in groups:
            if not isinstance(rows, list):
                errors.append(f"{relative}: {group_name} must be an array")
                continue
            for index, row in enumerate(rows, start=1):
                label = f"{relative}:{group_name}[{index}]"
                record_id = row.get("id", "")
                if not record_id.startswith(prefix) or not ID_PATTERN.fullmatch(record_id):
                    errors.append(f"{label}: invalid ID")
                elif record_id in seen:
                    errors.append(f"{label}: duplicate ID {record_id}")
                seen.add(record_id)
                if group_name == "items":
                    seen_item_ids.add(record_id)
                if not row.get("name", "").strip():
                    errors.append(f"{label}: missing name")
                domains = row.get("sourceDomains", [])
                if not isinstance(domains, list) or any(
                    not domain_pattern.fullmatch(value) for value in domains
                ):
                    errors.append(f"{label}: invalid source domain")
                if coordinate_pattern.search(json.dumps(row)):
                    errors.append(f"{label}: precise coordinates are prohibited")
                source_urls = row.get("sourceUrls", [])
                if not isinstance(source_urls, list) or any(
                    not valid_url(value) for value in source_urls
                ):
                    errors.append(f"{label}: invalid source URL")

                if group_name != "items":
                    continue
                if row.get("kind") not in allowed_kinds:
                    errors.append(f"{label}: invalid listing kind")
                website = row.get("websiteAsSubmitted", "")
                if website and not valid_url(website):
                    errors.append(f"{label}: invalid submitted website")
                as_of_date = row.get("asOfDate", "")
                if as_of_date and not valid_iso_date(as_of_date):
                    errors.append(f"{label}: invalid as-of date")
                africa_use = row.get("africaUseAsSubmitted", "")
                if africa_use and africa_use not in {
                    "confirmed_deployment",
                    "marketed_to_africa",
                    "africa_usage_likely_unverified",
                    "no_africa_evidence_found",
                }:
                    errors.append(f"{label}: invalid Africa-use value")
                if any(value not in stage_ids for value in row.get("stageIds", [])):
                    errors.append(f"{label}: invalid stage ID")
                if any(value not in category_ids for value in row.get("categoryIds", [])):
                    errors.append(f"{label}: invalid category ID")
                if any(value not in sector_ids for value in row.get("sectorIds", [])):
                    errors.append(f"{label}: invalid sector ID")
                if "evidenceStatus" in row or "verified" in row:
                    errors.append(f"{label}: a listing cannot carry a verification verdict")
                canonical = row.get("canonicalHref", "")
                if canonical and not canonical.startswith("/"):
                    errors.append(f"{label}: canonicalHref must be repository-relative")

    classification_path = landscape_dir.parent / "classifications.json"
    if not classification_path.exists():
        errors.append("data/landscape/classifications.json: missing classification overlay")
        return
    classifications = load_json(classification_path)
    if classifications.get("schemaVersion") != "1.0.0":
        errors.append("data/landscape/classifications.json: unsupported schemaVersion")
    rows = classifications.get("items", [])
    if not isinstance(rows, list):
        errors.append("data/landscape/classifications.json: items must be an array")
        return
    classified_ids: list[str] = []
    for index, row in enumerate(rows, start=1):
        label = f"data/landscape/classifications.json:items[{index}]"
        item_id = row.get("itemId", "")
        classified_ids.append(item_id)
        if row.get("energyRelationship") not in energy_relationship_ids:
            errors.append(f"{label}: invalid energy relationship")
        functions = row.get("functionIds", [])
        if not isinstance(functions, list) or any(
            value not in function_ids for value in functions
        ):
            errors.append(f"{label}: invalid function ID")
        if len(functions) != len(set(functions)):
            errors.append(f"{label}: duplicate function ID")
        logo_path = row.get("logoPath", "")
        if logo_path and not re.fullmatch(r"/logos/[a-z0-9_./-]+", logo_path):
            errors.append(f"{label}: invalid logo path")
        logo_source = row.get("logoSourceUrl", "")
        if logo_source and not valid_url(logo_source):
            errors.append(f"{label}: invalid logo source URL")
        if bool(logo_path) != bool(logo_source):
            errors.append(f"{label}: logo path and official source URL must appear together")
        if logo_path and not (ROOT / "web" / "public" / logo_path.lstrip("/")).is_file():
            errors.append(f"{label}: logo asset is missing")
    duplicate_classifications = sorted(
        {value for value in classified_ids if classified_ids.count(value) > 1}
    )
    if duplicate_classifications:
        errors.append(
            "data/landscape/classifications.json: duplicate item IDs: "
            f"{duplicate_classifications}"
        )
    missing = sorted(seen_item_ids - set(classified_ids))
    extra = sorted(set(classified_ids) - seen_item_ids)
    if missing:
        errors.append(
            f"data/landscape/classifications.json: missing {len(missing)} listing classifications"
        )
    if extra:
        errors.append(
            f"data/landscape/classifications.json: {len(extra)} unknown listing classifications"
        )


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


def validate_data_package(
    package: Path,
    errors: list[str],
    expected_status: str = "candidate_only",
) -> None:
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

    report: dict = {}
    report_path = package / "migration-report.json"
    if not report_path.exists():
        errors.append(f"{relative_package}: missing migration-report.json")
    else:
        report = load_json(report_path)
        if report.get("status") != expected_status:
            errors.append(
                f"{report_path.relative_to(ROOT)}: must be {expected_status}"
            )
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
            expected_research_status = (
                "ai_researched_human_reviewed"
                if expected_status == "reviewed_release"
                else "ai_researched_human_pending"
            )
            if (
                research_review.get("status")
                != expected_research_status
            ):
                errors.append(
                    f"{report_path.relative_to(ROOT)}: research review must be "
                    f"{expected_research_status}"
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
            review_change_count = (
                report.get("review_release", {}).get(
                    "reviewChangeRecords", 0
                )
                if expected_status == "reviewed_release"
                else 0
            )
            if (
                research_review.get("record_changes", 0)
                + review_change_count
                != len(tables["changes.csv"])
            ):
                errors.append(
                    f"{report_path.relative_to(ROOT)}: change counts "
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
            if expected_status == "candidate_only" and any(
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
        if ui_manifest.get("status") != expected_status:
            errors.append(
                f"{ui_manifest_path.relative_to(ROOT)}: must be {expected_status}"
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

    if expected_status == "reviewed_release":
        if any(
            not row["reviewed_by"] or not row["reviewed_at"]
            for row in tables["assertions.csv"]
        ):
            errors.append(
                f"{relative_package}: every reviewed assertion needs reviewer and date"
            )
        if any(
            source["source_license"].strip().lower() in {"", "unknown"}
            for source in sources.values()
        ):
            errors.append(
                f"{relative_package}: reviewed release has unresolved source rights"
            )
        summary_path = package / "review-summary.json"
        if not summary_path.exists():
            errors.append(f"{relative_package}: missing review-summary.json")
        else:
            summary = load_json(summary_path)
            decision_counts = summary.get("assertionDecisions", {})
            decision_total = (
                sum(decision_counts.values())
                if isinstance(decision_counts, dict)
                and all(
                    isinstance(value, int) and value >= 0
                    for value in decision_counts.values()
                )
                else -1
            )
            expected_decisions = (
                research_review.get("assertions_relinked", 0)
                + research_review.get("assertions_added", 0)
                if research_review
                else len(tables["assertions.csv"])
            )
            treatments = summary.get("sourceTreatments", [])
            if (
                summary.get("status") != "reviewed_release"
                or summary.get("publicationAuthorised") is not False
                or not SHA256_PATTERN.fullmatch(
                    summary.get("reviewPackageSha256", "")
                )
                or summary.get("reviewPackageCommitted") is not False
                or not PUBLIC_REVIEWER_PATTERN.fullmatch(
                    summary.get("publicReviewer", "")
                )
                or decision_total != expected_decisions
                or not isinstance(treatments, list)
                or summary.get("sourceDecisions") != len(treatments)
                or any(
                    treatment.get("rightsStatus") != "resolved"
                    for treatment in treatments
                )
                or not isinstance(summary.get("reviewChangeRecords"), int)
                or summary["reviewChangeRecords"] < 0
            ):
                errors.append(
                    f"{summary_path.relative_to(ROOT)}: invalid reviewed-release boundary"
                )
            report_summary = report.get("review_release", {})
            if report_summary != summary:
                errors.append(
                    f"{report_path.relative_to(ROOT)}: review summary differs"
                )


def validate_candidate_imports(errors: list[str]) -> None:
    imports_root = ROOT / "data" / "imports"
    if not imports_root.exists():
        return
    for package in sorted(imports_root.glob("*/batches/*")):
        if package.is_dir():
            validate_data_package(package, errors)
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


def validate_reviewed_releases(errors: list[str]) -> None:
    releases_root = ROOT / "data" / "releases"
    if not releases_root.exists():
        return
    for package in sorted(releases_root.glob("*/batch-*")):
        if package.is_dir():
            validate_data_package(
                package, errors, expected_status="reviewed_release"
            )


def validate_release_shards(errors: list[str]) -> None:
    shards_root = ROOT / "data" / "release-shards"
    if not shards_root.exists():
        return
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
    shard_paths = sorted(shards_root.glob("*/release-*"))
    packages: list[tuple[Path, dict[str, list[dict[str, str]]], dict]] = []
    global_subjects: dict[str, set[str]] = {
        "organisation": set(),
        "product": set(),
        "deployment": set(),
    }
    global_sources: set[str] = set()

    for release_path in sorted((ROOT / "data" / "releases").glob("*/batch-*")):
        if not release_path.is_dir():
            continue
        for subject_type, filename in (
            ("organisation", "organisations.csv"),
            ("product", "products.csv"),
            ("deployment", "deployments.csv"),
        ):
            if (release_path / filename).exists():
                global_subjects[subject_type].update(
                    row["id"] for row in csv_records(release_path / filename)[1]
                )
        if (release_path / "sources.csv").exists():
            global_sources.update(
                row["id"] for row in csv_records(release_path / "sources.csv")[1]
            )

    for package in shard_paths:
        if not package.is_dir():
            continue
        relative = package.relative_to(ROOT)
        tables: dict[str, list[dict[str, str]]] = {}
        for filename, definition in schema["tables"].items():
            path = package / filename
            if not path.exists():
                errors.append(f"{relative}: missing {filename}")
                continue
            headers, rows = csv_records(path)
            if headers != definition["fields"]:
                errors.append(f"{path.relative_to(ROOT)}: header mismatch")
                continue
            if any(header.lower() in PRIVATE_HEADER_TOKENS for header in headers):
                errors.append(f"{path.relative_to(ROOT)}: private header prohibited")
            id_field = definition.get("id_field")
            if id_field:
                ids = [row[id_field] for row in rows]
                if len(ids) != len(set(ids)):
                    errors.append(f"{path.relative_to(ROOT)}: duplicate IDs")
                for value in ids:
                    if not ID_PATTERN.fullmatch(value):
                        errors.append(
                            f"{path.relative_to(ROOT)}: invalid ID {value!r}"
                        )
            tables[filename] = rows
        if set(tables) != set(schema["tables"]):
            continue
        manifest_path = package / "manifest.json"
        readme_path = package / "README.md"
        if not manifest_path.exists() or not readme_path.exists():
            errors.append(f"{relative}: manifest.json and README.md are required")
            continue
        manifest = load_json(manifest_path)
        if (
            manifest.get("status") != "reviewed_delta"
            or manifest.get("publicationAuthorised") is not False
            or manifest.get("reviewPackageCommitted") is not False
            or manifest.get("containsPrivateReviewData") is not False
            or not SHA256_PATTERN.fullmatch(
                str(manifest.get("reviewPackageSha256") or "")
            )
            or not PUBLIC_REVIEWER_PATTERN.fullmatch(
                str(manifest.get("publicReviewer") or "")
            )
        ):
            errors.append(f"{manifest_path.relative_to(ROOT)}: unsafe shard boundary")
        organisations = tables["organisations.csv"]
        products = tables["products.csv"]
        deployments = tables["deployments.csv"]
        sources = tables["sources.csv"]
        assertions = tables["assertions.csv"]
        entity_ids = sorted(
            [row["id"] for row in organisations]
            + [row["id"] for row in products]
            + [row["id"] for row in deployments]
        )
        if (
            manifest.get("entityCount") != len(entity_ids)
            or manifest.get("assertionCount") != len(assertions)
            or manifest.get("sourceCount") != len(sources)
            or manifest.get("entityIds") != entity_ids
            or manifest.get("assertionIds")
            != sorted(row["id"] for row in assertions)
            or manifest.get("sourceIds") != sorted(row["id"] for row in sources)
        ):
            errors.append(f"{manifest_path.relative_to(ROOT)}: counts or IDs differ")
        if len(entity_ids) > 25 or len(assertions) > 100:
            errors.append(f"{relative}: exceeds pull-request limits")
        text = "\n".join(
            path.read_text(encoding="utf-8")
            for path in package.rglob("*")
            if path.is_file()
        )
        if EMAIL_PATTERN.search(text) or "reviewerEmail" in text:
            errors.append(f"{relative}: contains private reviewer information")
        global_subjects["organisation"].update(row["id"] for row in organisations)
        global_subjects["product"].update(row["id"] for row in products)
        global_subjects["deployment"].update(row["id"] for row in deployments)
        global_sources.update(row["id"] for row in sources)
        packages.append((package, tables, manifest))
        validate_checksums(package, errors)

    for package, tables, _manifest in packages:
        relative = package.relative_to(ROOT)
        for line_number, row in enumerate(tables["organisations.csv"], start=2):
            if row["origin_classification"] not in origin_values:
                errors.append(
                    f"{relative}/organisations.csv:{line_number}: invalid origin"
                )
            if row["lifecycle_status"] not in lifecycle_values:
                errors.append(
                    f"{relative}/organisations.csv:{line_number}: invalid lifecycle"
                )
        for line_number, row in enumerate(tables["products.csv"], start=2):
            if row["organisation_id"] not in global_subjects["organisation"]:
                errors.append(
                    f"{relative}/products.csv:{line_number}: unknown organisation"
                )
            if row["primary_category_id"] not in category_ids:
                errors.append(
                    f"{relative}/products.csv:{line_number}: invalid category"
                )
            if row["lifecycle_status"] not in lifecycle_values:
                errors.append(
                    f"{relative}/products.csv:{line_number}: invalid lifecycle"
                )
        for line_number, row in enumerate(tables["deployments.csv"], start=2):
            if row["product_id"] not in global_subjects["product"]:
                errors.append(
                    f"{relative}/deployments.csv:{line_number}: unknown product"
                )
            if not ISO2_PATTERN.fullmatch(row["country_iso2"]):
                errors.append(
                    f"{relative}/deployments.csv:{line_number}: invalid country"
                )
            if row["lifecycle_status"] not in lifecycle_values:
                errors.append(
                    f"{relative}/deployments.csv:{line_number}: invalid lifecycle"
                )
        source_independence: dict[str, str] = {}
        for line_number, row in enumerate(tables["sources.csv"], start=2):
            expected_id = "src_" + hashlib.sha256(
                row["url"].encode("utf-8")
            ).hexdigest()[:16]
            if row["id"] != expected_id or not valid_url(row["url"]):
                errors.append(f"{relative}/sources.csv:{line_number}: invalid source")
            if row["source_license"].strip().lower() in {"", "unknown"}:
                errors.append(
                    f"{relative}/sources.csv:{line_number}: unresolved rights"
                )
            if row["independence_class"] not in SOURCE_INDEPENDENCE:
                errors.append(
                    f"{relative}/sources.csv:{line_number}: invalid independence"
                )
            source_independence[row["id"]] = row["independence_class"]
        for line_number, row in enumerate(tables["assertions.csv"], start=2):
            if row["subject_type"] not in global_subjects or row["subject_id"] not in global_subjects[row["subject_type"]]:
                errors.append(
                    f"{relative}/assertions.csv:{line_number}: unknown subject"
                )
            if row["source_id"] not in global_sources:
                errors.append(
                    f"{relative}/assertions.csv:{line_number}: unknown source"
                )
            if row["evidence_status"] not in evidence_values:
                errors.append(
                    f"{relative}/assertions.csv:{line_number}: invalid evidence"
                )
            if not row["reviewed_by"] or not valid_iso_date(row["reviewed_at"]):
                errors.append(
                    f"{relative}/assertions.csv:{line_number}: review missing"
                )
            if source_independence.get(row["source_id"]) == "provider_authored" and row["evidence_status"] in {"independently_evidenced", "customer_confirmed"}:
                errors.append(
                    f"{relative}/assertions.csv:{line_number}: provider evidence upgraded"
                )


def validate_interface_artifacts(errors: list[str]) -> None:
    try:
        from build_registry_snapshot import SnapshotError, check_artifacts

        check_artifacts()
    except (ImportError, OSError, SnapshotError, ValueError) as exc:
        errors.append(f"generated interface artifacts: {exc}")


def validate_automation_artifacts(errors: list[str]) -> None:
    try:
        from build_review_assist import (
            DEFAULT_OUTPUT as review_output,
            DEFAULT_SNAPSHOT,
            build_review_assist,
        )
        from prepare_next_batch import (
            DEFAULT_AUDIT,
            DEFAULT_OUTPUT as batch_output,
            build_plan,
        )

        snapshot = load_json(DEFAULT_SNAPSHOT)
        committed_review = load_json(review_output)
        expected_review = build_review_assist(snapshot)
        if committed_review != expected_review:
            errors.append(
                "web/generated/review-assist.json: differs from generated preparation"
            )
        if (
            committed_review.get("status") != "proposal_only"
            or committed_review.get("publicationAuthorised") is not False
        ):
            errors.append(
                "web/generated/review-assist.json: must remain proposal-only"
            )
        if any(
            item.get("automationCanDecide") is not False
            or item.get("recommendedAction")
            not in {"editorial_review", "request_evidence"}
            for item in committed_review.get("assertions", [])
        ):
            errors.append(
                "web/generated/review-assist.json: automation cannot decide assertions"
            )

        audit = load_json(DEFAULT_AUDIT)
        committed_batch = load_json(batch_output)
        expected_batch = build_plan(audit, "batch_001")
        if committed_batch != expected_batch:
            errors.append(
                "data/research-queue/batch-002-plan.json: differs from generated plan"
            )
        if (
            committed_batch.get("status") != "planned_candidate_only"
            or committed_batch.get("publicationAuthorised") is not False
        ):
            errors.append(
                "data/research-queue/batch-002-plan.json: must remain candidate-only"
            )

        agent_config = load_json(ROOT / "agent" / "config" / "agent.json")
        if (
            agent_config.get("mode") != "dry_run"
            or agent_config.get("external_research_enabled") is not False
            or agent_config.get("publication_enabled") is not False
            or agent_config.get("human_review_required") is not True
        ):
            errors.append(
                "agent/config/agent.json: unsafe automation activation state"
            )
    except (ImportError, OSError, ValueError, RuntimeError) as exc:
        errors.append(f"automation artifacts: {exc}")


def main() -> int:
    errors: list[str] = []
    validate_json_files(errors)
    validate_csv_templates(errors)
    validate_taxonomy(errors)
    validate_landscape_catalogue(errors)
    validate_candidate_imports(errors)
    validate_reviewed_releases(errors)
    validate_release_shards(errors)
    validate_interface_artifacts(errors)
    validate_automation_artifacts(errors)

    if errors:
        print("Repository validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Repository validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
