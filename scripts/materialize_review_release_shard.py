#!/usr/bin/env python3
"""Materialise one reviewed bulk-intake release shard without private review data."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

try:
    from scripts.prepare_review_release import build_release_plan
    from scripts.workbook_migration import TABLE_FIELDS, write_csv
except ModuleNotFoundError:
    from prepare_review_release import build_release_plan
    from workbook_migration import TABLE_FIELDS, write_csv


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SNAPSHOT = ROOT / "web" / "generated" / "registry-snapshot.json"
PUBLIC_REVIEWER_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{1,79}$")
EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
SUBJECT_TABLES = {
    "organisation": "organisations.csv",
    "product": "products.csv",
    "deployment": "deployments.csv",
    "organisation_role": "organisation-roles.csv",
    "organisation_sector": "organisation-sectors.csv",
    "organisation_segment": "organisation-segments.csv",
    "organisation_alias": "organisation-aliases.csv",
    "organisation_relationship": "organisation-relationships.csv",
    "organisation_software_relationship": "organisation-software-relationships.csv",
    "organisation_presence": "organisation-presences.csv",
}
SHARD_TABLE_FIELDS = {
    **TABLE_FIELDS,
    "organisation-roles.csv": [
        "id", "organisation_id", "role_id", "is_primary", "valid_from",
        "valid_to", "last_checked_at",
    ],
    "organisation-sectors.csv": [
        "id", "organisation_id", "sector_id", "valid_from", "valid_to",
        "last_checked_at",
    ],
    "organisation-segments.csv": [
        "id", "organisation_id", "segment_id", "valid_from", "valid_to",
        "last_checked_at",
    ],
    "organisation-aliases.csv": [
        "id", "organisation_id", "alias", "alias_type", "valid_from",
        "valid_to", "last_checked_at",
    ],
    "organisation-relationships.csv": [
        "id", "organisation_id", "related_organisation_id",
        "relationship_type", "valid_from", "valid_to", "last_checked_at",
    ],
    "organisation-software-relationships.csv": [
        "id", "organisation_id", "product_id", "relationship_type",
        "valid_from", "valid_to", "last_checked_at",
    ],
    "organisation-presences.csv": [
        "id", "organisation_id", "country_iso2", "presence_type",
        "lifecycle_status", "valid_from", "valid_to", "last_checked_at",
    ],
}


class ShardMaterializationError(RuntimeError):
    """Raised when a reviewed release shard cannot be emitted safely."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("review_package", type=Path)
    parser.add_argument("--shard", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--reviewer", required=True)
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ShardMaterializationError(f"cannot read {path}: {error}") from error


def review_date(value: str) -> str:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
    except (AttributeError, ValueError) as error:
        raise ShardMaterializationError(
            f"review decision has an invalid timestamp: {value!r}"
        ) from error


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "record"


def source_register_id(url: str) -> str:
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc.lower()}/"
    return "reg_" + hashlib.sha256(base.encode("utf-8")).hexdigest()[:16]


def _values_by_subject(
    assertions: list[dict[str, str]],
) -> dict[tuple[str, str], dict[str, str]]:
    result: dict[tuple[str, str], dict[str, str]] = defaultdict(dict)
    for assertion in assertions:
        key = (assertion["subjectType"], assertion["subjectId"])
        predicate = assertion["predicate"]
        previous = result[key].get(predicate)
        if previous is not None and previous != assertion["value"]:
            raise ShardMaterializationError(
                f"{key[0]} {key[1]} has conflicting values for {predicate}"
            )
        result[key][predicate] = assertion["value"]
    return result


def _global_slug_map(
    plan: dict[str, Any], snapshot: dict[str, Any], subject_type: str
) -> dict[str, str]:
    names: dict[str, str] = {}
    for assertion in plan["actions"]["addAssertions"]:
        if assertion["subjectType"] == subject_type and assertion["predicate"] == "name":
            names[assertion["subjectId"]] = assertion["value"]
    base_key = "organisations" if subject_type == "organisation" else "products"
    occupied = {
        str(item.get("slug") or ""): str(item.get("id") or "")
        for item in snapshot.get(base_key, [])
        if item.get("slug")
    }
    candidate_slugs: dict[str, list[str]] = defaultdict(list)
    for subject_id, name in names.items():
        candidate_slugs[slugify(name)].append(subject_id)
    result: dict[str, str] = {}
    for subject_id, name in names.items():
        base = slugify(name)
        collision = base in occupied and occupied[base] != subject_id
        if collision or len(candidate_slugs[base]) > 1:
            result[subject_id] = f"{base}-{subject_id.rsplit('_', 1)[-1][:8]}"
        else:
            result[subject_id] = base
    return result


