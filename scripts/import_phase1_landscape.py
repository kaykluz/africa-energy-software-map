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

FUNCTION_MAP = {
    "asset_monitoring_apm": "func_asset_monitoring_apm",
    "pv_design_simulation": "func_pv_design",
    "ems_derms_orchestration": "func_derms_orchestration",
    "power_system_engineering": "func_engineering_power_systems",
    "paygo_consumer_finance": "func_paygo_consumer_finance",
    "metering_ami_hes": "func_metering_ami_hes",
    "carbon_mrv_registry": "func_carbon_mrv_registry",
    "electrification_geospatial_planning": "func_electrification_geospatial",
    "market_settlement_trading": "func_market_settlement_trading",
    "scada_ems_adms": "func_scada_ems_adms",
    "customer_apps_engagement": "func_customer_apps_engagement",
    "hybrid_offgrid_design": "func_hybrid_offgrid_design",
    "resource_thermal_storage_design": "func_resource_generation_storage_design",
    "reporting_data_platforms": "func_energy_data_reporting",
    "outage_gis_workforce": "func_outage_gis_workforce",
    "minigrid_operations": "func_minigrid_operations",
    "forecasting": "func_forecasting",
    "procurement_marketplace": "func_procurement_marketplaces",
    "project_finance_modelling": "func_project_finance_modelling",
    "ppa_wheeling_retail": "func_ppa_wheeling_retail",
    "clean_cooking": "func_clean_cooking",
    "buildings_efficiency_modelling": "func_building_energy_management",
    "loss_reduction_revenue_protection": "func_loss_reduction_revenue_protection",
    "grid_cybersecurity": "func_grid_cybersecurity",
    "telecom_critical_infra_energy": "func_telecom_power_management",
    "grant_rbf_administration": "func_grant_rbf_administration",
}

CATEGORY_FUNCTIONS = {
    "cat_planning_geospatial": ["func_electrification_geospatial"],
    "cat_engineering_design_simulation": ["func_engineering_power_systems"],
    "cat_finance_procurement_underwriting": ["func_project_finance_modelling"],
    "cat_generation_storage_operations": ["func_asset_monitoring_apm"],
    "cat_transmission_system_operation": ["func_scada_ems_adms"],
    "cat_distribution_utility_operations": ["func_scada_ems_adms"],
    "cat_forecasting_flexibility_der": ["func_derms_orchestration"],
    "cat_paygo_minigrid_operations": ["func_paygo_consumer_finance"],
    "cat_retail_metering_billing_payments": ["func_metering_ami_hes"],
    "cat_ci_behind_meter": ["func_building_energy_management"],
    "cat_emobility_battery_networks": ["func_emobility_fleet_charging"],
    "cat_trading_wheeling_settlement": ["func_market_settlement_trading"],
    "cat_carbon_mrv_reporting": ["func_carbon_mrv_registry"],
    "cat_data_interoperability_security": ["func_energy_interoperability"],
}

GENERIC_PAYMENT_NAMES = {
    "airtel money",
    "dpo pay",
    "etranzact",
    "flutterwave",
    "m pesa",
    "mtn momo",
    "onafriq",
    "opay",
    "palmpay",
    "paystack",
    "wave",
}

GENERAL_ENTERPRISE_NAMES = {"erpnext", "odoo"}
GENERAL_FINANCE_NAMES = {"anaplan", "modano", "quantrix modeler"}
GENERAL_PLANNING_NAMES = {
    "arcgis utility network",
    "atlas ai",
    "fraym",
    "google earth engine",
    "kartoza services and tooling",
    "openstreetmap power layer",
    "qgis",
    "sentinel hub",
}
GENERAL_MOBILITY_NAMES = {"geotab", "samsara"}
PUBLIC_CUSTOMER_APP_EXCEPTIONS = {"eskomsepush"}
APPLIED_CUSTOMER_APP_EXCEPTIONS = {"oracle opower"}
ENERGY_NATIVE_VENDING_NAMES = {"buypower"}

