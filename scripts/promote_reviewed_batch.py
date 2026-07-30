#!/usr/bin/env python3
"""Prepare an immutable reviewed batch from a private human-review package."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

try:
    from scripts.prepare_review_release import build_release_plan
    from scripts.workbook_migration import (
        CandidatePackage,
        TABLE_FIELDS,
        build_ui_bundle,
        sha256_file,
        stable_id,
        write_csv,
    )
except ModuleNotFoundError:
    from prepare_review_release import build_release_plan
    from workbook_migration import (
        CandidatePackage,
        TABLE_FIELDS,
        build_ui_bundle,
        sha256_file,
        stable_id,
        write_csv,
    )


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = (
    ROOT / "data" / "imports" / "kaykluz-v0.1" / "batches" / "batch-001"
)
DEFAULT_OUTPUT = ROOT / "data" / "releases" / "0.1.0" / "batch-001"
PUBLIC_REVIEWER_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{1,79}$")
SUBJECT_TABLES = {
    "organisation": "organisations.csv",
    "product": "products.csv",
    "deployment": "deployments.csv",
}


class PromotionError(RuntimeError):
    """Raised when reviewed data cannot be promoted safely."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("review_package", type=Path)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--reviewer", required=True)
    parser.add_argument("--version", default="0.1.0")
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    try:
        with path.open(newline="", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))
    except OSError as error:
        raise PromotionError(f"cannot read {path}: {error}") from error


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise PromotionError(f"cannot read {path}: {error}") from error


def normalised_domain(url: str) -> str:
    return urlparse(url).netloc.lower().removeprefix("www.")


