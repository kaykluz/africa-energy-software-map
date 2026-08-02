#!/usr/bin/env python3
"""Turn a private review export into a checked, candidate-only release plan."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SNAPSHOT = ROOT / "web" / "generated" / "registry-snapshot.json"
DECISIONS = {"accept", "amend", "reject", "needs_evidence"}
RIGHTS_DECISIONS = {"resolved", "needs_research", "exclude"}


class ReviewReleaseError(RuntimeError):
    """Raised when a review package cannot be planned safely."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("review_package", type=Path)
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def _indexed(items: list[dict[str, Any]], key: str, label: str) -> dict[str, dict]:
    result: dict[str, dict] = {}
    for item in items:
        item_id = item.get(key)
        if not isinstance(item_id, str) or not item_id:
            raise ReviewReleaseError(f"{label} has a missing {key}")
        if item_id in result:
            raise ReviewReleaseError(f"{label} repeats {item_id}")
        result[item_id] = item
    return result


def build_release_plan(snapshot: dict, package: dict) -> dict:
    if package.get("schemaVersion") not in {"1.0.0", "1.1.0"}:
        raise ReviewReleaseError("unsupported review package schema")
    if package.get("status", {}).get("publicationAuthorised") is not False:
        raise ReviewReleaseError("review package must not authorise publication")
    if package.get("status", {}).get("containsPublicDataChanges") is not False:
        raise ReviewReleaseError("review package must not contain public data changes")

    assertions = _indexed(snapshot.get("assertions", []), "id", "snapshot assertion")
    promoted_assertions = _indexed(
        package.get("promotedAssertions", []), "id", "promoted assertion"
    )
    duplicate_assertions = sorted(set(assertions) & set(promoted_assertions))
    if duplicate_assertions:
        raise ReviewReleaseError(
            f"promoted assertions collide with the snapshot: {duplicate_assertions}"
        )
    all_assertions = {**assertions, **promoted_assertions}
    sources = _indexed(snapshot.get("sources", []), "id", "snapshot source")
    promoted_sources = _indexed(
        package.get("promotedSources", []), "id", "promoted source"
    )
    duplicate_sources = sorted(set(sources) & set(promoted_sources))
    if duplicate_sources:
        raise ReviewReleaseError(
            f"promoted sources collide with the snapshot: {duplicate_sources}"
        )
    all_sources = {**sources, **promoted_sources}
    missing_assertion_sources = sorted(
        {
            str(assertion.get("sourceId") or "")
            for assertion in promoted_assertions.values()
        }
        - set(all_sources)
    )
    if missing_assertion_sources:
        raise ReviewReleaseError(
            "promoted assertions have missing sources: "
            f"{missing_assertion_sources}"
        )
    reviews = _indexed(
        package.get("assertionReviews", []), "assertionId", "assertion review"
    )
    source_reviews = _indexed(
        package.get("sourceReviews", []), "sourceId", "source review"
    )

    unknown_assertions = sorted(set(reviews) - set(all_assertions))
    unknown_sources = sorted(set(source_reviews) - set(all_sources))
    if unknown_assertions or unknown_sources:
        raise ReviewReleaseError(
            "review package contains records outside this snapshot: "
            f"assertions={unknown_assertions}, sources={unknown_sources}"
        )

    blockers: list[dict[str, str]] = []
    candidate_decision_counts = {decision: 0 for decision in sorted(DECISIONS)}
    excluded_candidate_rows: list[dict[str, str]] = []
    bulk_candidates = package.get("bulkCandidates", [])
    for candidate in bulk_candidates:
        review = candidate.get("review") or {}
        decision = review.get("decision")
        row_id = str(candidate.get("id") or "")
        if not decision:
            blockers.append(
                {
                    "type": "candidate_decision_missing",
                    "recordId": row_id,
                    "message": "Bulk candidate still needs a row decision.",
                }
            )
            continue
        if decision not in DECISIONS:
            raise ReviewReleaseError(
                f"bulk candidate {row_id} has an invalid decision"
            )
        if candidate.get("status") and candidate.get("status") != decision:
            raise ReviewReleaseError(
                f"bulk candidate {row_id} status disagrees with its review"
            )
        candidate_decision_counts[decision] += 1
        if decision in {"reject", "needs_evidence"}:
            effective = candidate.get("effectivePayload") or {}
            excluded_candidate_rows.append(
                {
                    "rowId": row_id,
                    "importId": str(candidate.get("importId") or ""),
                    "rowKey": str(candidate.get("rowKey") or ""),
                    "recordType": str(candidate.get("recordType") or ""),
                    "decision": str(decision),
                    "label": str(
                        effective.get("product_name")
                        or effective.get("organisation_name")
                        or candidate.get("rowKey")
                        or row_id
                    ),
                }
            )
    unresolved_assertions = sorted(set(all_assertions) - set(reviews))
    for assertion_id in unresolved_assertions:
        blockers.append(
            {
                "type": "assertion_decision_missing",
                "recordId": assertion_id,
                "message": "Assertion still needs a human decision.",
            }
        )

    unknown_rights_sources = {
        source_id
        for source_id, source in all_sources.items()
        if source.get("sourceLicense") == "unknown"
    }
    unresolved_rights: list[str] = []
    excluded_sources: set[str] = set()
    source_updates: list[dict[str, str]] = []
    for source_id in sorted(unknown_rights_sources):
        review = source_reviews.get(source_id)
        if not review or review.get("rightsStatus") == "needs_research":
            unresolved_rights.append(source_id)
            blockers.append(
                {
                    "type": "source_rights_unresolved",
                    "recordId": source_id,
                    "message": "Source rights still need a human decision.",
                }
            )
            continue
        rights_status = review.get("rightsStatus")
        if rights_status not in RIGHTS_DECISIONS:
            raise ReviewReleaseError(
                f"source review {source_id} has an invalid rightsStatus"
            )
        if rights_status == "exclude":
            excluded_sources.add(source_id)
        if rights_status == "resolved" and review.get("sourceLicense") in {
            None,
            "",
            "unknown",
        }:
            blockers.append(
                {
                    "type": "source_license_missing",
                    "recordId": source_id,
                    "message": "Resolved source rights need a specific licence.",
                }
            )
        source_updates.append(
            {
                "sourceId": source_id,
                "rightsStatus": rights_status,
                "sourceLicense": str(review.get("sourceLicense") or ""),
                "independenceClass": str(review.get("independenceClass") or ""),
            }
        )

    keep: list[str] = []
    amend: list[dict[str, str]] = []
    remove: list[str] = []
    add_assertions: list[dict[str, str]] = []
    decision_counts = {decision: 0 for decision in sorted(DECISIONS)}
    for assertion_id in sorted(reviews):
        review = reviews[assertion_id]
        assertion = all_assertions[assertion_id]
        is_promoted = assertion_id in promoted_assertions
        decision = review.get("decision")
        if decision not in DECISIONS:
            raise ReviewReleaseError(
                f"assertion review {assertion_id} has an invalid decision"
            )
        decision_counts[decision] += 1
        if decision != "needs_evidence" and (
            review.get("sourceChecked") is not True
            or review.get("safetyChecked") is not True
        ):
            blockers.append(
                {
                    "type": "review_checks_incomplete",
                    "recordId": assertion_id,
                    "message": "Source and safety checks must both be confirmed.",
                }
            )
        if decision == "needs_evidence":
            blockers.append(
                {
                    "type": "more_evidence_needed",
                    "recordId": assertion_id,
                    "message": "Assertion is not ready for a reviewed release.",
                }
            )
            continue
        if decision == "reject":
            if not is_promoted:
                remove.append(assertion_id)
            continue
        if assertion.get("sourceId") in excluded_sources:
            blockers.append(
                {
                    "type": "accepted_assertion_uses_excluded_source",
                    "recordId": assertion_id,
                    "message": "Accept or amend conflicts with the source exclusion.",
                }
            )
            continue
        if decision == "amend":
            proposed_value = review.get("proposedValue")
            if not isinstance(proposed_value, str) or not proposed_value.strip():
                raise ReviewReleaseError(
                    f"amended assertion {assertion_id} has no proposedValue"
                )
            amendment = {
                "assertionId": assertion_id,
                "subjectType": str(assertion.get("subjectType") or ""),
                "subjectId": str(assertion.get("subjectId") or ""),
                "predicate": str(assertion.get("predicate") or ""),
                "currentValue": str(assertion.get("value") or ""),
                "proposedValue": proposed_value,
                "proposedEvidenceStatus": str(
                    review.get("proposedEvidenceStatus")
                    or assertion.get("evidenceStatus")
                    or ""
                ),
            }
            if is_promoted:
                add_assertions.append(
                    canonical_candidate_assertion(
                        assertion,
                        value=proposed_value,
                        evidence_status=amendment["proposedEvidenceStatus"],
                    )
                )
            elif (
                amendment["proposedValue"] == amendment["currentValue"]
                and amendment["proposedEvidenceStatus"]
                == str(assertion.get("evidenceStatus") or "")
            ):
                keep.append(assertion_id)
            else:
                amend.append(amendment)
        else:
            if is_promoted:
                add_assertions.append(canonical_candidate_assertion(assertion))
            else:
                keep.append(assertion_id)

    added_source_ids = {item["sourceId"] for item in add_assertions}
    add_sources = [
        canonical_candidate_source(
            promoted_sources[source_id], source_reviews.get(source_id)
        )
        for source_id in sorted(added_source_ids)
        if source_id in promoted_sources and source_id not in excluded_sources
    ]
    release_shards = build_release_shards(add_assertions, promoted_assertions)
    candidate_contexts = []
    for candidate in bulk_candidates:
        review = candidate.get("review") or {}
        if review.get("decision") not in {"accept", "amend"}:
            continue
        row_id = candidate.get("id")
        row_assertions = [
            item
            for item in promoted_assertions.values()
            if item.get("rowId") == row_id
        ]
        if not row_assertions:
            blockers.append(
                {
                    "type": "candidate_assertions_missing",
                    "recordId": str(row_id or ""),
                    "message": "Approved candidate has no promoted assertions.",
                }
            )
            continue
        if any(item.get("id") not in reviews for item in row_assertions):
            continue
        candidate_contexts.append(
            {
                "rowId": str(row_id or ""),
                "importId": str(candidate.get("importId") or ""),
                "recordType": str(candidate.get("recordType") or ""),
                "effectivePayload": candidate.get("effectivePayload") or {},
            }
        )

    return {
        "schemaVersion": "1.1.0",
        "status": "blocked" if blockers else "ready_for_data_pr",
        "batchId": package.get("batchId", ""),
        "reviewPackageGeneratedAt": package.get("generatedAt", ""),
        "snapshotRelease": snapshot.get("release", {}),
        "summary": {
            "snapshotAssertions": len(assertions),
            "promotedAssertions": len(promoted_assertions),
            "bulkCandidates": len(bulk_candidates),
            "candidateIncluded": len(candidate_contexts),
            "candidateHeld": candidate_decision_counts["needs_evidence"],
            "candidateRejected": candidate_decision_counts["reject"],
            "candidateUndecided": len(bulk_candidates)
            - sum(candidate_decision_counts.values()),
            "assertionDecisions": len(reviews),
            "accepted": decision_counts["accept"],
            "amended": decision_counts["amend"],
            "rejected": decision_counts["reject"],
            "needsEvidence": decision_counts["needs_evidence"],
            "sourceDecisions": len(source_reviews),
            "unresolvedAssertions": len(unresolved_assertions),
            "unresolvedSourceRights": len(unresolved_rights),
            "blockers": len(blockers),
        },
        "actions": {
            "keepAssertionIds": keep,
            "amendAssertions": amend,
            "removeAssertionIds": remove,
            "sourceUpdates": source_updates,
            "candidateContexts": candidate_contexts,
            "excludedCandidateRows": excluded_candidate_rows,
            "addSources": add_sources,
            "addAssertions": add_assertions,
            "releaseShards": release_shards,
        },
        "blockers": blockers,
        "scopeNote": (
            f"{candidate_decision_counts['needs_evidence']} candidate "
            f"row{'s' if candidate_decision_counts['needs_evidence'] != 1 else ''} "
            f"{'are' if candidate_decision_counts['needs_evidence'] != 1 else 'is'} held "
            "outside this release pending further evidence."
            if candidate_decision_counts["needs_evidence"]
            else "No candidate rows are held for further evidence."
        ),
        "nextStep": (
            "Resolve the listed review blockers and export a new package."
            if blockers
            else "Apply the included actions to canonical tables in reviewed, bounded data pull requests."
        ),
        "publicationAuthorised": False,
    }