PUBLIC_OR_RESEARCH_PATTERN = re.compile(
    r"\b(?:african development bank|commission|community|department of energy|"
    r"developers?|esmap|government|iea|ifc|iiasa|irena|laborator(?:y|ies)|mit|"
    r"nerc|nrel|open source|open-source|research|sandia|university|world bank)\b",
    re.I,
)
OPERATOR_NAME_PATTERN = re.compile(
    r"\b(?:customer app|customer services|in-house|market systems|programme systems|"
    r"reporting portal|self-service app|services)$",
    re.I,
)

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


def function_ids_for_source(row: dict[str, str]) -> list[str]:
    category = row["category"]
    name = normalise_name(row["product_name"])
    text = " ".join(
        [row["product_name"], row["organisation"], row["one_line_description"], row["segments_served"]]
    ).casefold()

    if category == "mdm_vending_payment_rails":
        return [
            "func_payment_infrastructure"
            if name in GENERIC_PAYMENT_NAMES
            else "func_utility_vending_collections"
        ]
    if category == "utility_erp_cis_billing":
        return [
            "func_enterprise_business_systems"
            if name in GENERAL_ENTERPRISE_NAMES
            else "func_utility_cis_billing"
        ]
    if category == "iot_data_interoperability":
        if "openpaygo" in text or "enaccess" in text or "interoperability" in text:
            return ["func_energy_interoperability"]
        return ["func_iot_connectivity_platforms"]
    if category == "emobility_productive_use":
        if re.search(r"\b(?:agriculture|cold|farm|irrigation|productive use|pump|weather)\b", text):
            return ["func_productive_use_energy"]
        return ["func_emobility_fleet_charging"]
    function_id = FUNCTION_MAP.get(category)
    if not function_id:
        raise ValueError(f"unmapped function category: {category}")
    return [function_id]


def function_ids_for_item(item: dict[str, object]) -> list[str]:
    text = " ".join(
        [
            str(item.get("name", "")),
            str(item.get("parent", "")),
            str(item.get("summaryAsSubmitted", "")),
            " ".join(str(value) for value in item.get("segmentsAsSubmitted", []) or []),
        ]
    ).casefold()
    functions: list[str] = []
    for category_id in item.get("categoryIds", []) or []:
        candidates = list(CATEGORY_FUNCTIONS.get(str(category_id), []))
        if category_id == "cat_retail_metering_billing_payments":
            if re.search(r"\b(?:payment|wallet|bill|token|vending|collection)\b", text):
                candidates = ["func_utility_vending_collections"]
            elif re.search(r"\b(?:customer|self-service|status application|outage alert)\b", text):
                candidates = ["func_customer_apps_engagement"]
            elif re.search(r"\b(?:billing|cis)\b", text):
                candidates = ["func_utility_cis_billing"]
        elif category_id == "cat_data_interoperability_security":
            if re.search(r"\b(?:cyber|security|threat)\b", text):
                candidates = ["func_grid_cybersecurity"]
            elif re.search(r"\b(?:iot|connectivity|device cloud)\b", text):
                candidates = ["func_iot_connectivity_platforms"]
            elif re.search(r"\b(?:data|dataset|reporting|statistics|explorer)\b", text):
                candidates = ["func_energy_data_reporting"]
        elif category_id == "cat_distribution_utility_operations":
            if re.search(r"\b(?:loss|theft|revenue protection)\b", text):
                candidates = ["func_loss_reduction_revenue_protection"]
            elif re.search(r"\b(?:outage|workforce|field service|gis)\b", text):
                candidates = ["func_outage_gis_workforce"]
        elif category_id == "cat_paygo_minigrid_operations":
            if re.search(r"\bmini-grid|microgrid|grid monitoring\b", text):
                candidates = ["func_minigrid_operations"]
        elif category_id == "cat_finance_procurement_underwriting":
            if "procurement" in text:
                candidates = ["func_procurement_marketplaces"]
            elif re.search(r"\b(?:grant|rbf|results-based)\b", text):
                candidates = ["func_grant_rbf_administration"]
        elif category_id == "cat_trading_wheeling_settlement" and re.search(
            r"\b(?:ppa|wheeling|retail)\b", text
        ):
            candidates = ["func_ppa_wheeling_retail"]
        functions.extend(candidates)
    return list(dict.fromkeys(functions))


