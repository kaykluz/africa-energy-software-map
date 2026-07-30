#!/usr/bin/env python3
"""Exercise registry filtering at the Phase 1 beta target scale."""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SNAPSHOT = ROOT / "web" / "generated" / "registry-snapshot.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument("--products", type=int, default=500)
    parser.add_argument("--deployments", type=int, default=2_000)
    parser.add_argument("--budget-ms", type=float, default=1_500)
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def scaled(items: list[dict], size: int, prefix: str) -> list[dict]:
    if not items:
        raise RuntimeError(f"cannot scale an empty {prefix} fixture")
    return [
        {
            **items[index % len(items)],
            "id": f"{prefix}_{index:05d}",
        }
        for index in range(size)
    ]


def main() -> int:
    args = parse_args()
    snapshot = json.loads(args.snapshot.read_text(encoding="utf-8"))
    products = scaled(snapshot["products"], args.products, "scale_product")
    deployments = scaled(
        snapshot["deployments"], args.deployments, "scale_deployment"
    )
    for index, deployment in enumerate(deployments):
        deployment["productId"] = products[index % len(products)]["id"]
    started = time.perf_counter()
    checks = 0
    for country in ["NG", "GH", "KE", "ZA", "SN", "ET", "TZ", "ZM"]:
        matching_deployments = [
            item for item in deployments if item.get("countryIso2") == country
        ]
        product_ids = {item["productId"] for item in matching_deployments}
        _ = [
            item
            for item in products
            if item["id"] in product_ids
            or country in item.get("deploymentCountries", [])
        ]
        checks += 1
    for phrase in ["grid", "meter", "energy", "data", "payment", "planning"]:
        lowered = phrase.lower()
        _ = [
            item
            for item in products
            if lowered
            in " ".join(
                [
                    item.get("name", ""),
                    item.get("organisation", ""),
                    item.get("description", ""),
                    item.get("category", ""),
                ]
            ).lower()
        ]
        checks += 1
    duration_ms = (time.perf_counter() - started) * 1_000
    report = {
        "status": "passed" if duration_ms <= args.budget_ms else "failed",
        "products": len(products),
        "deployments": len(deployments),
        "checks": checks,
        "durationMs": round(duration_ms, 2),
        "budgetMs": args.budget_ms,
        "publicationAuthorised": False,
    }
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8"
        )
    print(json.dumps(report))
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
