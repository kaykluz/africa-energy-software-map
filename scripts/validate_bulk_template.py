#!/usr/bin/env python3
"""Validate the published bulk-intake workbook structure."""

from __future__ import annotations

import argparse
import json
import sys
import zipfile
from pathlib import Path

try:
    from workbook_migration import MigrationError, XlsxValuesReader
except ModuleNotFoundError:  # Imported as scripts.validate_bulk_template.
    from scripts.workbook_migration import MigrationError, XlsxValuesReader


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TEMPLATE = (
    ROOT
    / "web"
    / "public"
    / "downloads"
    / "templates"
    / "africa-energy-software-map-bulk-import.xlsx"
)
EXPECTED_SHEETS = {
    "Start Here",
    "Bulk Records",
    "Examples",
    "Field Guide",
    "Lists",
}
BULK_FIELDS = [
    "row_key",
    "record_type",
    "organisation_name",
    "existing_organisation_id",
    "organisation_website",
    "organisation_description",
    "country_of_origin",
    "headquarters_country",
    "origin_classification",
    "organisation_lifecycle_status",
    "primary_organisation_role_id",
    "additional_organisation_role_ids",
    "organisation_sector_ids",
    "organisation_segment_ids",
    "organisation_alias",
    "organisation_alias_type",
    "related_organisation_id",
    "organisation_relationship_type",
    "organisation_software_relationship_type",
    "valid_from",
    "valid_to",
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
]


class BulkTemplateError(RuntimeError):
    """Raised when the published bulk workbook is unsafe or incompatible."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=DEFAULT_TEMPLATE)
    return parser.parse_args()


def validate_template(path: Path) -> dict[str, object]:
    if not path.is_file():
        raise BulkTemplateError(f"template is missing: {path}")
    if path.stat().st_size > 2_000_000:
        raise BulkTemplateError("template exceeds the two-megabyte limit")
    try:
        with zipfile.ZipFile(path) as archive:
            if len(archive.infolist()) > 60:
                raise BulkTemplateError("template has an unexpected file count")
            if sum(item.file_size for item in archive.infolist()) > 6_000_000:
                raise BulkTemplateError("template expands beyond the safe limit")
            shared_strings = XlsxValuesReader._shared_strings(archive)
            targets = XlsxValuesReader._sheet_targets(archive)
            if set(targets) != EXPECTED_SHEETS:
                raise BulkTemplateError(
                    f"template sheets differ: {sorted(targets)}"
                )
            rows = XlsxValuesReader._read_sheet(
                archive, targets["Bulk Records"], shared_strings
            )
            if len(rows) < 3:
                raise BulkTemplateError("Bulk Records is missing its header row")
            headers = [str(value).strip() for value in rows[2]]
            if headers != BULK_FIELDS:
                raise BulkTemplateError("Bulk Records headers do not match")
            populated = [
                row
                for row in rows[3:]
                if any(str(value).strip() for value in row)
            ]
            if populated:
                raise BulkTemplateError(
                    "the published template must not contain import rows"
                )
    except (OSError, zipfile.BadZipFile, MigrationError) as exc:
        raise BulkTemplateError(f"cannot validate workbook: {exc}") from exc
    return {
        "status": "valid",
        "sheets": len(EXPECTED_SHEETS),
        "fields": len(BULK_FIELDS),
        "maximum_rows_per_upload": 100,
        "publication_authorised": False,
    }


def main() -> int:
    args = parse_args()
    print(json.dumps(validate_template(args.workbook)))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BulkTemplateError as error:
        print(f"Bulk template validation failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
