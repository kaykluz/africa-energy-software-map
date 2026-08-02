#!/usr/bin/env python3
"""Compose independently approved reviewed deltas into one immutable release.

This command performs no editorial promotion. It only combines a reviewed
baseline and checksum-verified reviewed shards, refusing conflicting IDs or an
incomplete shard sequence. Private review-package content is never read; only
its SHA-256 digest and public aggregate decision counts enter the release.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

from workbook_migration import (
    CandidatePackage,
    TABLE_FIELDS,
    build_ui_bundle,
    sha256_file,
    write_csv,
)


ROOT = Path(__file__).resolve().parents[1]
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
LEGACY_ID_FIELDS = ["legacy_id", "canonical_id", "entity_type"]
RELATION_SORT_FIELDS = {
    "product-capabilities.csv": ("product_id", "capability_id", "is_primary"),
    "deployment-parties.csv": ("deployment_id", "organisation_id", "role"),
}


class CompositionError(RuntimeError):
    """Raised when reviewed inputs cannot be composed without interpretation."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--baseline",
        type=Path,
        default=ROOT / "data" / "releases" / "0.1.0" / "batch-001",
    )
    parser.add_argument(
        "--shards",
        type=Path,
        default=ROOT / "data" / "release-shards" / "batch-001",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "data" / "releases" / "0.2.0" / "batch-001",
    )
    parser.add_argument("--version", default="0.2.0")
    parser.add_argument("--release-date", default="2026-08-02")
    parser.add_argument("--reviewer", default="kaykluz")
    parser.add_argument(
        "--review-package-sha256",
        default="e67ec5faaa091d94567dc7bf101fc2b592409b9151ce7e76a71c8d9506c6a0af",
    )
    parser.add_argument("--accepted", type=int, default=1247)
    parser.add_argument("--amended", type=int, default=29)
    parser.add_argument("--expected-shards", type=int, default=13)
    return parser.parse_args()


def read_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise CompositionError(f"cannot read JSON {path}: {error}") from error
    if not isinstance(value, dict):
        raise CompositionError(f"expected a JSON object: {path}")
    return value


def read_csv(path: Path) -> list[dict[str, str]]:
    try:
        with path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            rows = list(reader)
    except OSError as error:
        raise CompositionError(f"cannot read CSV {path}: {error}") from error
    return rows


def repository_path(path: Path, label: str) -> Path:
    resolved = path.resolve()
    try:
        resolved.relative_to(ROOT.resolve())
    except ValueError as error:
        raise CompositionError(f"{label} must stay inside the repository") from error
    return resolved