def build_release_shard(
    *,
    package: dict[str, Any],
    package_hash: str,
    snapshot: dict[str, Any],
    shard_id: str,
    reviewer: str,
) -> tuple[dict[str, list[dict[str, str]]], dict[str, Any], str]:
    if not PUBLIC_REVIEWER_PATTERN.fullmatch(reviewer):
        raise ShardMaterializationError(
            "reviewer must be a public, repository-safe label"
        )
    plan = build_release_plan(snapshot, package)
    if plan["status"] != "ready_for_data_pr":
        raise ShardMaterializationError(
            f"review package still has {plan['summary']['blockers']} blockers"
        )
    try:
        shard = next(
            item
            for item in plan["actions"]["releaseShards"]
            if item["id"] == shard_id
        )
    except StopIteration as error:
        raise ShardMaterializationError(f"unknown release shard: {shard_id}") from error
    if shard["assertionCount"] > 100 or shard["entityCount"] > 25:
        raise ShardMaterializationError("release shard exceeds pull-request limits")

    planned_assertions = {
        item["id"]: item for item in plan["actions"]["addAssertions"]
    }
    promoted_assertions = {
        item["id"]: item for item in package.get("promotedAssertions", [])
    }
    assertion_reviews = {
        item["assertionId"]: item for item in package.get("assertionReviews", [])
    }
    assertions = [planned_assertions[item] for item in shard["assertionIds"]]
    subject_values = _values_by_subject(assertions)
    organisation_slugs = _global_slug_map(plan, snapshot, "organisation")
    product_slugs = _global_slug_map(plan, snapshot, "product")
    subject_review_dates: dict[tuple[str, str], list[str]] = defaultdict(list)
    assertion_rows: list[dict[str, str]] = []
    for assertion in assertions:
        review = assertion_reviews.get(assertion["id"])
        original = promoted_assertions.get(assertion["id"])
        if not review or not original:
            raise ShardMaterializationError(
                f"{assertion['id']} is missing its reviewed private precursor"
            )
        checked_at = review_date(str(review.get("reviewedAt") or ""))
        subject_review_dates[
            (assertion["subjectType"], assertion["subjectId"])
        ].append(checked_at)
        assertion_rows.append(
            {
                "id": assertion["id"],
                "subject_type": assertion["subjectType"],
                "subject_id": assertion["subjectId"],
                "predicate": assertion["predicate"],
                "value": assertion["value"],
                "source_id": assertion["sourceId"],
                "evidence_status": assertion["evidenceStatus"],
                "extracted_by": "ai_assisted_research",
                "extractor_run_id": f"batch_001_{shard_id.replace('-', '_')}",
                "reviewed_by": reviewer,
                "reviewed_at": checked_at,
                "valid_from": str(original.get("validFrom") or ""),
                "valid_to": str(original.get("validTo") or ""),
                "notes": assertion["notes"],
            }
        )

    def last_checked(subject_type: str, subject_id: str) -> str:
        return max(subject_review_dates[(subject_type, subject_id)])

    organisations: list[dict[str, str]] = []
    products: list[dict[str, str]] = []
    deployments: list[dict[str, str]] = []
    organisation_roles: list[dict[str, str]] = []
    organisation_sectors: list[dict[str, str]] = []
    organisation_segments: list[dict[str, str]] = []
    organisation_aliases: list[dict[str, str]] = []
    organisation_relationships: list[dict[str, str]] = []
    organisation_software_relationships: list[dict[str, str]] = []
    organisation_presences: list[dict[str, str]] = []
    for (subject_type, subject_id), values in sorted(subject_values.items()):
        if subject_type == "organisation":
            for required in ("name", "origin_classification"):
                if not values.get(required):
                    raise ShardMaterializationError(
                        f"organisation {subject_id} lacks {required}"
                    )
            organisations.append(
                {
                    "id": subject_id,
                    "name": values["name"],
                    "slug": organisation_slugs[subject_id],
                    "organisation_type": "energy_ecosystem_organisation",
                    "origin_classification": values["origin_classification"],
                    "country_of_origin": values.get("country_of_origin", ""),
                    "headquarters_country": values.get("headquarters_country", ""),
                    "lifecycle_status": values.get("lifecycle_status", "unknown"),
                    "website": values.get("website", ""),
                    "description": values.get("description", ""),
                    "provider_profile_confirmed": "false",
                    "last_checked_at": last_checked(subject_type, subject_id),
                }
            )
        elif subject_type == "product":
            for required in (
                "name",
                "organisation_id",
                "primary_category_id",
                "lifecycle_status",
                "access_model",
            ):
                if not values.get(required):
                    raise ShardMaterializationError(
                        f"product {subject_id} lacks {required}"
                    )
            products.append(
                {
                    "id": subject_id,
                    "organisation_id": values["organisation_id"],
                    "name": values["name"],
                    "slug": product_slugs[subject_id],
                    "description": values.get("description", ""),
                    "primary_category_id": values["primary_category_id"],
                    "lifecycle_status": values["lifecycle_status"],
                    "access_model": values["access_model"],
                    "open_source_url": values.get("open_source_url", ""),
                    "website": values.get("website", ""),
                    "launched_year": values.get("launched_year", ""),
                    "last_checked_at": last_checked(subject_type, subject_id),
                }
            )
        elif subject_type == "deployment":
            for required in (
                "product_id",
                "country_iso2",
                "customer_disclosure",
                "lifecycle_status",
            ):
                if not values.get(required):
                    raise ShardMaterializationError(
                        f"deployment {subject_id} lacks {required}"
                    )
            deployments.append(
                {
                    "id": subject_id,
                    "product_id": values["product_id"],
                    "country_iso2": values["country_iso2"],
                    "subnational_area": "",
                    "customer_name": values.get("customer_name", ""),
                    "customer_disclosure": values["customer_disclosure"],
                    "lifecycle_status": values["lifecycle_status"],
                    "started_year": values.get("started_year", ""),
                    "ended_year": values.get("ended_year", ""),
                    "location_precision": "country",
                    "last_checked_at": last_checked(subject_type, subject_id),
                }
            )
        elif subject_type == "organisation_role":
            for required in ("organisation_id", "role_id", "is_primary"):
                if not values.get(required):
                    raise ShardMaterializationError(
                        f"organisation role {subject_id} lacks {required}"
                    )
            organisation_roles.append(
                {
                    "id": subject_id,
                    "organisation_id": values["organisation_id"],
                    "role_id": values["role_id"],
                    "is_primary": values["is_primary"],
                    "valid_from": values.get("valid_from", ""),
                    "valid_to": values.get("valid_to", ""),
                    "last_checked_at": last_checked(subject_type, subject_id),
                }
            )
        elif subject_type == "organisation_sector":
            for required in ("organisation_id", "sector_id"):
                if not values.get(required):
                    raise ShardMaterializationError(
                        f"organisation sector {subject_id} lacks {required}"
                    )
            organisation_sectors.append(
                {
                    "id": subject_id,
                    "organisation_id": values["organisation_id"],
                    "sector_id": values["sector_id"],
                    "valid_from": values.get("valid_from", ""),
                    "valid_to": values.get("valid_to", ""),
                    "last_checked_at": last_checked(subject_type, subject_id),
                }
            )
        elif subject_type == "organisation_segment":
            for required in ("organisation_id", "segment_id"):
                if not values.get(required):
                    raise ShardMaterializationError(
                        f"organisation segment {subject_id} lacks {required}"
                    )
            organisation_segments.append(
                {
                    "id": subject_id,
                    "organisation_id": values["organisation_id"],
                    "segment_id": values["segment_id"],
                    "valid_from": values.get("valid_from", ""),
                    "valid_to": values.get("valid_to", ""),
                    "last_checked_at": last_checked(subject_type, subject_id),
                }
            )
        elif subject_type == "organisation_alias":
            for required in ("organisation_id", "alias", "alias_type"):
                if not values.get(required):
                    raise ShardMaterializationError(
                        f"organisation alias {subject_id} lacks {required}"
                    )
            organisation_aliases.append(
                {
                    "id": subject_id,
                    "organisation_id": values["organisation_id"],
                    "alias": values["alias"],
                    "alias_type": values["alias_type"],
                    "valid_from": values.get("valid_from", ""),
                    "valid_to": values.get("valid_to", ""),
                    "last_checked_at": last_checked(subject_type, subject_id),
                }
            )
        elif subject_type == "organisation_relationship":
            for required in (
                "organisation_id", "related_organisation_id", "relationship_type"
            ):
                if not values.get(required):
                    raise ShardMaterializationError(
                        f"organisation relationship {subject_id} lacks {required}"
                    )
            organisation_relationships.append(
                {
                    "id": subject_id,
                    "organisation_id": values["organisation_id"],
                    "related_organisation_id": values["related_organisation_id"],
                    "relationship_type": values["relationship_type"],
                    "valid_from": values.get("valid_from", ""),
                    "valid_to": values.get("valid_to", ""),
                    "last_checked_at": last_checked(subject_type, subject_id),
                }
            )
        elif subject_type == "organisation_software_relationship":
            for required in ("organisation_id", "product_id", "relationship_type"):
                if not values.get(required):
                    raise ShardMaterializationError(
                        f"organisation software relationship {subject_id} lacks {required}"
                    )
            organisation_software_relationships.append(
                {
                    "id": subject_id,
                    "organisation_id": values["organisation_id"],
                    "product_id": values["product_id"],
                    "relationship_type": values["relationship_type"],
                    "valid_from": values.get("valid_from", ""),
                    "valid_to": values.get("valid_to", ""),
                    "last_checked_at": last_checked(subject_type, subject_id),
                }
            )
        elif subject_type == "organisation_presence":
            for required in (
                "organisation_id", "country_iso2", "presence_type", "lifecycle_status"
            ):
                if not values.get(required):
                    raise ShardMaterializationError(
                        f"organisation presence {subject_id} lacks {required}"
                    )
            organisation_presences.append(
                {
                    "id": subject_id,
                    "organisation_id": values["organisation_id"],
                    "country_iso2": values["country_iso2"],
                    "presence_type": values["presence_type"],
                    "lifecycle_status": values["lifecycle_status"],
                    "valid_from": values.get("valid_from", ""),
                    "valid_to": values.get("valid_to", ""),
                    "last_checked_at": last_checked(subject_type, subject_id),
                }
            )
        else:
            raise ShardMaterializationError(
                f"unsupported promoted subject type: {subject_type}"
            )

    primary_role_organisations = {
        row["organisation_id"]
        for row in organisation_roles
        if row["is_primary"].lower() == "true"
    }
    sector_organisations = {
        row["organisation_id"] for row in organisation_sectors
    }
    for organisation in organisations:
        organisation_id = organisation["id"]
        if organisation_id not in primary_role_organisations:
            raise ShardMaterializationError(
                f"organisation {organisation_id} lacks a reviewed primary role"
            )
        if organisation_id not in sector_organisations:
            raise ShardMaterializationError(
                f"organisation {organisation_id} lacks a reviewed sector"
            )

    plan_sources = {item["id"]: item for item in plan["actions"]["addSources"]}
    promoted_sources = package.get("promotedSources", [])
    promoted_by_url = {str(item.get("url") or ""): item for item in promoted_sources}
    contexts = package.get("bulkCandidates", [])
    publication_dates: dict[str, str] = {}
    for context in contexts:
        payload = context.get("effectivePayload") or {}
        url = str(payload.get("source_url") or "")
        date = str(payload.get("source_publication_date") or "")
        if url and date:
            publication_dates[url] = date
    sources: list[dict[str, str]] = []
    source_register_by_id: dict[str, dict[str, str]] = {}
    for source_id in shard["addSourceIds"]:
        source = plan_sources.get(source_id)
        if not source:
            raise ShardMaterializationError(f"missing planned source {source_id}")
        promoted = promoted_by_url.get(source["url"], {})
        retrieved = str(promoted.get("retrieved") or "")[:10]
        source_row = {
            "id": source_id,
            "url": source["url"],
            "title": source["title"],
            "publisher": source["publisher"],
            "source_type": source["sourceType"],
            "author": "",
            "publication_date": publication_dates.get(source["url"], ""),
            "retrieved_at": retrieved,
            "archived_url": "",
            "source_license": source["sourceLicense"],
            "independence_class": source["independenceClass"],
            "automation_permitted": "false",
            "notes": source["notes"],
        }
        sources.append(source_row)
        parsed = urlparse(source["url"])
        register_id = source_register_id(source["url"])
        register_row = {
            "id": register_id,
            "name": source["publisher"] or source["title"],
            "source_family": source["sourceType"],
            "countries": "",
            "categories": "",
            "base_url": f"{parsed.scheme}://{parsed.netloc.lower()}/",
            "discovery_method": "human_reviewed_bulk_intake",
            "automation_permitted": "false",
            "expected_update_frequency": "unknown",
            "default_independence_class": source["independenceClass"],
            "language": "",
            "last_checked_at": retrieved,
            "next_review_at": "",
            "status": "active",
            "notes": source["notes"],
        }
        previous_register = source_register_by_id.get(register_id)
        if (
            previous_register
            and previous_register["default_independence_class"]
            != register_row["default_independence_class"]
        ):
            raise ShardMaterializationError(
                f"source-register domain {parsed.netloc} has conflicting independence"
            )
        source_register_by_id.setdefault(register_id, register_row)

    tables = {filename: [] for filename in SHARD_TABLE_FIELDS}
    tables["organisations.csv"] = organisations
    tables["products.csv"] = products
    tables["deployments.csv"] = deployments
    tables["organisation-roles.csv"] = organisation_roles
    tables["organisation-sectors.csv"] = organisation_sectors
    tables["organisation-segments.csv"] = organisation_segments
    tables["organisation-aliases.csv"] = organisation_aliases
    tables["organisation-relationships.csv"] = organisation_relationships
    tables["organisation-software-relationships.csv"] = (
        organisation_software_relationships
    )
    tables["organisation-presences.csv"] = organisation_presences
    tables["sources.csv"] = sources
    tables["assertions.csv"] = sorted(assertion_rows, key=lambda item: item["id"])
    tables["source-register.csv"] = [
        source_register_by_id[item] for item in sorted(source_register_by_id)
    ]
    entity_ids = sorted(
        [item["id"] for item in organisations]
        + [item["id"] for item in products]
        + [item["id"] for item in deployments]
    )
    manifest = {
        "schemaVersion": "1.0.0",
        "status": "reviewed_delta",
        "batchId": plan["batchId"],
        "shardId": shard_id,
        "sourceBatchIds": shard["sourceBatchIds"],
        "reviewPackageSha256": package_hash,
        "reviewPackageCommitted": False,
        "publicReviewer": reviewer,
        "reviewCompletedAt": package.get("generatedAt", ""),
        "assertionCount": len(assertion_rows),
        "entityCount": len(entity_ids),
        "sourceCount": len(sources),
        "assertionIds": sorted(item["id"] for item in assertion_rows),
        "entityIds": entity_ids,
        "sourceIds": sorted(item["id"] for item in sources),
        "candidateRowIds": shard["rowIds"],
        "heldCandidatesOutsideRelease": plan["summary"]["candidateHeld"],
        "containsPrivateReviewData": False,
        "publicationAuthorised": False,
    }
    product_names = ", ".join(item["name"] for item in products)
    readme = f"""# Africa Energy Software Map — Batch 001 · {shard_id}

Status: **human-reviewed release delta awaiting independent pull-request approval**

This immutable shard contains {len(entity_ids)} entity records,
{len(assertion_rows)} source-linked assertions and {len(sources)} newly introduced
sources. It does not contain the private review package or reviewer contact data.

Products in this shard: {product_names}.

The shard is not published by itself. It will be composed with the reviewed
baseline and the other Batch 001 shards after independent approval. The
remaining {plan['summary']['candidateHeld']} candidates requiring more evidence
stay outside the release.
"""
    return tables, manifest, readme


