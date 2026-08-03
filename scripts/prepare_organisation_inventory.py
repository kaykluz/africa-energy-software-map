#!/usr/bin/env python3
"""Parse and conservatively reconcile a user-supplied organisation inventory."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SNAPSHOT = ROOT / "web" / "generated" / "registry-snapshot.json"
DEFAULT_LANDSCAPE = ROOT / "data" / "landscape" / "shards"
SECTION_GROUPS = {
    "FINANCIERS TABLE": "org_group_capital",
    "DEVELOPERS AND IPPs TABLE": "org_group_developers",
    "OEMs AND MANUFACTURERS TABLE": "org_group_oems",
    "EPCs AND INSTALLERS TABLE": "org_group_epcs",
    "OPERATORS AND UTILITIES TABLE": "org_group_operators",
    "SOFTWARE AND DATA ORGANISATIONS TABLE (new entries only)": "org_group_software",
    "ENABLERS TABLE": "org_group_enablers",
    "PUBLIC INSTITUTIONS TABLE": "org_group_public",
    "CONSOLIDATION AND GRAVEYARD TABLE": "",
}
STAKEHOLDER_ROLES = {
    "developer_ipp": ["org_role_developer_ipp"],
    "oem_manufacturer": ["org_role_oem_manufacturer"],
    "epc_installer": ["org_role_epc", "org_role_installer"],
    "operator_utility": ["org_role_operator_utility"],
    "software_data": ["org_role_data_provider"],
}
SEGMENT_IDS = {
    "utility_scale": "org_segment_utility_generation",
    "transmission_distribution": "org_segment_transmission_distribution",
    "mini_grid": "org_segment_minigrids",
    "minigrid": "org_segment_minigrids",
    "shs_paygo": "org_segment_shs_paygo",
    "commercial_industrial": "org_segment_commercial_industrial",
    "e_mobility": "org_segment_emobility",
    "storage": "org_segment_energy_storage",
    "clean_cooking": "org_segment_clean_cooking",
    "energy_efficiency": "org_segment_efficiency_demand",
    "productive_use": "org_segment_productive_use",
    "carbon_markets": "org_segment_carbon_markets",
}
PRIVATE_PATTERNS = (
    re.compile(r"\b(?:i|we) own\b", re.I),
    re.compile(r"\b(?:our|my) (?:company|product|competitor)\b", re.I),
    re.compile(r"\bconflict of interest\b", re.I),
    re.compile(r"\bdisclosure:\s", re.I),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--batch-id", default="phase2-organisations-001")
    parser.add_argument("--as-of", default="2026-08-03")
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    return parser.parse_args()


def normalise_name(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", ascii_value.lower()).strip()


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", normalise_name(value)).strip("_")[:48] or "unknown"


def domain(value: str) -> str:
    if not value.strip():
        return ""
    candidate = value.strip()
    if not re.match(r"^https?://", candidate, re.I):
        candidate = f"https://{candidate}"
    hostname = (urlparse(candidate).hostname or "").lower()
    return hostname.removeprefix("www.")


def source_leads(value: str) -> list[str]:
    leads = []
    for item in value.split(";"):
        host = domain(item)
        if host:
            leads.append(f"https://{host}/")
    return sorted(set(leads))


def sanitise(value: str) -> str:
    parts = [part.strip() for part in value.split(";")]
    parts = [part for part in parts if not re.fullmatch(r"confidence\s+(?:high|medium|low)", part, re.I)]
    result = "; ".join(part for part in parts if part)
    if any(pattern.search(result) for pattern in PRIVATE_PATTERNS):
        return "Private editorial note removed during intake."
    return result


def parse_inventory(path: Path) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    section = ""
    group_id = ""
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if line.startswith("## "):
            section = line[3:].strip()
            group_id = SECTION_GROUPS.get(section, "")
            continue
        if section not in SECTION_GROUPS or not line.startswith("- ") or " | " not in line:
            continue
        fields = [item.strip() for item in line[2:].split("|")]
        if section == "CONSOLIDATION AND GRAVEYARD TABLE":
            if len(fields) != 5:
                continue
            name, headquarters, segments, lifecycle, notes = fields
            rows.append({
                "line": line_number, "section": section, "group": group_id,
                "name": name, "website": "", "headquarters": headquarters,
                "stakeholder": "", "segments": segments, "ownership": "",
                "scale": lifecycle, "notes": notes,
            })
            continue
        if len(fields) != 8:
            continue
        name, website, headquarters, stakeholder, segments, ownership, scale, notes = fields
        rows.append({
            "line": line_number, "section": section, "group": group_id,
            "name": name, "website": website, "headquarters": headquarters,
            "stakeholder": stakeholder, "segments": segments, "ownership": ownership,
            "scale": scale, "notes": notes,
        })
    return rows


def load_indexes(snapshot_path: Path) -> tuple[dict, dict, dict, dict]:
    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
    canonical_by_name: dict[str, list[dict]] = {}
    canonical_by_domain: dict[str, list[dict]] = {}
    for item in snapshot["organisations"]:
        canonical_by_name.setdefault(normalise_name(item["name"]), []).append(item)
        host = domain(item.get("website", ""))
        if host:
            canonical_by_domain.setdefault(host, []).append(item)
    aliases: dict[str, list[dict]] = {}
    organisations = {item["id"]: item for item in snapshot["organisations"]}
    for item in snapshot.get("organisationAliases", []):
        organisation = organisations.get(item["organisationId"])
        if organisation:
            aliases.setdefault(normalise_name(item["alias"]), []).append(organisation)
    catalogue: dict[str, list[dict]] = {}
    for path in sorted(DEFAULT_LANDSCAPE.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        for item in payload.get("items", []):
            if item.get("kind") == "organisation":
                catalogue.setdefault(normalise_name(item.get("name", "")), []).append(item)
    return canonical_by_name, canonical_by_domain, aliases, catalogue


def record_shape(row: dict[str, object]) -> str:
    name = str(row["name"])
    if ";" in name or " / " in name:
        return "grouped_row"
    if row["section"] == "CONSOLIDATION AND GRAVEYARD TABLE":
        return "relationship_event"
    lowered = normalise_name(name)
    if "fund" in lowered:
        return "capital_vehicle"
    if any(token in lowered for token in ("facility", "electrifi", "sefa")):
        return "programme_or_facility"
    return "organisation"


def reconcile(row: dict[str, object], indexes: tuple[dict, dict, dict, dict]) -> dict[str, object]:
    canonical_by_name, canonical_by_domain, aliases, catalogue = indexes
    shape = record_shape(row)
    if shape == "grouped_row":
        return {"status": "needs_split", "matchedOn": "none"}
    key = normalise_name(str(row["name"]))
    matches = canonical_by_name.get(key, [])
    matched_on = "canonical_name"
    if not matches:
        matches = aliases.get(key, [])
        matched_on = "registered_alias"
    if not matches:
        website_matches = []
        for lead in source_leads(str(row["website"])):
            website_matches.extend(canonical_by_domain.get(domain(lead), []))
        matches = list({item["id"]: item for item in website_matches}.values())
        matched_on = "canonical_domain"
    if len(matches) == 1:
        return {
            "status": "canonical_match",
            "matchedOn": matched_on,
            "canonicalOrganisationId": matches[0]["id"],
        }
    if len(matches) > 1:
        return {"status": "ambiguous", "matchedOn": matched_on}
    catalogue_matches = catalogue.get(key, [])
    canonical_ids = set()
    for item in catalogue_matches:
        href = item.get("canonicalHref", "")
        if href.startswith("/organisations/"):
            target_slug = href.rsplit("/", 1)[-1]
            for candidates in canonical_by_name.values():
                canonical_ids.update(
                    candidate["id"] for candidate in candidates if candidate["slug"] == target_slug
                )
    if len(canonical_ids) == 1:
        return {
            "status": "canonical_match", "matchedOn": "catalogue_name",
            "canonicalOrganisationId": next(iter(canonical_ids)),
            "catalogueItemIds": sorted(item["id"] for item in catalogue_matches),
        }
    if catalogue_matches:
        return {
            "status": "catalogue_match", "matchedOn": "catalogue_name",
            "catalogueItemIds": sorted(item["id"] for item in catalogue_matches),
        }
    return {"status": "new_candidate", "matchedOn": "none"}


def candidate(row: dict[str, object], indexes: tuple[dict, dict, dict, dict]) -> dict[str, object]:
    name = str(row["name"])
    digest = hashlib.sha256(f"{row['section']}|{name}|{row['line']}".encode()).hexdigest()[:8]
    segments = [item.strip() for item in str(row["segments"]).split(";") if item.strip()]
    return {
        "candidateId": f"cand_org_{slug(name)}_{digest}",
        "sourceRow": row["line"],
        "submittedName": name,
        "submittedWebsite": str(row["website"]),
        "submittedHeadquarters": str(row["headquarters"]),
        "submittedStakeholderType": str(row["stakeholder"]),
        "submittedSegments": segments,
        "submittedOwnershipType": str(row["ownership"]),
        "submittedScaleIndicator": sanitise(str(row["scale"])),
        "submittedNotes": sanitise(str(row["notes"])),
        "recordShape": record_shape(row),
        "suggestedActorGroupId": str(row["group"]),
        "suggestedRoleIds": STAKEHOLDER_ROLES.get(str(row["stakeholder"]), []),
        "suggestedSegmentIds": sorted({SEGMENT_IDS[item] for item in segments if item in SEGMENT_IDS}),
        "sourceLeads": source_leads(str(row["website"])),
        "reconciliation": reconcile(row, indexes),
        "reviewState": "needs_source_review",
    }


def build_payload(args: argparse.Namespace) -> dict[str, object]:
    content = args.input.read_bytes()
    rows = parse_inventory(args.input)
    indexes = load_indexes(args.snapshot)
    candidates = [candidate(row, indexes) for row in rows]
    counts = Counter(item["reconciliation"]["status"] for item in candidates)
    selected = candidates[args.start : args.start + args.limit]
    return {
        "schemaVersion": "1.0.0",
        "batchId": args.batch_id,
        "status": {"candidateOnly": True, "publicationAuthorised": False, "humanReviewRequired": True},
        "source": {"kind": "user_supplied_inventory", "asOf": args.as_of, "sha256": hashlib.sha256(content).hexdigest()},
        "inventorySummary": {
            "rowsParsed": len(candidates),
            "canonicalMatches": counts["canonical_match"],
            "catalogueMatches": counts["catalogue_match"],
            "newCandidates": counts["new_candidate"],
            "ambiguous": counts["ambiguous"],
            "needsSplit": counts["needs_split"],
        },
        "candidates": selected,
    }


def main() -> int:
    args = parse_args()
    if args.limit < 1 or args.limit > 25 or args.start < 0:
        raise SystemExit("--limit must be 1..25 and --start must be non-negative")
    payload = build_payload(args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(payload["inventorySummary"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
