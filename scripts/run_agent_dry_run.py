#!/usr/bin/env python3
"""Run the repository-owned research agent in safe, proposal-only mode."""

from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--config",
        type=Path,
        default=ROOT / "agent" / "config" / "agent.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Run report path. Use a temporary or workflow-artifact path.",
    )
    parser.add_argument(
        "--now",
        help="Fixed ISO timestamp for tests. Defaults to the current UTC time.",
    )
    return parser.parse_args()


def approved_sources(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return [
            row
            for row in csv.DictReader(handle)
            if row["automation_permitted"].strip().lower() == "true"
            and row["status"].strip().lower() == "active"
        ]


def main() -> int:
    args = parse_args()
    config = json.loads(args.config.read_text(encoding="utf-8"))
    if config["mode"] != "dry_run" or not config["human_review_required"]:
        raise RuntimeError("agent must remain dry-run and human-review-only")
    source_path = ROOT / config["source_register"]
    sources = approved_sources(source_path)[: config["limits"]["max_sources_per_run"]]
    timestamp = args.now or datetime.now(timezone.utc).isoformat().replace(
        "+00:00", "Z"
    )
    report = {
        "run_id": f"dry_run_{timestamp[:10].replace('-', '')}",
        "started_at": timestamp,
        "finished_at": timestamp,
        "runtime": "github-actions-policy-runner",
        "model": "none-policy-readiness-only",
        "prompt_versions": [
            "01-discover.md",
            "02-extract.md",
            "03-corroborate.md",
        ],
        "source_ids": [row["id"] for row in sources],
        "candidate_count": 0,
        "rejected_count": 0,
        "error_count": 0,
        "dry_run": True,
        "notes": (
            "No source content was fetched and no candidates were created. "
            "Only source-register rows explicitly approved for automation are "
            "eligible for a future adapter run."
        ),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
