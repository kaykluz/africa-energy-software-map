#!/usr/bin/env python3
"""Prepare a deterministic plan for the next candidate-only workbook batch."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_AUDIT = ROOT / "data" / "imports" / "kaykluz-v0.1" / "full-audit.json"
DEFAULT_OUTPUT = (
    ROOT / "data" / "research-queue" / "batch-002-plan.json"
)


class BatchPlanError(RuntimeError):
    """Raised when the next review batch cannot be planned safely."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit", type=Path, default=DEFAULT_AUDIT)
    parser.add_argument("--after", default="batch_001")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    return parser.parse_args()


def build_plan(audit: dict, after: str) -> dict:
    if audit.get("status") != "candidate_only":
        raise BatchPlanError("source audit must remain candidate_only")
    batches = audit.get("review_batches", [])
    current_index = next(
        (index for index, item in enumerate(batches) if item["id"] == after),
        None,
    )
    if current_index is None or current_index + 1 >= len(batches):
        raise BatchPlanError(f"no batch follows {after}")
    batch = batches[current_index + 1]
    if batch["entity_count"] > 25 or batch["assertion_count"] > 100:
        raise BatchPlanError("next batch exceeds the review-size limits")
    return {
        "schemaVersion": "1.0.0",
        "status": "planned_candidate_only",
        "sourceWorkbook": audit["source"],
        "afterBatch": after,
        "batch": {
            "id": batch["id"].replace("_", "-"),
            "organisationIds": batch["organisation_ids"],
            "entityCount": batch["entity_count"],
            "assertionCount": batch["assertion_count"],
        },
        "automation": {
            "permitted": [
                "privacy_filtered_import",
                "normalisation",
                "stable_id_matching",
                "duplicate_candidates",
                "schema_validation",
                "review_bundle_generation",
            ],
            "prohibited": [
                "verification",
                "publication",
                "default_branch_write",
            ],
        },
        "promotionBlockedUntil": [
            "source inspection",
            "assertion-level human review",
            "rights resolution",
            "reviewed data pull request",
        ],
        "publicationAuthorised": False,
    }


def serialized(value: dict) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False) + "\n"


def main() -> int:
    args = parse_args()
    try:
        audit = json.loads(args.audit.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise BatchPlanError(f"cannot read audit: {exc}") from exc
    result = serialized(build_plan(audit, args.after))
    if args.check:
        if args.output.read_text(encoding="utf-8") != result:
            raise BatchPlanError("committed Batch 002 plan is not reproducible")
        print("Batch 002 plan is reproducible and candidate-only.")
        return 0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(result, encoding="utf-8")
    print(
        json.dumps(
            {
                "status": "planned_candidate_only",
                "output": str(args.output),
                "publication_authorised": False,
            }
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BatchPlanError as error:
        print(f"Batch planning failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
