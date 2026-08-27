#!/usr/bin/env python3
"""Turn an agent web-sweep result into bounded, candidate-only review batches.

The sweep (see `docs/33-agent-web-sweep-intake.md`) fans research agents across
markets and themes. Agents return companies they read on a named page. This
script is the deterministic half: it never invents, it only filters, reconciles
and reshapes what the agents returned.

Three gates, in order:

1. **Shape** — drop rows missing a name, country or source URL, or carrying a
   role/segment id outside the taxonomy.
2. **Reconciliation** — drop rows whose name already exists in the published
   catalogue, and collapse duplicates within the sweep itself.
3. **Liveness** — resolve every `sourceUrl` and every claimed `website` over the
   network. A fabricated company usually announces itself as a domain that has
   never existed, so this is the main defence against a hallucinated row
   reaching a reviewer.

Nothing here authorises publication. Output batches are `candidateOnly`,
`publicationAuthorised: false`, `humanReviewRequired: true`, exactly like the
workbook intake, and every row lands as `needs_source_review`.

    python3 scripts/prepare_sweep_candidates.py \
        --sweep artifacts/sweep-results.json \
        --batch-dir data/intake/organisations/sweep-2026-08-epc-minigrid \
        --as-of 2026-08-26
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import socket
import ssl
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Iterable

REPO = Path(__file__).resolve().parent.parent
BATCH_LIMIT = 25
USER_AGENT = "africa-energy-atlas-sweep/1.0 (+https://map.kaykluz.com)"
TIMEOUT = 12


# ── normalisation ───────────────────────────────────────────────────────────

def normalise_name(value: str) -> str:
    """Fold a company name for comparison only. Never stored."""
    text = (value or "").strip().lower()
    text = re.sub(r"[‘’“”]", "", text)
    text = re.sub(r"\b(ltd|limited|plc|inc|llc|gmbh|sarl|sa|pty|cc|co|company|group|holdings|enterprises|nigeria|kenya|ghana)\b", " ", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def slug(value: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "_", (value or "").lower()).strip("_")
    return text[:40] or "record"


def host_of(url: str) -> str:
    match = re.match(r"https?://([^/?#]+)", (url or "").strip(), re.I)
    return match.group(1).lower().removeprefix("www.") if match else ""


# ── liveness ────────────────────────────────────────────────────────────────

def resolves(url: str) -> bool:
    """True when the URL answers at all.

    Any HTTP status counts as existing — a 403 or 404 still proves the host is
    real, which is what distinguishes a live company from a fabricated one. Only
    DNS failure, connection refusal or timeout count as absent.
    """
    if not url or not url.lower().startswith(("http://", "https://")):
        return False
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT}, method="GET")
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE  # a bad cert still proves the host exists
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT, context=context):
            return True
    except urllib.error.HTTPError:
        return True
    except (urllib.error.URLError, socket.timeout, ssl.SSLError, ConnectionError, OSError):
        return False
    except Exception:
        return False


def check_all(urls: Iterable[str]) -> dict[str, bool]:
    unique = sorted({u for u in urls if u})
    if not unique:
        return {}
    with ThreadPoolExecutor(max_workers=12) as pool:
        return dict(zip(unique, pool.map(resolves, unique)))


# ── natural persons ─────────────────────────────────────────────────────────
#
# Installer registers are the richest source of EPC coverage and the most
# dangerous, because several certify PEOPLE rather than firms. South Africa's
# PV GreenCard and Uganda's ERA permit register both issue to named
# individuals. A personal name in an organisation catalogue is a privacy
# breach, and the liveness gate cannot catch it: a sole trader with no website
# is indistinguishable from a company with no website.
#
# The heuristic below FLAGS but does not drop. That is deliberate. Run against
# the first sweep it flagged 31 of 724 rows, of which about thirty were plainly
# businesses whose form it did not recognise — Afrikaans trading terms
# (`Elektries`, `Sonkrag`, `Konsult`), and ordinary names carrying no legal
# suffix (`Dorper Wind Farm`, `BURN MANUFACTURING`). An auto-drop would have
# deleted real companies to remove one person. So the machine narrows the field
# and a human decides, with the decision recorded here where it can be audited.

BUSINESS_MARKERS = (
    r"(ltd|pty|\(pty\)|cc\b|plc|inc\b|llc|gmbh|sarl|enterprise|solar|energy|energie|"
    r"electric|elektr|sonkrag|engineer|group|holding|service|solution|technolog|technik|"
    r"system|project|trading|construction|power|renewable|contractor|install|manufactur|"
    r"t/a|&|company|corp|limited|associates|consult|konsult|industr|supplies|ventures|"
    r"investment|works|international|tech\b|electronic|institute|platform|farm|impact|"
    r"design|computing|africa|sa\b)"
)
TITLE_PREFIX = r"^(mr|mrs|ms|dr|eng|engr|prof|miss)\b\.?\s"

# Names a human confirmed are natural persons, not businesses. Dropped outright.
# Add to this list only after looking at the source page.
PERSONAL_NAMES_CONFIRMED = {
    "lucky rakale",   # PV GreenCard: given name + surname, no trading name
    "aj faber",       # PV GreenCard: initials + surname, no trading name
}


def flag_personal(name: str) -> bool:
    """True when a name might belong to a natural person and needs human eyes."""
    text = (name or "").strip()
    if not text:
        return False
    if re.search(TITLE_PREFIX, text.lower()):
        return True
    if re.search(BUSINESS_MARKERS, text.lower()):
        return False
    words = [w for w in re.split(r"\s+", text) if w]
    if not 2 <= len(words) <= 3:
        return False
    return all(re.fullmatch(r"[A-Za-z'\u2019\-.]+", w) for w in words)


# ── taxonomy ────────────────────────────────────────────────────────────────

def load_taxonomy() -> tuple[set[str], set[str], dict[str, str]]:
    data = json.loads((REPO / "data" / "taxonomy.json").read_text())
    roles = {r["id"] for r in data.get("organisation_roles", []) if isinstance(r, dict)}
    segments = {s["id"] for s in data.get("organisation_segments", []) if isinstance(s, dict)}
    # Role -> ecosystem group, so the suggested group is derived rather than guessed.
    group_for = {
        "org_role_epc": "org_group_epcs",
        "org_role_installer": "org_group_epcs",
        "org_role_system_integrator": "org_group_epcs",
        "org_role_developer_ipp": "org_group_developers",
        "org_role_om_asset_manager": "org_group_operators",
        "org_role_energy_service_company": "org_group_operators",
        "org_role_equipment_supplier": "org_group_oems",
        "org_role_distributor": "org_group_oems",
        "org_role_to_classify": "org_group_epcs",
    }
    return roles, segments, group_for


def existing_names() -> set[str]:
    """Normalised names already in the published catalogue."""
    catalogue = REPO.parent / "africa-energy-atlas" / "src" / "data" / "catalog.json"
    if not catalogue.exists():
        return set()
    data = json.loads(catalogue.read_text())
    return {normalise_name(c.get("name", "")) for c in data.get("companies", []) if c.get("name")}


# ── build ───────────────────────────────────────────────────────────────────

def collect(sweep: dict) -> list[dict]:
    rows: list[dict] = []
    for market in sweep.get("perMarket", []):
        for company in market.get("companies", []):
            rows.append({**company, "_market": market.get("market", "")})
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sweep", required=True, type=Path)
    parser.add_argument("--batch-dir", required=True, type=Path)
    parser.add_argument("--as-of", required=True)
    parser.add_argument("--skip-liveness", action="store_true",
                        help="Skip network checks. For offline dry runs only — never for a batch a reviewer will see.")
    args = parser.parse_args()

    raw = args.sweep.read_bytes()
    sweep = json.loads(raw)
    rows = collect(sweep)
    roles, segments, group_for = load_taxonomy()
    known = existing_names()

    rejected: list[dict] = []
    kept: list[dict] = []
    seen: dict[str, dict] = {}

    for row in rows:
        name = (row.get("name") or "").strip()
        source_url = (row.get("sourceUrl") or "").strip()
        iso = (row.get("countryIso2") or "").strip().upper()
        row_roles = [r for r in (row.get("roles") or []) if r in roles]

        if not name or not source_url or len(iso) != 2:
            rejected.append({**row, "_reason": "missing name, sourceUrl or ISO2 country"})
            continue
        if not row_roles:
            rejected.append({**row, "_reason": "no role id inside the taxonomy"})
            continue

        key = normalise_name(name)
        if not key:
            rejected.append({**row, "_reason": "name normalises to empty"})
            continue
        if key in known:
            rejected.append({**row, "_reason": "already in the published catalogue"})
            continue
        if key in PERSONAL_NAMES_CONFIRMED:
            # Privacy boundary: never publish a natural person as an organisation.
            rejected.append({**row, "_reason": "confirmed natural person, not a business"})
            continue
        if flag_personal(name):
            row["_flaggedPersonal"] = True
        if key in seen:
            # Same company from two markets — merge countries rather than duplicate.
            seen[key].setdefault("_alsoCountries", []).append(iso)
            continue

        row["_roles"] = row_roles
        row["_segments"] = [s for s in (row.get("segments") or []) if s in segments]
        row["_iso"] = iso
        seen[key] = row
        kept.append(row)

    # Liveness — the hallucination gate.
    live: dict[str, bool] = {}
    if not args.skip_liveness:
        live = check_all([r.get("sourceUrl", "") for r in kept] + [r.get("website", "") for r in kept])

    verified: list[dict] = []
    for row in kept:
        source_ok = live.get(row.get("sourceUrl", ""), True)
        site = (row.get("website") or "").strip()
        site_ok = live.get(site, True) if site else None
        if not args.skip_liveness and not source_ok:
            rejected.append({**row, "_reason": "sourceUrl did not resolve"})
            continue
        if site and not args.skip_liveness and not site_ok:
            # Keep the company but drop the unverifiable URL rather than publish it.
            row["website"] = ""
            row["_websiteDropped"] = site
        verified.append(row)

    # Emit bounded batches.
    args.batch_dir.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(raw).hexdigest()
    batches = [verified[i:i + BATCH_LIMIT] for i in range(0, len(verified), BATCH_LIMIT)]

    for index, batch in enumerate(batches, start=1):
        candidates = []
        for position, row in enumerate(batch, start=1):
            name = row["name"].strip()
            row_digest = hashlib.sha256(f"{row['_market']}|{name}|{row['sourceUrl']}".encode()).hexdigest()[:8]
            countries = sorted({row["_iso"], *row.get("_alsoCountries", [])})
            candidates.append({
                "candidateId": f"cand_org_{slug(name)}_{row_digest}",
                "sourceRow": position,
                "submittedName": name,
                "submittedWebsite": row.get("website", ""),
                "submittedHeadquarters": ", ".join(countries),
                "submittedStakeholderType": "EPC/Installer",
                "submittedSegments": row["_segments"],
                "submittedOwnershipType": "",
                "submittedScaleIndicator": "",
                "submittedNotes": row.get("evidenceNote", "")[:500],
                "recordShape": "organisation",
                "suggestedActorGroupId": group_for.get(row["_roles"][0], "org_group_epcs"),
                "suggestedRoleIds": row["_roles"],
                "suggestedSegmentIds": row["_segments"],
                "sourceLeads": [row["sourceUrl"]],
                "reconciliation": {"status": "new_candidate", "matchedOn": "none"},
                "reviewState": "needs_source_review",
            })

        payload = {
            "schemaVersion": "1.0.0",
            "batchId": f"{args.batch_dir.name}-{index:03d}",
            "status": {"candidateOnly": True, "publicationAuthorised": False, "humanReviewRequired": True},
            "source": {"kind": "agent_web_sweep", "asOf": args.as_of, "sha256": digest},
            "inventorySummary": {
                "rowsParsed": len(rows),
                "canonicalMatches": 0,
                "catalogueMatches": sum(1 for r in rejected if r.get("_reason", "").startswith("already")),
                "newCandidates": len(verified),
                "ambiguous": 0,
                "needsSplit": 0,
            },
            "candidates": candidates,
        }
        path = args.batch_dir / f"batch-{index:03d}.json"
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")

    (args.batch_dir / "rejected.json").write_text(
        json.dumps(rejected, indent=2, ensure_ascii=False) + "\n"
    )
    flagged = [
        {"name": r.get("name"), "sourceUrl": r.get("sourceUrl"), "country": r.get("_iso")}
        for r in verified if r.get("_flaggedPersonal")
    ]
    (args.batch_dir / "flagged-personal.json").write_text(
        json.dumps(flagged, indent=2, ensure_ascii=False) + "\n"
    )

    print(f"raw rows            {len(rows)}")
    print(f"rejected            {len(rejected)}")
    for reason in sorted({r["_reason"] for r in rejected}):
        print(f"  - {reason}: {sum(1 for r in rejected if r['_reason'] == reason)}")
    print(f"candidates written  {len(verified)} across {len(batches)} batch file(s)")
    print(f"websites dropped    {sum(1 for r in verified if r.get('_websiteDropped'))} (did not resolve)")
    print(f"flagged as possible natural persons: {len(flagged)} -> flagged-personal.json (kept; needs human eyes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