def build_release_shards(
    add_assertions: list[dict[str, str]],
    promoted_assertions: dict[str, dict[str, Any]],
    *,
    maximum_assertions: int = 100,
    maximum_entities: int = 25,
) -> list[dict[str, Any]]:
    by_row: dict[str, list[dict[str, str]]] = {}
    for assertion in add_assertions:
        original = promoted_assertions.get(assertion["id"])
        if not original:
            raise ReviewReleaseError(
                f"added assertion {assertion['id']} has no promoted record"
            )
        row_id = str(original.get("rowId") or "")
        if not row_id:
            raise ReviewReleaseError(
                f"promoted assertion {assertion['id']} has no rowId"
            )
        by_row.setdefault(row_id, []).append(assertion)

    row_groups = sorted(
        by_row.items(),
        key=lambda item: (
            str(promoted_assertions[item[1][0]["id"]].get("batchId") or ""),
            item[0],
        ),
    )
    shards: list[dict[str, Any]] = []
    current_rows: list[str] = []
    current_assertions: list[dict[str, str]] = []

    def finish_shard() -> None:
        if not current_assertions:
            return
        originals = [promoted_assertions[item["id"]] for item in current_assertions]
        entities = sorted(
            {
                f"{item.get('subjectType', '')}:{item.get('subjectId', '')}"
                for item in current_assertions
            }
        )
        source_ids = sorted({item["sourceId"] for item in current_assertions})
        shards.append(
            {
                "id": f"release-{len(shards) + 1:03d}",
                "sourceBatchIds": sorted(
                    {str(item.get("batchId") or "") for item in originals}
                ),
                "rowIds": list(current_rows),
                "entityCount": len(entities),
                "assertionCount": len(current_assertions),
                "sourceIds": source_ids,
                "assertionIds": [item["id"] for item in current_assertions],
            }
        )

    for row_id, row_assertions in row_groups:
        row_entities = {
            f"{item.get('subjectType', '')}:{item.get('subjectId', '')}"
            for item in row_assertions
        }
        if len(row_assertions) > maximum_assertions or len(row_entities) > maximum_entities:
            raise ReviewReleaseError(
                f"candidate row {row_id} exceeds the release shard limits"
            )
        proposed_assertions = [*current_assertions, *row_assertions]
        proposed_entities = {
            f"{item.get('subjectType', '')}:{item.get('subjectId', '')}"
            for item in proposed_assertions
        }
        if current_assertions and (
            len(proposed_assertions) > maximum_assertions
            or len(proposed_entities) > maximum_entities
        ):
            finish_shard()
            current_rows = []
            current_assertions = []
        current_rows.append(row_id)
        current_assertions.extend(sorted(row_assertions, key=lambda item: item["id"]))
    finish_shard()

    assigned_sources: set[str] = set()
    for shard in shards:
        shard["addSourceIds"] = [
            source_id
            for source_id in shard["sourceIds"]
            if source_id not in assigned_sources
        ]
        assigned_sources.update(shard["sourceIds"])
    return shards


