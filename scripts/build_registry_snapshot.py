#!/usr/bin/env python3
"""Build the deterministic web snapshot and candidate download package."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import sys
import zipfile
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "data" / "interface-snapshot.json"
EVIDENCE_PRIORITY = {
    "customer_confirmed": 0,
    "independently_evidenced": 1,
    "public_source": 2,
    "provider_claim_only": 3,
}
CSV_TABLES = (
    "organisations.csv",
    "products.csv",
    "capabilities.csv",
    "product-capabilities.csv",
    "deployments.csv",
    "deployment-parties.csv",
    "sources.csv",
    "assertions.csv",
    "submissions.csv",
    "changes.csv",
    "source-register.csv",
)


class SnapshotError(RuntimeError):
    """Raised when the snapshot cannot be generated safely."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument(
        "--check",
        action="store_true",
        help="fail when committed snapshot or downloads differ from generated output",
    )
    return parser.parse_args()


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SnapshotError(f"cannot read JSON {path}: {exc}") from exc


def repository_path(value: str, field_name: str) -> Path:
    path = (ROOT / value).resolve()
    try:
        path.relative_to(ROOT.resolve())
    except ValueError as exc:
        raise SnapshotError(f"{field_name} must stay inside the repository") from exc
    return path


def csv_rows(path: Path) -> list[dict[str, str]]:
    try:
        with path.open(newline="", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))
    except OSError as exc:
        raise SnapshotError(f"cannot read CSV {path}: {exc}") from exc


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def json_bytes(value: object) -> bytes:
    return (
        json.dumps(value, indent=2, ensure_ascii=False, sort_keys=False) + "\n"
    ).encode("utf-8")