def write_release_shard(
    output: Path,
    tables: dict[str, list[dict[str, str]]],
    manifest: dict[str, Any],
    readme: str,
) -> None:
    if output.exists():
        raise ShardMaterializationError(f"output already exists: {output}")
    output.mkdir(parents=True)
    for filename, fields in SHARD_TABLE_FIELDS.items():
        write_csv(output / filename, fields, tables[filename])
    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (output / "README.md").write_text(readme, encoding="utf-8")
    text = "\n".join(
        path.read_text(encoding="utf-8")
        for path in output.rglob("*")
        if path.is_file()
    )
    if EMAIL_PATTERN.search(text) or "reviewerEmail" in text:
        raise ShardMaterializationError(
            "release shard contains private reviewer information"
        )
    checksum_paths = sorted(path for path in output.rglob("*") if path.is_file())
    (output / "checksums.txt").write_text(
        "\n".join(
            f"{hashlib.sha256(path.read_bytes()).hexdigest()}  "
            f"{path.relative_to(output).as_posix()}"
            for path in checksum_paths
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    args = parse_args()
    output = args.output.resolve()
    try:
        output.relative_to(ROOT)
    except ValueError as error:
        raise ShardMaterializationError(
            "output must stay inside the repository"
        ) from error
    package_bytes = args.review_package.read_bytes()
    package = json.loads(package_bytes)
    snapshot = load_json(args.snapshot)
    tables, manifest, readme = build_release_shard(
        package=package,
        package_hash=hashlib.sha256(package_bytes).hexdigest(),
        snapshot=snapshot,
        shard_id=args.shard,
        reviewer=args.reviewer,
    )
    write_release_shard(output, tables, manifest, readme)
    print(
        json.dumps(
            {
                "status": manifest["status"],
                "shard": manifest["shardId"],
                "entities": manifest["entityCount"],
                "assertions": manifest["assertionCount"],
                "sources": manifest["sourceCount"],
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
        RuntimeError,
        ValueError,
    ) as error:
        print(f"Release shard materialization failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