def energy_relationship_for(
    item: dict[str, object],
    function_ids: list[str],
    source_row: dict[str, str] | None = None,
) -> str:
    kind = str(item.get("kind", ""))
    name = normalise_name(str(item.get("name", "")))
    organisation = str(item.get("parent", ""))
    summary = str(item.get("summaryAsSubmitted", ""))
    text = " ".join([str(item.get("name", "")), organisation, summary])
    source_category = source_row.get("category", "") if source_row else ""

    if kind in {"public_tool", "source_directory"}:
        return "public_research"
    if kind == "research_lead":
        return "unclassified"
    if source_category == "customer_apps_engagement":
        if name in PUBLIC_CUSTOMER_APP_EXCEPTIONS:
            return "energy_native"
        if name in APPLIED_CUSTOMER_APP_EXCEPTIONS:
            return "energy_applied"
        return "operator_owned"
    if OPERATOR_NAME_PATTERN.search(str(item.get("name", ""))) or "in-house" in text.casefold():
        return "operator_owned"
    if PUBLIC_OR_RESEARCH_PATTERN.search(text):
        return "public_research"
    if "func_payment_infrastructure" in function_ids:
        return "enabling_infrastructure"
    if "func_iot_connectivity_platforms" in function_ids:
        return "enabling_infrastructure"
    if "func_enterprise_business_systems" in function_ids:
        return "enabling_infrastructure"
    if name in GENERAL_FINANCE_NAMES | GENERAL_PLANNING_NAMES | GENERAL_MOBILITY_NAMES:
        return "enabling_infrastructure"
    if "func_grid_cybersecurity" in function_ids or "func_utility_cis_billing" in function_ids:
        return "energy_applied"
    if "func_utility_vending_collections" in function_ids and name not in ENERGY_NATIVE_VENDING_NAMES:
        return "energy_applied"
    if source_category == "market_settlement_trading" and re.search(
        r"\b(?:power pool|market systems|trading)$", text, re.I
    ):
        return "operator_owned"
    if kind == "organisation" and re.search(
        r"\b(?:developer|operator|provider|distribution|energy services)\b", summary, re.I
    ) and "software" not in summary.casefold():
        return "operator_owned"
    return "energy_native"


def classification_for(
    item: dict[str, object], source_row: dict[str, str] | None = None
) -> dict[str, object]:
    function_ids = (
        function_ids_for_source(source_row) if source_row else function_ids_for_item(item)
    )
    return {
        "itemId": item["id"],
        "energyRelationship": energy_relationship_for(item, function_ids, source_row),
        "functionIds": function_ids,
    }


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

    catalogue_by_name = {
        normalise_name(row["product_name"]): row for row in catalogue_rows
    }
    all_items = [
        *(item for _, shard in base_shards for item in shard.get("items", [])),
        *additions,
    ]
    classifications = [
        classification_for(
            item,
            catalogue_by_name.get(normalise_name(str(item.get("name", "")))),
        )
        for item in all_items
    ]
    classification_payload = {
        "schemaVersion": "1.0.0",
        "method": "orthogonal-energy-relationship-and-function-taxonomy-v1",
        "items": sorted(classifications, key=lambda value: str(value["itemId"])),
    }
    ensure_public_safe(classification_payload, "landscape classifications")
    write_json(ROOT / "data" / "landscape" / "classifications.json", classification_payload)

    relationship_counts: dict[str, int] = {}
    for classification in classifications:
        relationship = str(classification["energyRelationship"])
        relationship_counts[relationship] = relationship_counts.get(relationship, 0) + 1

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
                "classifiedListings": len(classifications),
                "energyRelationshipCounts": dict(sorted(relationship_counts.items())),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
