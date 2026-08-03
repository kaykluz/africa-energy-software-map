#!/usr/bin/env python3
"""Import the allowlisted public fields from the Phase 1 catalogue CSV files.

The source files remain outside the repository. Free-form notes, confidence
scores, and any contributor-relationship metadata are intentionally excluded.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SHARD_DIR = ROOT / "data" / "landscape" / "shards"
GENERATED_GLOB = "phase1-catalogue-*.json"

STAGE_MAP = {
    "plan_and_design": ["stage_plan_design"],
    "finance_and_procure": ["stage_finance_procure"],
    "generate_and_store": ["stage_generate_store"],
    "transmit_and_distribute": ["stage_transmit_distribute"],
    "meter_and_serve": ["stage_meter_serve"],
    "trade_and_report": ["stage_trade_report"],
    "cross_cutting_data": [],
}

CATEGORY_MAP = {
    "asset_monitoring_apm": "cat_generation_storage_operations",
    "pv_design_simulation": "cat_engineering_design_simulation",
    "ems_derms_orchestration": "cat_forecasting_flexibility_der",
    "power_system_engineering": "cat_engineering_design_simulation",
    "paygo_consumer_finance": "cat_paygo_minigrid_operations",
    "emobility_productive_use": "cat_emobility_battery_networks",
    "metering_ami_hes": "cat_retail_metering_billing_payments",
    "carbon_mrv_registry": "cat_carbon_mrv_reporting",
    "mdm_vending_payment_rails": "cat_retail_metering_billing_payments",
    "electrification_geospatial_planning": "cat_planning_geospatial",
    "market_settlement_trading": "cat_trading_wheeling_settlement",
    "scada_ems_adms": "cat_distribution_utility_operations",
    "customer_apps_engagement": "cat_retail_metering_billing_payments",
    "hybrid_offgrid_design": "cat_engineering_design_simulation",
    "resource_thermal_storage_design": "cat_engineering_design_simulation",
    "reporting_data_platforms": "cat_data_interoperability_security",
    "iot_data_interoperability": "cat_data_interoperability_security",
    "outage_gis_workforce": "cat_distribution_utility_operations",
    "utility_erp_cis_billing": "cat_retail_metering_billing_payments",
    "minigrid_operations": "cat_paygo_minigrid_operations",
    "forecasting": "cat_forecasting_flexibility_der",
    "procurement_marketplace": "cat_finance_procurement_underwriting",
    "project_finance_modelling": "cat_finance_procurement_underwriting",
    "ppa_wheeling_retail": "cat_trading_wheeling_settlement",
    "clean_cooking": "cat_paygo_minigrid_operations",
    "buildings_efficiency_modelling": "cat_ci_behind_meter",
    "loss_reduction_revenue_protection": "cat_distribution_utility_operations",
    "grid_cybersecurity": "cat_data_interoperability_security",
    "telecom_critical_infra_energy": "cat_ci_behind_meter",
    "grant_rbf_administration": "cat_finance_procurement_underwriting",
}

CATEGORY_SECTORS = {
    "cat_planning_geospatial": ["sector_power_utilities"],
    "cat_engineering_design_simulation": ["sector_generation_storage"],
    "cat_finance_procurement_underwriting": ["sector_markets_finance_carbon"],
    "cat_generation_storage_operations": ["sector_generation_storage"],
    "cat_transmission_system_operation": ["sector_power_utilities"],
    "cat_distribution_utility_operations": ["sector_power_utilities"],
    "cat_forecasting_flexibility_der": ["sector_power_utilities", "sector_generation_storage"],
    "cat_paygo_minigrid_operations": ["sector_distributed_energy_access"],
    "cat_retail_metering_billing_payments": ["sector_power_utilities"],
    "cat_ci_behind_meter": ["sector_commercial_industrial"],
    "cat_emobility_battery_networks": ["sector_emobility_batteries"],
    "cat_trading_wheeling_settlement": ["sector_markets_finance_carbon"],
    "cat_carbon_mrv_reporting": ["sector_markets_finance_carbon"],
    "cat_data_interoperability_security": ["sector_power_utilities"],
}

SEGMENT_SECTOR_PATTERNS = {
    "sector_power_utilities": re.compile(
        r"\b(?:utility|transmission|distribution|t&d|grid|ami|prepaid|substation|dispatch)\b",
        re.I,
    ),
    "sector_distributed_energy_access": re.compile(
        r"\b(?:mini-grid|off-grid|shs|payg|clean cooking|productive use|energy access)\b",
        re.I,
    ),
    "sector_generation_storage": re.compile(
        r"\b(?:generation|storage|solar|pv|wind|hydro|geothermal|csp|thermal|biomass|renewables)\b",
        re.I,
    ),
    "sector_commercial_industrial": re.compile(
        r"\b(?:c&i|commercial|industrial|building|telecom|tower|data centre|corporate|sme|facilities)\b",
        re.I,
    ),
    "sector_emobility_batteries": re.compile(
        r"\b(?:e-mobility|ev|battery swap|fleet|transit)\b",
        re.I,
    ),
    "sector_markets_finance_carbon": re.compile(
        r"\b(?:finance|market|trading|ppa|wheeling|recs|carbon|investment|registry)\b",
        re.I,
    ),
}

PRIVATE_EDITORIAL_PATTERNS = [
    re.compile(r"\b(?:map|dataset|project) maintainer\b", re.I),
    re.compile(r"\bmaintainer(?:'s)? (?:product|company|organisation)\b", re.I),
    re.compile(r"\b(?:owned|founded|built) by (?:me|the maintainer)\b", re.I),
    re.compile(r"\b(?:i|we) own\b", re.I),
    re.compile(r"\b(?:our|my) (?:company|product|competitor)\b", re.I),
    re.compile(r"\bcompetitor(?: of| to)? (?:the map|maintainer|us|me)\b", re.I),
    re.compile(r"\brecus(?:e|al|ed)\b", re.I),
    re.compile(r"\bconflict of interest\b", re.I),
    re.compile(r"\bnot graded\b", re.I),
    re.compile(r"\bdisclosure:\s", re.I),
]

AFRICA_USE_VALUES = {
    "confirmed_deployment",
    "marketed_to_africa",
    "africa_usage_likely_unverified",
    "no_africa_evidence_found",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("catalogue", type=Path)
    parser.add_argument("graveyard", type=Path)
    parser.add_argument("--shard-size", type=int, default=25)
    return parser.parse_args()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return [
            {key: (value or "").strip() for key, value in row.items()}
            for row in csv.DictReader(handle)
        ]


def normalise_name(value: str) -> str:
    value = value.casefold().replace("&", " and ")
    return " ".join(re.sub(r"[^a-z0-9]+", " ", value).split())


def split_values(value: str) -> list[str]:
    return list(dict.fromkeys(part.strip() for part in value.split(";") if part.strip()))


def public_url(value: str) -> str:
    value = value.strip()
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    return value


def source_domain(value: str) -> str:
    parsed = urlparse(value)
    domain = parsed.netloc.casefold().split("@")[-1].split(":")[0]
    return domain.removeprefix("www.")


def submitted_source_values(value: str) -> tuple[list[str], list[str]]:
    domains: list[str] = []
    urls: list[str] = []
    domain_pattern = re.compile(
        r"^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$",
        re.I,
    )
    for part in split_values(value):
        url = public_url(part)
        if url:
            urls.append(url)
            domains.append(source_domain(url))
        elif domain_pattern.fullmatch(part):
            domains.append(part.casefold().removeprefix("www."))
    return list(dict.fromkeys(domains)), list(dict.fromkeys(urls))


def sectors_for(category_id: str, segments: list[str]) -> list[str]:
    sectors = list(CATEGORY_SECTORS[category_id])
    segment_text = " ".join(segments)
    for sector_id, pattern in SEGMENT_SECTOR_PATTERNS.items():
        if pattern.search(segment_text) and sector_id not in sectors:
            sectors.append(sector_id)
    return sectors


def ensure_public_safe(value: object, context: str) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            ensure_public_safe(child, f"{context}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            ensure_public_safe(child, f"{context}[{index}]")
    elif isinstance(value, str):
        if any(pattern.search(value) for pattern in PRIVATE_EDITORIAL_PATTERNS):
            raise ValueError(f"private editorial metadata blocked at {context}")


def item_from_row(row: dict[str, str]) -> dict[str, object]:
    stage_key = row["value_chain_stage"]
    category_key = row["category"]
    if stage_key not in STAGE_MAP:
        raise ValueError(f"unmapped stage: {stage_key}")
    if category_key not in CATEGORY_MAP:
        raise ValueError(f"unmapped category: {category_key}")
    if row["africa_evidence"] not in AFRICA_USE_VALUES:
        raise ValueError(f"unsupported Africa-use value: {row['africa_evidence']}")

    source_url = public_url(row["source_urls"])
    website = public_url(row["website"])
    urls = [source_url] if source_url else []
    domains = list(
        dict.fromkeys(source_domain(value) for value in [source_url, website] if value)
    )
    segments = split_values(row["segments_served"])
    delivery_models = split_values(row["deployment_type"])
    category_id = CATEGORY_MAP[category_key]
    geographies = [row["hq_country"]]
    if row["africa_evidence"] != "no_africa_evidence_found" and "Africa" not in geographies:
        geographies.append("Africa")

    record: dict[str, object] = {
        "id": f"land_phase1_{row['id'].removeprefix('aesm-').replace('-', '_')}",
        "name": row["product_name"],
        "kind": "product",
        "stageIds": STAGE_MAP[stage_key],
        "categoryIds": [category_id],
        "sectorIds": sectors_for(category_id, segments),
        "geographies": list(dict.fromkeys(value for value in geographies if value)),
        "statusAsSubmitted": row["lifecycle_status"],
        "summaryAsSubmitted": row["one_line_description"],
        "sourceDomains": domains,
        "segmentsAsSubmitted": segments,
        "deliveryModelsAsSubmitted": delivery_models,
        "commercialModelAsSubmitted": row["commercial_model"],
        "africaUseAsSubmitted": row["africa_evidence"],
        "asOfDate": row["as_of_date"],
    }
    if normalise_name(row["organisation"]) != normalise_name(row["product_name"]):
        record["parent"] = row["organisation"]
    if website:
        record["websiteAsSubmitted"] = website
    if urls:
        record["sourceUrls"] = urls
    ensure_public_safe(record, row["id"])
    return record


def relationship_from_row(row: dict[str, str]) -> dict[str, object]:
    source_domains, source_urls = submitted_source_values(row["source"])
    record: dict[str, object] = {
        "id": "",
        "name": f"{row['entity']} — {row['event']}",
        "subject": row["entity"],
        "eventAsSubmitted": row["event"],
        "dateAsSubmitted": row["date"],
        "sourceDomains": source_domains,
    }
    if source_urls:
        record["sourceUrls"] = source_urls
    ensure_public_safe(record, row["entity"])
    return record


def load_base_shards() -> list[tuple[Path, dict[str, object]]]:
    shards = []
    for path in sorted(SHARD_DIR.glob("*.json")):
        if path.match(GENERATED_GLOB):
            continue
        shards.append((path, json.loads(path.read_text(encoding="utf-8"))))
    return shards


def merge_list(target: dict[str, object], source: dict[str, object], key: str) -> None:
    values = [*(target.get(key, []) or []), *(source.get(key, []) or [])]
    if values:
        target[key] = list(dict.fromkeys(values))


def enrich_existing(target: dict[str, object], source: dict[str, object]) -> None:
    for key in ["stageIds", "categoryIds", "sectorIds", "geographies", "sourceDomains", "sourceUrls"]:
        merge_list(target, source, key)
    for key in [
        "segmentsAsSubmitted",
        "deliveryModelsAsSubmitted",
        "commercialModelAsSubmitted",
        "africaUseAsSubmitted",
        "asOfDate",
        "websiteAsSubmitted",
    ]:
        if source.get(key) not in (None, "", []):
            target[key] = source[key]
    if target.get("kind") != "organisation" and not target.get("parent") and source.get("parent"):
        target["parent"] = source["parent"]
    ensure_public_safe(target, str(target.get("id", "existing")))


def write_json(path: Path, payload: object) -> None:
    rendered = json.dumps(payload, indent=2, ensure_ascii=False)
    scalar_array = re.compile(
        r"\[\n(?P<body>(?:[ \t]+(?:\"(?:[^\"\\]|\\.)*\"|true|false|null|-?\d+(?:\.\d+)?)(?:,\n|\n))+)[ \t]*\]"
    )

    def compact(match: re.Match[str]) -> str:
        values = [line.strip().removesuffix(",") for line in match.group("body").splitlines()]
        return "[" + ", ".join(values) + "]"

    rendered = scalar_array.sub(compact, rendered)
    path.write_text(rendered + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    if not 1 <= args.shard_size <= 25:
        raise ValueError("shard size must be between 1 and 25")

    catalogue_rows = read_csv(args.catalogue)
    graveyard_rows = read_csv(args.graveyard)
    base_shards = load_base_shards()

    existing_items: dict[str, dict[str, object]] = {}
    existing_relationships: dict[str, dict[str, object]] = {}
    for _, shard in base_shards:
        for item in shard.get("items", []):
            for name in [item.get("name", ""), *item.get("aliases", [])]:
                existing_items[normalise_name(str(name))] = item
        for relationship in shard.get("relationships", []):
            existing_relationships[normalise_name(str(relationship.get("subject", "")))] = relationship

    additions: list[dict[str, object]] = []
    enriched = 0
    for row in catalogue_rows:
        item = item_from_row(row)
        existing = existing_items.get(normalise_name(str(item["name"])))
        if existing:
            enrich_existing(existing, item)
            enriched += 1
        else:
            additions.append(item)

    relationships: list[dict[str, object]] = []
    for row in graveyard_rows:
        relationship = relationship_from_row(row)
        if normalise_name(str(relationship["subject"])) in existing_relationships:
            continue
        relationship["id"] = f"land_rel_phase1_{len(relationships) + 1:03d}"
        relationships.append(relationship)

    for path, shard in base_shards:
        ensure_public_safe(shard, path.name)
        write_json(path, shard)
    for path in SHARD_DIR.glob(GENERATED_GLOB):
        path.unlink()

    records: list[tuple[str, dict[str, object]]] = [
        *(('items', item) for item in additions),
        *(('relationships', relationship) for relationship in relationships),
    ]
    source_as_of = max(row["as_of_date"] for row in catalogue_rows)
    for offset in range(0, len(records), args.shard_size):
        index = offset // args.shard_size + 1
        items: list[dict[str, object]] = []
        shard_relationships: list[dict[str, object]] = []
        for record_type, record in records[offset : offset + args.shard_size]:
            (items if record_type == "items" else shard_relationships).append(record)
        shard = {
            "schemaVersion": "1.0.0",
            "batchId": f"phase1-catalogue-{index:03d}",
            "sourceLabel": "Phase 1 catalogue build",
            "sourceAsOf": source_as_of,
            "items": items,
            "deploymentLeads": [],
            "relationships": shard_relationships,
        }
        ensure_public_safe(shard, str(index))
        write_json(SHARD_DIR / f"phase1-catalogue-{index:03d}.json", shard)

    print(
        json.dumps(
            {
                "sourceCatalogueRows": len(catalogue_rows),
                "enrichedExistingListings": enriched,
                "newListings": len(additions),
                "sourceHistoryRows": len(graveyard_rows),
                "existingHistoryEvents": len(graveyard_rows) - len(relationships),
                "newHistoryEvents": len(relationships),
                "generatedShards": (len(records) + args.shard_size - 1) // args.shard_size,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