def canonical_candidate_assertion(
    assertion: dict[str, Any],
    *,
    value: str | None = None,
    evidence_status: str | None = None,
) -> dict[str, str]:
    return {
        "id": str(assertion.get("id") or ""),
        "subjectType": str(assertion.get("subjectType") or ""),
        "subjectId": str(assertion.get("subjectId") or ""),
        "predicate": str(assertion.get("predicate") or ""),
        "value": value if value is not None else str(assertion.get("value") or ""),
        "sourceId": str(assertion.get("sourceId") or ""),
        "evidenceStatus": evidence_status
        if evidence_status is not None
        else str(assertion.get("evidenceStatus") or ""),
        "notes": str(assertion.get("notes") or ""),
    }


def canonical_candidate_source(
    source: dict[str, Any], review: dict[str, Any] | None = None
) -> dict[str, Any]:
    review = review or {}
    return {
        "id": str(source.get("id") or ""),
        "title": str(source.get("title") or ""),
        "publisher": str(source.get("publisher") or ""),
        "url": str(source.get("url") or ""),
        "sourceType": str(source.get("sourceType") or "web"),
        "independenceClass": str(
            review.get("independenceClass")
            or source.get("independenceClass")
            or "unknown"
        ),
        "sourceLicense": str(
            review.get("sourceLicense")
            or source.get("sourceLicense")
            or "unknown"
        ),
        "automationPermitted": False,
        "notes": str(source.get("notes") or ""),
    }


def main() -> int:
    args = parse_args()
    try:
        snapshot = json.loads(args.snapshot.read_text(encoding="utf-8"))
        package = json.loads(args.review_package.read_text(encoding="utf-8"))
        result = build_release_plan(snapshot, package)
    except (OSError, json.JSONDecodeError) as error:
        raise ReviewReleaseError(f"cannot read input: {error}") from error
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "status": result["status"],
                "blockers": result["summary"]["blockers"],
                "output": str(args.output),
                "publication_authorised": False,
            }
        )
    )
    return 0 if result["status"] == "ready_for_data_pr" else 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ReviewReleaseError as error:
        print(f"Review release planning failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