def verify_checksums(package: Path) -> None:
    checksum_path = package / "checksums.txt"
    if not checksum_path.is_file():
        raise CompositionError(f"missing checksum inventory: {checksum_path}")
    expected: set[str] = set()
    for line_number, line in enumerate(
        checksum_path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if not line.strip():
            continue
        try:
            digest, relative = line.split("  ", 1)
        except ValueError as error:
            raise CompositionError(
                f"malformed checksum at {checksum_path}:{line_number}"
            ) from error
        target = (package / relative).resolve()
        try:
            target.relative_to(package.resolve())
        except ValueError as error:
            raise CompositionError(f"checksum path escapes {package}") from error
        if not target.is_file() or sha256_file(target) != digest:
            raise CompositionError(f"checksum mismatch: {target}")
        expected.add(relative)
    actual = {
        path.relative_to(package).as_posix()
        for path in package.rglob("*")
        if path.is_file() and path.name != "checksums.txt"
    }
    if actual != expected:
        raise CompositionError(f"checksum inventory differs for {package}")


def reviewed_shards(shards_root: Path, expected_count: int) -> list[Path]:
    shards = sorted(path for path in shards_root.glob("release-*") if path.is_dir())
    expected_names = [f"release-{index:03d}" for index in range(1, expected_count + 1)]
    if [path.name for path in shards] != expected_names:
        raise CompositionError(
            "reviewed shard sequence is incomplete; expected " + ", ".join(expected_names)
        )
    return shards


def load_manifests(
    shards: list[Path], review_package_sha256: str
) -> list[dict]:
    manifests: list[dict] = []
    seen_assertions: set[str] = set()
    for shard in shards:
        verify_checksums(shard)
        manifest = read_json(shard / "manifest.json")
        if manifest.get("status") != "reviewed_delta":
            raise CompositionError(f"{shard.name}: not a reviewed delta")
        if manifest.get("shardId") != shard.name:
            raise CompositionError(f"{shard.name}: manifest shard ID differs")
        if manifest.get("reviewPackageSha256") != review_package_sha256:
            raise CompositionError(f"{shard.name}: private package digest differs")
        if manifest.get("reviewPackageCommitted") is not False:
            raise CompositionError(f"{shard.name}: private review package is committed")
        if manifest.get("containsPrivateReviewData") is not False:
            raise CompositionError(f"{shard.name}: private review data boundary failed")
        assertion_ids = set(manifest.get("assertionIds", []))
        if seen_assertions.intersection(assertion_ids):
            raise CompositionError(f"{shard.name}: assertion appears in another shard")
        seen_assertions.update(assertion_ids)
        manifests.append(manifest)
    return manifests


def merge_table(filename: str, packages: list[Path]) -> list[dict[str, str]]:
    fields = TABLE_FIELDS[filename]
    rows: list[dict[str, str]] = []
    for package in packages:
        path = package / filename
        package_rows = read_csv(path)
        if package_rows and list(package_rows[0]) != fields:
            raise CompositionError(f"{path}: header differs from the canonical schema")
        rows.extend(package_rows)

    if "id" in fields:
        by_id: dict[str, dict[str, str]] = {}
        for row in rows:
            row_id = row["id"]
            if not row_id:
                raise CompositionError(f"{filename}: blank ID")
            existing = by_id.get(row_id)
            if existing is not None and existing != row:
                raise CompositionError(f"{filename}: conflicting row for {row_id}")
            by_id[row_id] = row
        return [by_id[row_id] for row_id in sorted(by_id)]

    unique = {tuple(row[field] for field in fields): row for row in rows}
    sort_fields = RELATION_SORT_FIELDS.get(filename, tuple(fields))
    return sorted(unique.values(), key=lambda row: tuple(row[field] for field in sort_fields))


def composition_digest(baseline: Path, shards: list[Path]) -> str:
    digest = hashlib.sha256()
    for path in [baseline / "checksums.txt"] + [
        item for shard in shards for item in (shard / "manifest.json", shard / "checksums.txt")
    ]:
        digest.update(path.relative_to(ROOT).as_posix().encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def source_treatments(sources: list[dict[str, str]], release_date: str) -> list[dict]:
    return [
        {
            "sourceId": source["id"],
            "rightsStatus": "resolved",
            "sourceLicense": source["source_license"],
            "independenceClass": source["independence_class"],
            "reviewedAt": release_date,
        }
        for source in sources
    ]


def write_json(path: Path, value: object) -> None:
    path.write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def write_release(
    *,
    output: Path,
    candidate: CandidatePackage,
    report: dict,
    summary: dict,
    legacy_ids: list[dict[str, str]],
    version: str,
) -> None:
    if output.exists():
        raise CompositionError(f"output already exists: {output}")
    output.mkdir(parents=True)
    for filename, fields in TABLE_FIELDS.items():
        write_csv(output / filename, fields, candidate.tables[filename])
    write_csv(output / "legacy-id-map.csv", LEGACY_ID_FIELDS, legacy_ids)
    write_json(output / "migration-report.json", report)
    write_json(output / "review-summary.json", summary)
    readme = f"""# Africa Energy Software Map — {version}

Status: **reviewed release prepared for independent pull-request approval**

This immutable package composes the first reviewed release and all 13
independently approved Batch 001 release shards. Composition introduces no new
editorial decisions. The private review export is not committed; only its
SHA-256 digest and public aggregate decision counts are recorded.

## Counts

- Organisations: {len(candidate.tables['organisations.csv'])}
- Products: {len(candidate.tables['products.csv'])}
- Deployments: {len(candidate.tables['deployments.csv'])}
- Sources: {len(candidate.tables['sources.csv'])}
- Assertions: {len(candidate.tables['assertions.csv'])}

## Excluded from this release

Eleven candidates remain held for stronger or accessible evidence: Energy
Balance Studio, PLS-CADD, PSCAD, PSS/E, HOMER Pro, Network Manager, PSS SINCAL,
Odyssey Platform, Upya PAYGO, Citiq Prepaid Meter Management System and
PowerFactory.

## Rights and safety

The package contains factual metadata, source URLs and paraphrased locators. It
does not reproduce source articles, imagery, branding, private contacts or
precise infrastructure coordinates. Provider claims remain separate from
independently evidenced deployments.
"""
    (output / "README.md").write_text(readme, encoding="utf-8")
    for source_path, output_name in (
        (ROOT / "DATA-LICENSE.md", "DATA-LICENSE.md"),
        (ROOT / "docs" / "03-data-dictionary.md", "DATA-DICTIONARY.md"),
        (ROOT / "schemas" / "tables.json", "schema.json"),
    ):
        shutil.copyfile(source_path, output / output_name)
    ui = output / "ui"
    ui.mkdir()
    for filename, content in build_ui_bundle(candidate, status="reviewed_release").items():
        write_json(ui / filename, content)
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


def main() -> int:
    args = parse_args()
    baseline = repository_path(args.baseline, "baseline")
    shards_root = repository_path(args.shards, "shards")
    output = repository_path(args.output, "output")
    if not SHA256_PATTERN.fullmatch(args.review_package_sha256):
        raise CompositionError("review package SHA-256 is invalid")
    if args.accepted < 0 or args.amended < 0:
        raise CompositionError("decision counts cannot be negative")
    verify_checksums(baseline)
    baseline_report = read_json(baseline / "migration-report.json")
    if baseline_report.get("status") != "reviewed_release":
        raise CompositionError("baseline is not a reviewed release")
    shards = reviewed_shards(shards_root, args.expected_shards)
    manifests = load_manifests(shards, args.review_package_sha256)

    candidate = CandidatePackage()
    packages = [baseline, *shards]
    candidate.tables = {
        filename: merge_table(filename, packages) for filename in TABLE_FIELDS
    }
    legacy_ids = read_csv(baseline / "legacy-id-map.csv")
    assertion_count = len(candidate.tables["assertions.csv"])
    if args.accepted + args.amended != assertion_count:
        raise CompositionError("aggregate assertion decisions do not match composed rows")
    if any(
        not row["reviewed_by"] or not row["reviewed_at"]
        for row in candidate.tables["assertions.csv"]
    ):
        raise CompositionError("composed release contains an unreviewed assertion")

    counts = {
        "organisations": len(candidate.tables["organisations.csv"]),
        "products": len(candidate.tables["products.csv"]),
        "deployments": len(candidate.tables["deployments.csv"]),
        "sources": len(candidate.tables["sources.csv"]),
        "assertions": assertion_count,
        "people": 0,
        "submissions": len(candidate.tables["submissions.csv"]),
    }
    treatments = source_treatments(
        candidate.tables["sources.csv"], args.release_date
    )
    summary = {
        "schemaVersion": "1.0.0",
        "status": "reviewed_release",
        "version": args.version,
        "sourceBatch": baseline.relative_to(ROOT).as_posix(),
        "reviewBatch": shards_root.relative_to(ROOT).as_posix(),
        "reviewPackageSha256": args.review_package_sha256,
        "reviewPackageCommitted": False,
        "publicReviewer": args.reviewer,
        "completedAt": max(manifest["reviewCompletedAt"] for manifest in manifests),
        "assertionDecisions": {"accept": args.accepted, "amend": args.amended},
        "sourceDecisions": len(treatments),
        "reviewChangeRecords": 36,
        "sourceTreatments": treatments,
        "publicationAuthorised": False,
    }
    review_batches = [
        {
            "id": "baseline-0.1.0",
            "entity_count": 12,
            "assertion_count": 88,
            "source": baseline.relative_to(ROOT).as_posix(),
        }
    ] + [
        {
            "id": manifest["shardId"],
            "entity_count": manifest["entityCount"],
            "assertion_count": manifest["assertionCount"],
            "source": (shards_root / manifest["shardId"]).relative_to(ROOT).as_posix(),
        }
        for manifest in manifests
    ]
    report = {
        "version": "1.0.0",
        "status": "reviewed_release",
        "source": {
            "filename": "reviewed 0.1.0 baseline plus Batch 001 shards 001-013",
            "sha256": composition_digest(baseline, shards),
        },
        "privacy": {
            "excluded_sheets": ["People", "Submission_Template"],
            "personal_records_emitted": 0,
        },
        "input_counts": {
            "reviewed_baseline_assertions": 88,
            "reviewed_shard_assertions": sum(
                manifest["assertionCount"] for manifest in manifests
            ),
            "held_candidates_excluded": 11,
        },
        "output_counts": counts,
        "warnings": {"held_candidates_excluded": 11},
        "review_batches": review_batches,
        "research_review": {
            "status": "ai_researched_human_reviewed",
            "run_id": "batch_001_composed_release_2026_08_02",
            "researched_at": args.release_date,
            "sources_inspected": counts["sources"],
            "assertions_relinked": 88,
            "assertions_added": assertion_count - 88,
            "assertions_removed": 3,
            "record_changes": 36,
            "unresolved_items": [
                "Eleven named candidates remain excluded pending stronger or accessible evidence."
            ],
            "review_file": "private review package; SHA-256 digest only",
            "sha256": args.review_package_sha256,
        },
        "review_release": summary,
    }
    if len(candidate.tables["changes.csv"]) != 72:
        raise CompositionError("expected 72 audited change records")
    write_release(
        output=output,
        candidate=candidate,
        report=report,
        summary=summary,
        legacy_ids=legacy_ids,
        version=args.version,
    )
    print(
        json.dumps(
            {
                "status": "reviewed_release",
                "version": args.version,
                "output": output.relative_to(ROOT).as_posix(),
                "counts": counts,
                "shards": len(manifests),
                "held_candidates_excluded": 11,
                "publication_authorised": False,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (CompositionError, OSError, RuntimeError, ValueError) as error:
        print(f"Reviewed release composition failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
