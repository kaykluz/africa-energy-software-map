#!/usr/bin/env python3
"""Build deterministic, proposal-only preparation for the review workspace."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SNAPSHOT = ROOT / "web" / "generated" / "registry-snapshot.json"
DEFAULT_OUTPUT = ROOT / "web" / "generated" / "review-assist.json"
SENSITIVE_PATTERN = re.compile(
    r"\b(?:latitude|longitude|coordinates?|password|secret|private key|token)\b",
    re.IGNORECASE,
)


class ReviewAssistError(RuntimeError):
    """Raised when safe review preparation cannot be generated."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--check",
        action="store_true",
        help="fail when the committed review-assist file is not reproducible",
    )
    return parser.parse_args()


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ReviewAssistError(f"cannot read {path}: {exc}") from exc


def build_review_assist(snapshot: dict) -> dict:
    sources = {source["id"]: source for source in snapshot["sources"]}
    groups: dict[str, list[dict]] = defaultdict(list)
    assists = []
    for assertion in snapshot["assertions"]:
        source = sources.get(assertion["sourceId"])
        if not source:
            raise ReviewAssistError(
                f"assertion {assertion['id']} references an unknown source"
            )
        signals = []
        priority = 3
        if source["sourceLicense"].strip().lower() in {"", "unknown"}:
            signals.append("rights_unresolved")
            priority = min(priority, 0)
        if not source.get("automationPermitted", False):
            signals.append("human_only_source")
        if source["independenceClass"] == "provider_authored":
            signals.append("provider_authored")
            priority = min(priority, 1)
        if assertion["evidenceStatus"] == "provider_claim_only":
            signals.append("provider_claim")
            priority = min(priority, 1)
        locator = assertion.get("notes", "")
        if "Source locator and limits:" not in locator:
            signals.append("missing_locator")
            priority = min(priority, 0)
        if SENSITIVE_PATTERN.search(
            f"{assertion.get('value', '')} {assertion.get('notes', '')}"
        ):
            signals.append("safety_review")
            priority = min(priority, 0)
        action = (
            "request_evidence"
            if {"rights_unresolved", "missing_locator"}.intersection(signals)
            else "editorial_review"
        )
        assist = {
            "assertionId": assertion["id"],
            "sourceId": assertion["sourceId"],
            "priority": priority,
            "recommendedAction": action,
            "signals": signals,
            "automationCanDecide": False,
        }
        assists.append(assist)
        groups[assertion["sourceId"]].append(assist)

    source_groups = []
    for source_id, assertions in groups.items():
        source = sources[source_id]
        source_groups.append(
            {
                "sourceId": source_id,
                "title": source["title"],
                "publisher": source["publisher"],
                "priority": min(item["priority"] for item in assertions),
                "rightsUnresolved": source["sourceLicense"].strip().lower()
                in {"", "unknown"},
                "automationPermitted": bool(
                    source.get("automationPermitted", False)
                ),
                "assertionIds": [
                    item["assertionId"]
                    for item in sorted(
                        assertions,
                        key=lambda item: (item["priority"], item["assertionId"]),
                    )
                ],
            }
        )
    source_groups.sort(
        key=lambda item: (item["priority"], item["publisher"], item["sourceId"])
    )
    assists.sort(key=lambda item: (item["priority"], item["assertionId"]))
    return {
        "schemaVersion": "1.0.0",
        "batchId": snapshot["release"]["sourceBatch"],
        "status": "proposal_only",
        "publicationAuthorised": False,
        "summary": {
            "assertions": len(assists),
            "sources": len(source_groups),
            "rightsFirst": sum(
                1 for item in source_groups if item["rightsUnresolved"]
            ),
            "requestEvidence": sum(
                1
                for item in assists
                if item["recommendedAction"] == "request_evidence"
            ),
        },
        "sourceGroups": source_groups,
        "assertions": assists,
    }


def serialized(value: dict) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False) + "\n"


def main() -> int:
    args = parse_args()
    result = serialized(build_review_assist(load_json(args.snapshot)))
    if args.check:
        try:
            current = args.output.read_text(encoding="utf-8")
        except OSError as exc:
            raise ReviewAssistError(
                f"cannot read committed review assist: {exc}"
            ) from exc
        if current != result:
            raise ReviewAssistError(
                "committed review-assist file differs from generated output"
            )
        print("Review preparation is reproducible and proposal-only.")
        return 0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(result, encoding="utf-8")
    print(
        json.dumps(
            {
                "status": "proposal_only",
                "output": str(args.output),
                "publication_authorised": False,
            }
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ReviewAssistError as error:
        print(f"Review preparation failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
