#!/usr/bin/env python3
"""Migrate the external starter-census workbook into candidate data."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from workbook_migration import (
    MigrationError,
    XlsxValuesReader,
    entity_count,
    input_counts,
    plan_review_batches,
    sha256_file,
    transform_rows,
    write_package,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Create review-only canonical data from the starter census workbook. "
            "The source workbook is never copied into the repository."
        )
    )
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--full-audit-output",
        type=Path,
        help=(
            "Optional path for an aggregate, privacy-safe audit of every eligible "
            "record. No full-record tables are emitted."
        ),
    )
    parser.add_argument(
        "--selected-organisations",
        nargs="+",
        help="Legacy organisation IDs to include. Defaults to the configured pilot.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = json.loads(args.config.read_text(encoding="utf-8"))
    if args.workbook.name != config["source_filename"]:
        raise MigrationError(
            "workbook filename does not match the reviewed import configuration"
        )
    selected = set(
        args.selected_organisations or config["pilot_organisation_ids"]
    )
    sheets = XlsxValuesReader(args.workbook).read(
        set(config["eligible_sheets"])
    )
    package = transform_rows(sheets, config, selected)
    batches = plan_review_batches(sheets, config)
    source_hash = sha256_file(args.workbook)
    max_entities = config["limits"]["max_entities_per_batch"]
    max_assertions = config["limits"]["max_assertions_per_batch"]
    if entity_count(package) > max_entities:
        raise MigrationError("selected package exceeds the entity review limit")
    if len(package.tables["assertions.csv"]) > max_assertions:
        raise MigrationError("selected package exceeds the assertion review limit")

    manifest = {
        "version": config["version"],
        "status": "candidate_only",
        "source": {
            "filename": args.workbook.name,
            "sha256": source_hash,
        },
        "privacy": {
            "excluded_sheets": sorted(config["excluded_sheets"]),
            "personal_records_emitted": 0,
        },
        "input_counts": input_counts(sheets),
        "output_counts": {
            "organisations": len(package.tables["organisations.csv"]),
            "products": len(package.tables["products.csv"]),
            "deployments": len(package.tables["deployments.csv"]),
            "sources": len(package.tables["sources.csv"]),
            "assertions": len(package.tables["assertions.csv"]),
            "people": 0,
            "submissions": 0,
        },
        "warnings": dict(sorted(package.warnings.items())),
        "review_batches": batches,
        "selected_organisation_ids": sorted(selected),
    }
    write_package(args.output, package, manifest)
    full_audit_counts = None
    if args.full_audit_output:
        full_package = transform_rows(sheets, config)
        full_warnings = dict(sorted(full_package.warnings.items()))
        full_warnings["input_deployment_year_blank"] = sum(
            1
            for row in sheets["Deployments"]
            if not row.get("Deployment_Year", "").strip()
        )
        full_warnings["research_queue_not_emitted"] = len(
            sheets["Research_Queue"]
        )
        full_audit_counts = {
            "organisations": len(full_package.tables["organisations.csv"]),
            "products": len(full_package.tables["products.csv"]),
            "deployments": len(full_package.tables["deployments.csv"]),
            "sources": len(full_package.tables["sources.csv"]),
            "assertions": len(full_package.tables["assertions.csv"]),
            "people": 0,
            "submissions": 0,
        }
        full_audit = {
            "version": config["version"],
            "status": "candidate_only",
            "source": {
                "filename": args.workbook.name,
                "sha256": source_hash,
            },
            "privacy": {
                "excluded_sheets": sorted(config["excluded_sheets"]),
                "personal_records_emitted": 0,
            },
            "input_counts": input_counts(sheets),
            "output_counts": full_audit_counts,
            "warnings": full_warnings,
            "review_batches": batches,
        }
        args.full_audit_output.parent.mkdir(parents=True, exist_ok=True)
        args.full_audit_output.write_text(
            json.dumps(full_audit, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    print(
        json.dumps(
            {
                "status": "candidate_only",
                "output": str(args.output),
                "entity_count": entity_count(package),
                "assertion_count": len(package.tables["assertions.csv"]),
                "planned_review_batches": len(batches),
                "warnings": manifest["warnings"],
                "full_audit_counts": full_audit_counts,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
