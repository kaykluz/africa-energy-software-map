#!/usr/bin/env python3
"""Validate repository JSON files and CSV template contracts using the stdlib."""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")


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


def main() -> int:
    errors: list[str] = []
    validate_json_files(errors)
    validate_csv_templates(errors)
    validate_taxonomy(errors)

    if errors:
        print("Repository validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Repository validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