def verify_package_checksums(batch: Path) -> None:
    checksum_path = batch / "checksums.txt"
    if not checksum_path.is_file():
        raise SnapshotError(f"missing batch checksums: {checksum_path}")
    expected_paths: set[str] = set()
    for line_number, line in enumerate(
        checksum_path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if not line.strip():
            continue
        try:
            expected_hash, relative = line.split("  ", 1)
        except ValueError as exc:
            raise SnapshotError(
                f"malformed checksum at {checksum_path}:{line_number}"
            ) from exc
        target = (batch / relative).resolve()
        try:
            target.relative_to(batch.resolve())
        except ValueError as exc:
            raise SnapshotError("batch checksum path escapes the batch") from exc
        if not target.is_file():
            raise SnapshotError(f"batch checksum target is missing: {relative}")
        if sha256_file(target) != expected_hash:
            raise SnapshotError(f"batch checksum mismatch: {relative}")
        expected_paths.add(relative)
    actual_paths = {
        path.relative_to(batch).as_posix()
        for path in batch.rglob("*")
        if path.is_file() and path.name != "checksums.txt"
    }
    if expected_paths != actual_paths:
        missing = sorted(actual_paths - expected_paths)
        extra = sorted(expected_paths - actual_paths)
        raise SnapshotError(
            f"batch checksum inventory differs; missing={missing}, extra={extra}"
        )


def build_snapshot(config_path: Path = DEFAULT_CONFIG) -> dict[str, object]:
    config = load_json(config_path)
    batch = repository_path(config["source_batch"], "source_batch")
    taxonomy = load_json(repository_path(config["taxonomy"], "taxonomy"))
    countries = load_json(repository_path(config["countries"], "countries"))
    presentation = load_json(
        repository_path(config["presentation"], "presentation")
    )
    verify_package_checksums(batch)

    migration_report = load_json(batch / "migration-report.json")
    ui_directory = load_json(batch / "ui" / "directory.json")
    ui_countries = load_json(batch / "ui" / "countries.json")
    organisations_raw = csv_rows(batch / "organisations.csv")
    deployments_raw = csv_rows(batch / "deployments.csv")
    sources_raw = csv_rows(batch / "sources.csv")
    assertions_raw = csv_rows(batch / "assertions.csv")

    if migration_report.get("status") != "candidate_only":
        raise SnapshotError("source batch must retain candidate_only status")
    if config["mode"] not in {"candidate", "published"}:
        raise SnapshotError("interface mode must be candidate or published")

    reviewed_assertions = [
        row
        for row in assertions_raw
        if row["reviewed_by"].strip() and row["reviewed_at"].strip()
    ]
    unresolved_sources = [
        row
        for row in sources_raw
        if not row["title"].strip()
        or row["title"].startswith("Editorial review required")
        or row["source_license"].strip().lower() in {"", "unknown"}
    ]
    publishable = (
        len(reviewed_assertions) == len(assertions_raw)
        and not unresolved_sources
        and bool(assertions_raw)
    )
    if config["mode"] == "published" and not publishable:
        raise SnapshotError(
            "published mode refused: assertions or source metadata remain unreviewed"
        )

    country_ids = [item["iso2"] for item in countries]
    if len(countries) != 54 or len(set(country_ids)) != 54:
        raise SnapshotError("country reference must contain 54 unique ISO2 records")

    organisations_by_id = {row["id"]: row for row in organisations_raw}
    categories, stages = build_taxonomy(taxonomy, presentation)
    categories_by_id = {item["id"]: item for item in categories}
    assertions_by_subject: dict[str, list[dict[str, str]]] = defaultdict(list)
    for assertion in assertions_raw:
        assertions_by_subject[assertion["subject_id"]].append(assertion)

    organisations = [
        {
            "id": row["id"],
            "name": row["name"],
            "slug": row["slug"],
            "organisationType": row["organisation_type"],
            "originClassification": row["origin_classification"],
            "countryOfOriginIso2": row["country_of_origin"],
            "headquartersCountryIso2": row["headquarters_country"],
            "lifecycleStatus": row["lifecycle_status"],
            "website": row["website"],
            "description": row["description"],
            "providerProfileConfirmed": row["provider_profile_confirmed"]
            == "true",
            "lastCheckedAt": row["last_checked_at"],
        }
        for row in organisations_raw
    ]

    products = []
    for row in ui_directory:
        organisation = organisations_by_id.get(row["organisation_id"])
        category = categories_by_id.get(row["primary_category_id"])
        if not organisation:
            raise SnapshotError(
                f"product {row['id']} has unknown organisation_id"
            )
        if not category:
            raise SnapshotError(f"product {row['id']} has unknown category")
        evidence = sorted(
            set(row["evidence_statuses"])
            | set(row["deployment_evidence_statuses"]),
            key=lambda value: EVIDENCE_PRIORITY[value],
        )
        if not evidence:
            raise SnapshotError(f"product {row['id']} has no evidence state")
        capabilities = [
            value.strip()
            for value in row["description"].split(";")
            if value.strip()
        ]
        products.append(
            {
                "id": row["id"],
                "organisationId": row["organisation_id"],
                "organisation": row["organisation"],
                "name": row["name"],
                "slug": row["slug"],
                "description": row["description"],
                "categoryId": row["primary_category_id"],
                "category": category["name"],
                "stageId": category["stageId"],
                "originClassification": organisation["origin_classification"],
                "lifecycleStatus": row["lifecycle_status"],
                "accessModel": row["access_model"],
                "openSourceUrl": row["open_source_url"],
                "website": row["website"] or organisation["website"],
                "launchedYear": row["launched_year"],
                "lastCheckedAt": row["last_checked_at"],
                "deploymentCountries": row["deployment_countries"],
                "evidenceStatuses": evidence,
                "capabilities": capabilities,
            }
        )

    deployments = []
    for row in deployments_raw:
        material_assertions = assertions_by_subject[row["id"]]
        evidence = sorted(
            {item["evidence_status"] for item in material_assertions},
            key=lambda value: EVIDENCE_PRIORITY[value],
        )
        source_ids = sorted(
            {item["source_id"] for item in material_assertions if item["source_id"]}
        )
        if not evidence or not source_ids:
            raise SnapshotError(
                f"deployment {row['id']} lacks evidence or a source"
            )
        deployments.append(
            {
                "id": row["id"],
                "productId": row["product_id"],
                "countryIso2": row["country_iso2"],
                "subnationalArea": row["subnational_area"],
                "customerName": row["customer_name"],
                "customerDisclosure": row["customer_disclosure"],
                "lifecycleStatus": row["lifecycle_status"],
                "startedYear": row["started_year"],
                "endedYear": row["ended_year"],
                "locationPrecision": row["location_precision"],
                "lastCheckedAt": row["last_checked_at"],
                "evidenceStatus": evidence[0],
                "sourceId": source_ids[0],
            }
        )

    sources = [
        {
            "id": row["id"],
            "url": row["url"],
            "title": row["title"],
            "publisher": row["publisher"],
            "sourceType": row["source_type"],
            "publicationDate": row["publication_date"],
            "retrievedAt": row["retrieved_at"],
            "archivedUrl": row["archived_url"],
            "sourceLicense": row["source_license"],
            "independenceClass": row["independence_class"],
            "automationPermitted": row["automation_permitted"] == "true",
        }
        for row in sources_raw
    ]
    assertions = [
        {
            "id": row["id"],
            "subjectType": row["subject_type"],
            "subjectId": row["subject_id"],
            "predicate": row["predicate"],
            "value": row["value"],
            "sourceId": row["source_id"],
            "evidenceStatus": row["evidence_status"],
            "reviewedBy": row["reviewed_by"],
            "reviewedAt": row["reviewed_at"],
            "validFrom": row["valid_from"],
            "validTo": row["valid_to"],
        }
        for row in assertions_raw
    ]
    country_summaries = [
        {
            "countryIso2": item["country_iso2"],
            "deploymentCount": item["deployment_count"],
            "independentOrCustomerCount": item[
                "independent_or_customer_count"
            ],
            "providerClaimCount": item["provider_claim_count"],
            "productCount": item["product_count"],
            "categoryCounts": item["category_counts"],
        }
        for item in ui_countries
    ]
    distributions = distribution_records(config["version"])

    return {
        "schemaVersion": config["schema_version"],
        "release": {
            "mode": config["mode"],
            "version": config["version"],
            "date": config["release_date"],
            "status": config["status_label"],
            "sourceBatch": config["source_batch"],
            "sourceWorkbook": migration_report["source"],
        },
        "reviewGate": {
            "assertions": len(assertions),
            "reviewedAssertions": len(reviewed_assertions),
            "unreviewedAssertions": len(assertions) - len(reviewed_assertions),
            "unresolvedSources": len(unresolved_sources),
            "publishable": publishable,
        },
        "counts": {
            "organisations": len(organisations),
            "products": len(products),
            "deployments": len(deployments),
            "sources": len(sources),
            "assertions": len(assertions),
        },
        "organisations": organisations,
        "products": products,
        "deployments": deployments,
        "sources": sources,
        "assertions": assertions,
        "stages": stages,
        "categories": categories,
        "countries": countries,
        "countrySummaries": country_summaries,
        "distributions": distributions,
    }


def build_taxonomy(
    taxonomy: dict, presentation: dict
) -> tuple[list[dict], list[dict]]:
    stages = [
        {"id": stage["id"], "name": stage["name"], "order": stage["order"]}
        for stage in taxonomy["stages"]
    ]
    categories = []
    category_presentation = presentation["categories"]
    for stage in taxonomy["stages"]:
        for category in stage["categories"]:
            categories.append(
                build_category(
                    category, stage["id"], category_presentation
                )
            )
    for category in taxonomy["cross_cutting"]:
        categories.append(
            build_category(category, "cross_cutting", category_presentation)
        )
    category_ids = {item["id"] for item in categories}
    if category_ids != set(category_presentation):
        raise SnapshotError(
            "presentation categories must exactly match the taxonomy"
        )
    return categories, stages


def build_category(
    category: dict, stage_id: str, presentation: dict
) -> dict:
    metadata = presentation.get(category["id"])
    if not metadata:
        raise SnapshotError(
            f"missing presentation metadata for {category['id']}"
        )
    return {
        "id": category["id"],
        "name": category["name"],
        "stageId": stage_id,
        "marketCondition": metadata["market_condition"],
        "researchState": metadata["research_state"],
        "verdict": metadata["verdict"],
    }


def distribution_records(version: str) -> list[dict[str, str]]:
    base = f"/downloads/{version}"
    return [
        {
            "id": "csv_package",
            "label": "CSV package",
            "format": "ZIP",
            "href": f"{base}/candidate-csv-package.zip",
        },
        {
            "id": "registry_json",
            "label": "Registry snapshot",
            "format": "JSON",
            "href": f"{base}/registry.json",
        },
        {
            "id": "assertions_jsonl",
            "label": "Assertions",
            "format": "JSONL",
            "href": f"{base}/assertions.jsonl",
        },
        {
            "id": "deployments_geojson",
            "label": "Deployment geography",
            "format": "GeoJSON",
            "href": f"{base}/deployments.geojson",
        },
        {
            "id": "download_manifest",
            "label": "Package manifest",
            "format": "JSON",
            "href": f"{base}/manifest.json",
        },
    ]


def build_downloads(
    snapshot: dict[str, object], config: dict
) -> dict[str, bytes]:
    registry = json_bytes(snapshot)
    assertions_jsonl = b"".join(
        json.dumps(item, ensure_ascii=False, separators=(",", ":")).encode(
            "utf-8"
        )
        + b"\n"
        for item in snapshot["assertions"]
    )
    geojson = json_bytes(
        {
            "type": "FeatureCollection",
            "name": "Africa Energy Software Map candidate deployments",
            "features": [
                {
                    "type": "Feature",
                    "id": item["id"],
                    "geometry": None,
                    "properties": {
                        "deployment_id": item["id"],
                        "product_id": item["productId"],
                        "country_iso2": item["countryIso2"],
                        "subnational_area": item["subnationalArea"],
                        "customer_disclosure": item["customerDisclosure"],
                        "lifecycle_status": item["lifecycleStatus"],
                        "started_year": item["startedYear"],
                        "location_precision": item["locationPrecision"],
                        "evidence_status": item["evidenceStatus"],
                        "source_id": item["sourceId"],
                    },
                }
                for item in snapshot["deployments"]
            ],
        }
    )
    readme = candidate_readme(snapshot).encode("utf-8")
    csv_zip = build_csv_zip(snapshot, config, readme)
    primary = {
        "candidate-csv-package.zip": csv_zip,
        "registry.json": registry,
        "assertions.jsonl": assertions_jsonl,
        "deployments.geojson": geojson,
        "README.md": readme,
    }
    manifest = {
        "schemaVersion": snapshot["schemaVersion"],
        "mode": snapshot["release"]["mode"],
        "version": snapshot["release"]["version"],
        "date": snapshot["release"]["date"],
        "status": snapshot["release"]["status"],
        "counts": snapshot["counts"],
        "reviewGate": snapshot["reviewGate"],
        "files": [
            {
                "path": name,
                "bytes": len(content),
                "sha256": sha256_bytes(content),
            }
            for name, content in sorted(primary.items())
        ],
    }
    files = {**primary, "manifest.json": json_bytes(manifest)}
    checksum_lines = [
        f"{sha256_bytes(content)}  {name}"
        for name, content in sorted(files.items())
    ]
    files["checksums.txt"] = ("\n".join(checksum_lines) + "\n").encode(
        "utf-8"
    )
    return files


def candidate_readme(snapshot: dict[str, object]) -> str:
    release = snapshot["release"]
    counts = snapshot["counts"]
    gate = snapshot["reviewGate"]
    return f"""# Africa Energy Software Map — {release['version']}

Status: **{release['status']}**

This is an interface and research-review package, not a formal public data
release. The records remain candidates until the editorial review fields and
source metadata are complete.

## Contents

- `candidate-csv-package.zip` — normalised candidate tables and metadata
- `registry.json` — complete interface snapshot
- `assertions.jsonl` — one atomic candidate assertion per line
- `deployments.geojson` — country-safe geography with null point geometry
- `manifest.json` and `checksums.txt` — counts, review gate and integrity data

## Counts

- Organisations: {counts['organisations']}
- Products: {counts['products']}
- Deployments: {counts['deployments']}
- Sources: {counts['sources']}
- Assertions: {counts['assertions']}

## Review gate

- Reviewed assertions: {gate['reviewedAssertions']}
- Unreviewed assertions: {gate['unreviewedAssertions']}
- Sources requiring metadata completion: {gate['unresolvedSources']}
- Publishable: {str(gate['publishable']).lower()}

Provider claims remain separate from independently evidenced deployments. The
GeoJSON contains no precise infrastructure coordinates.
"""


def build_csv_zip(
    snapshot: dict[str, object], config: dict, readme: bytes
) -> bytes:
    batch = repository_path(config["source_batch"], "source_batch")
    datapackage = {
        "profile": "tabular-data-package",
        "name": "africa-energy-software-map-candidate",
        "version": snapshot["release"]["version"],
        "title": "Africa Energy Software Map candidate data",
        "description": snapshot["release"]["status"],
        "licenses": [{"name": "CC-BY-4.0", "path": "DATA-LICENSE.md"}],
        "resources": [
            {"name": name.removesuffix(".csv"), "path": name}
            for name in CSV_TABLES
        ],
    }
    entries: dict[str, bytes] = {
        name: (batch / name).read_bytes() for name in CSV_TABLES
    }
    entries.update(
        {
            "README.md": readme,
            "migration-report.json": (batch / "migration-report.json").read_bytes(),
            "DATA-LICENSE.md": (ROOT / "DATA-LICENSE.md").read_bytes(),
            "datapackage.json": json_bytes(datapackage),
        }
    )
    entries["checksums.txt"] = (
        "\n".join(
            f"{sha256_bytes(content)}  {name}"
            for name, content in sorted(entries.items())
        )
        + "\n"
    ).encode("utf-8")
    buffer = io.BytesIO()
    with zipfile.ZipFile(
        buffer, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9
    ) as archive:
        for name, content in sorted(entries.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, content)
    return buffer.getvalue()


def build_artifacts(
    config_path: Path = DEFAULT_CONFIG,
) -> tuple[Path, Path, bytes, dict[str, bytes]]:
    config = load_json(config_path)
    snapshot = build_snapshot(config_path)
    snapshot_path = repository_path(
        config["snapshot_output"], "snapshot_output"
    )
    downloads_path = repository_path(
        config["downloads_output"], "downloads_output"
    )
    return (
        snapshot_path,
        downloads_path,
        json_bytes(snapshot),
        build_downloads(snapshot, config),
    )


def write_artifacts(config_path: Path = DEFAULT_CONFIG) -> None:
    snapshot_path, downloads_path, snapshot_bytes, downloads = build_artifacts(
        config_path
    )
    snapshot_path.parent.mkdir(parents=True, exist_ok=True)
    snapshot_path.write_bytes(snapshot_bytes)
    downloads_path.mkdir(parents=True, exist_ok=True)
    expected = set(downloads)
    for path in downloads_path.iterdir():
        if path.is_file() and path.name not in expected:
            path.unlink()
    for name, content in downloads.items():
        (downloads_path / name).write_bytes(content)


def check_artifacts(config_path: Path = DEFAULT_CONFIG) -> None:
    snapshot_path, downloads_path, snapshot_bytes, downloads = build_artifacts(
        config_path
    )
    differences: list[str] = []
    if not snapshot_path.is_file() or snapshot_path.read_bytes() != snapshot_bytes:
        differences.append(snapshot_path.relative_to(ROOT).as_posix())
    actual_downloads = {
        path.name: path.read_bytes()
        for path in downloads_path.iterdir()
        if path.is_file()
    } if downloads_path.is_dir() else {}
    for name in sorted(set(downloads) | set(actual_downloads)):
        if downloads.get(name) != actual_downloads.get(name):
            differences.append(
                (downloads_path / name).relative_to(ROOT).as_posix()
            )
    if differences:
        raise SnapshotError(
            "generated interface artifacts are stale: "
            + ", ".join(differences)
        )


def main() -> int:
    args = parse_args()
    try:
        if args.check:
            check_artifacts(args.config)
            print("Generated interface snapshot and downloads are reproducible.")
        else:
            write_artifacts(args.config)
            snapshot = build_snapshot(args.config)
            print(
                json.dumps(
                    {
                        "status": snapshot["release"]["status"],
                        "counts": snapshot["counts"],
                        "reviewGate": snapshot["reviewGate"],
                    },
                    indent=2,
                )
            )
    except SnapshotError as exc:
        print(f"Snapshot build failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