def reviewed_date(value: str) -> str:
    if not value:
        raise PromotionError("review decision has no reviewedAt timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise PromotionError(f"invalid reviewedAt timestamp: {value}") from error
    return parsed.date().isoformat()


def public_assertion_note(note: str, amended: bool) -> str:
    cleaned = note.replace(
        "AI-assisted source review candidate; human editorial approval required.",
        "",
    ).replace(
        "Candidate import; human editorial review required.",
        "",
    )
    prefix = "Human reviewed in Batch 001."
    if amended:
        prefix += " Reviewed amendment applied."
    return " ".join(f"{prefix} {cleaned}".split())


def source_snapshot(source: Path, tables: dict[str, list[dict[str, str]]]) -> dict:
    assertions = [
        {
            "id": row["id"],
            "subjectType": row["subject_type"],
            "subjectId": row["subject_id"],
            "predicate": row["predicate"],
            "value": row["value"],
            "sourceId": row["source_id"],
            "evidenceStatus": row["evidence_status"],
        }
        for row in tables["assertions.csv"]
    ]
    sources = [
        {
            "id": row["id"],
            "sourceLicense": row["source_license"],
            "independenceClass": row["independence_class"],
        }
        for row in tables["sources.csv"]
    ]
    return {
        "release": {"sourceBatch": source.relative_to(ROOT).as_posix()},
        "assertions": assertions,
        "sources": sources,
    }


def build_reviewed_release(
    *,
    source: Path,
    package: dict,
    package_hash: str,
    reviewer: str,
    version: str,
) -> tuple[CandidatePackage, dict, dict, list[dict[str, str]]]:
    tables = {
        filename: read_csv(source / filename)
        for filename in TABLE_FIELDS
    }
    snapshot = source_snapshot(source, tables)
    if package.get("batchId") != snapshot["release"]["sourceBatch"]:
        raise PromotionError("review package batch does not match the source batch")
    plan = build_release_plan(snapshot, package)
    if plan["status"] != "ready_for_data_pr":
        raise PromotionError(
            f"review package still has {plan['summary']['blockers']} blockers"
        )

    assertions = {row["id"]: row for row in tables["assertions.csv"]}
    subjects = {
        subject_type: {
            row["id"]: row for row in tables[filename]
        }
        for subject_type, filename in SUBJECT_TABLES.items()
    }
    changes = tables["changes.csv"]
    research_change_count = len(changes)
    kept_assertions: list[dict[str, str]] = []
    for review in sorted(
        package["assertionReviews"], key=lambda item: item["assertionId"]
    ):
        assertion_id = review["assertionId"]
        assertion = assertions[assertion_id]
        decision = review["decision"]
        if decision == "reject":
            changes.append(
                review_change(
                    assertion_id,
                    "assertion",
                    "included",
                    "excluded",
                    reviewed_date(review["reviewedAt"]),
                    reviewer,
                )
            )
            continue
        if decision not in {"accept", "amend"}:
            raise PromotionError(f"{assertion_id}: unsupported release decision")

        old_value = assertion["value"]
        new_value = (
            str(review.get("proposedValue") or old_value)
            if decision == "amend"
            else old_value
        )
        old_evidence = assertion["evidence_status"]
        new_evidence = str(
            review.get("proposedEvidenceStatus") or old_evidence
        )
        assertion["value"] = new_value
        assertion["evidence_status"] = new_evidence
        assertion["reviewed_by"] = reviewer
        assertion["reviewed_at"] = reviewed_date(review["reviewedAt"])
        assertion["notes"] = public_assertion_note(
            assertion["notes"], decision == "amend"
        )
        if new_value != old_value:
            subject = subjects[assertion["subject_type"]][assertion["subject_id"]]
            predicate = assertion["predicate"]
            if predicate not in subject:
                raise PromotionError(
                    f"{assertion_id}: predicate {predicate} is not a material field"
                )
            if subject[predicate] != old_value:
                raise PromotionError(
                    f"{assertion_id}: material value differs from assertion value"
                )
            subject[predicate] = new_value
            changes.append(
                review_change(
                    assertion_id,
                    "value",
                    old_value,
                    new_value,
                    assertion["reviewed_at"],
                    reviewer,
                )
            )
        if new_evidence != old_evidence:
            changes.append(
                review_change(
                    assertion_id,
                    "evidence_status",
                    old_evidence,
                    new_evidence,
                    assertion["reviewed_at"],
                    reviewer,
                )
            )
        kept_assertions.append(assertion)
    tables["assertions.csv"] = sorted(
        kept_assertions, key=lambda item: item["id"]
    )

    sources = {row["id"]: row for row in tables["sources.csv"]}
    reviewed_domains: dict[str, set[str]] = {}
    source_treatments: list[dict[str, str]] = []
    for review in sorted(
        package["sourceReviews"], key=lambda item: item["sourceId"]
    ):
        source_row = sources[review["sourceId"]]
        old_license = source_row["source_license"]
        old_independence = source_row["independence_class"]
        source_row["source_license"] = review["sourceLicense"]
        source_row["independence_class"] = review["independenceClass"]
        source_row["notes"] = (
            f"{source_row['notes']} Rights treatment: factual metadata, attribution "
            "and linking only; source text, imagery and branding are not reused."
        ).strip()
        domain = normalised_domain(source_row["url"])
        reviewed_domains.setdefault(domain, set()).add(
            review["independenceClass"]
        )
        source_treatments.append(
            {
                "sourceId": source_row["id"],
                "rightsStatus": review["rightsStatus"],
                "sourceLicense": review["sourceLicense"],
                "independenceClass": review["independenceClass"],
                "reviewedAt": reviewed_date(review["reviewedAt"]),
            }
        )
        if source_row["source_license"] != old_license:
            changes.append(
                review_change(
                    source_row["id"],
                    "source_license",
                    old_license,
                    source_row["source_license"],
                    reviewed_date(review["reviewedAt"]),
                    reviewer,
                    entity_type="source",
                )
            )
        if source_row["independence_class"] != old_independence:
            changes.append(
                review_change(
                    source_row["id"],
                    "independence_class",
                    old_independence,
                    source_row["independence_class"],
                    reviewed_date(review["reviewedAt"]),
                    reviewer,
                    entity_type="source",
                )
            )

    for record in tables["source-register.csv"]:
        domain = normalised_domain(record["base_url"])
        decisions = reviewed_domains.get(domain)
        if not decisions:
            continue
        if len(decisions) != 1:
            raise PromotionError(
                f"source-register domain {domain} has conflicting independence"
            )
        record["default_independence_class"] = next(iter(decisions))
        record["status"] = "active"
        record["notes"] = (
            f"{record['notes']} Batch 001 rights treatment reviewed "
            f"{package['generatedAt'][:10]}."
        ).strip()

    candidate = CandidatePackage()
    candidate.tables = tables
    candidate.legacy_ids = read_csv(source / "legacy-id-map.csv")
    migration_report = load_json(source / "migration-report.json")
    migration_report["status"] = "reviewed_release"
    if migration_report.get("research_review"):
        migration_report["research_review"][
            "status"
        ] = "ai_researched_human_reviewed"
    migration_report["output_counts"]["assertions"] = len(
        tables["assertions.csv"]
    )
    decision_counts = Counter(
        review["decision"] for review in package["assertionReviews"]
    )
    release_summary = {
        "schemaVersion": "1.0.0",
        "status": "reviewed_release",
        "version": version,
        "sourceBatch": snapshot["release"]["sourceBatch"],
        "reviewBatch": package["batchId"],
        "reviewPackageSha256": package_hash,
        "reviewPackageCommitted": False,
        "publicReviewer": reviewer,
        "completedAt": package["generatedAt"],
        "assertionDecisions": dict(sorted(decision_counts.items())),
        "sourceDecisions": len(package["sourceReviews"]),
        "reviewChangeRecords": len(changes) - research_change_count,
        "sourceTreatments": source_treatments,
        "publicationAuthorised": False,
    }
    migration_report["review_release"] = release_summary
    return candidate, migration_report, release_summary, candidate.legacy_ids


def review_change(
    record_id: str,
    field_name: str,
    old_value: str,
    new_value: str,
    changed_at: str,
    reviewer: str,
    *,
    entity_type: str = "assertion",
) -> dict[str, str]:
    return {
        "id": stable_id(
            "chg",
            "batch_001_human_review",
            entity_type,
            record_id,
            field_name,
            old_value,
            new_value,
        ),
        "entity_type": entity_type,
        "entity_id": record_id,
        "field_name": field_name,
        "old_value": old_value,
        "new_value": new_value,
        "changed_at": changed_at,
        "changed_by": reviewer,
        "review_note": "Human review decision from Batch 001.",
    }


def write_reviewed_release(
    output: Path,
    candidate: CandidatePackage,
    migration_report: dict,
    release_summary: dict,
    legacy_ids: list[dict[str, str]],
) -> None:
    if output.exists():
        raise PromotionError(f"output already exists: {output}")
    output.mkdir(parents=True)
    for filename, fields in TABLE_FIELDS.items():
        write_csv(output / filename, fields, candidate.tables[filename])
    write_csv(
        output / "legacy-id-map.csv",
        ["legacy_id", "canonical_id", "entity_type"],
        legacy_ids,
    )
    (output / "migration-report.json").write_text(
        json.dumps(migration_report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (output / "review-summary.json").write_text(
        json.dumps(release_summary, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (output / "README.md").write_text(
        reviewed_readme(release_summary, candidate),
        encoding="utf-8",
    )
    for source_path, output_name in (
        (ROOT / "DATA-LICENSE.md", "DATA-LICENSE.md"),
        (ROOT / "docs" / "03-data-dictionary.md", "DATA-DICTIONARY.md"),
        (ROOT / "schemas" / "tables.json", "schema.json"),
    ):
        (output / output_name).write_text(
            source_path.read_text(encoding="utf-8").rstrip() + "\n",
            encoding="utf-8",
        )
    ui = output / "ui"
    ui.mkdir()
    for filename, content in build_ui_bundle(
        candidate, status="reviewed_release"
    ).items():
        (ui / filename).write_text(
            json.dumps(content, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    checksum_paths = sorted(
        path
        for path in output.rglob("*")
        if path.is_file() and path.name != "checksums.txt"
    )
    (output / "checksums.txt").write_text(
        "\n".join(
            f"{sha256_file(path)}  {path.relative_to(output).as_posix()}"
            for path in checksum_paths
        )
        + "\n",
        encoding="utf-8",
    )


def reviewed_readme(summary: dict, candidate: CandidatePackage) -> str:
    return f"""# Africa Energy Software Map — {summary['version']}

Status: **reviewed release prepared for independent pull-request approval**

This immutable package applies the completed Batch 001 assertion and source
review. The private review export is not committed; its SHA-256 digest is
recorded in `review-summary.json`.

## Counts

- Organisations: {len(candidate.tables['organisations.csv'])}
- Products: {len(candidate.tables['products.csv'])}
- Deployments: {len(candidate.tables['deployments.csv'])}
- Sources: {len(candidate.tables['sources.csv'])}
- Assertions: {len(candidate.tables['assertions.csv'])}

## Rights and safety

The package contains factual metadata, source URLs and paraphrased locators.
It does not reproduce source articles, imagery, branding, private contacts or
precise infrastructure coordinates. Provider claims remain separate from
independently evidenced deployments.
"""


def main() -> int:
    args = parse_args()
    if not PUBLIC_REVIEWER_PATTERN.fullmatch(args.reviewer):
        raise PromotionError("reviewer must be a public, repository-safe label")
    source = args.source.resolve()
    output = args.output.resolve()
    try:
        source.relative_to(ROOT)
        output.relative_to(ROOT)
    except ValueError as error:
        raise PromotionError("source and output must stay inside the repository") from error
    package_bytes = args.review_package.read_bytes()
    package = json.loads(package_bytes)
    package_hash = hashlib.sha256(package_bytes).hexdigest()
    candidate, report, summary, legacy_ids = build_reviewed_release(
        source=source,
        package=package,
        package_hash=package_hash,
        reviewer=args.reviewer,
        version=args.version,
    )
    write_reviewed_release(
        output, candidate, report, summary, legacy_ids
    )
    print(
        json.dumps(
            {
                "status": "reviewed_release",
                "output": str(output),
                "assertions": len(candidate.tables["assertions.csv"]),
                "sources": len(candidate.tables["sources.csv"]),
                "publication_authorised": False,
            }
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (
        OSError,
        json.JSONDecodeError,
        PromotionError,
        RuntimeError,
        ValueError,
    ) as error:
        print(f"Reviewed release promotion failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
