#!/usr/bin/env python3
"""Rehearse D1-compatible backup and restore with synthetic local data.

This deliberately never connects to a remote database. It applies the checked-in
D1 migrations to SQLite, seeds every private table, creates a backup, simulates
data loss, restores into a clean database, and verifies integrity and content
fingerprints without printing row contents.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "web" / "drizzle"
EXPECTED_TABLES = {
    "assertion_reviews",
    "bulk_import_rows",
    "bulk_imports",
    "bulk_row_reviews",
    "contribution_contacts",
    "contribution_rate_limits",
    "contributions",
    "maintenance_runs",
    "organisation_catalogue_reviews",
    "promoted_assertions",
    "review_audit_events",
    "source_reviews",
    "system_settings",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--rto-seconds", type=float, default=900)
    return parser.parse_args()


def connect(path: Path) -> sqlite3.Connection:
    database = sqlite3.connect(path)
    database.execute("PRAGMA foreign_keys = ON")
    return database


def apply_migrations(database: sqlite3.Connection) -> list[str]:
    applied: list[str] = []
    for migration in sorted(MIGRATIONS.glob("*.sql")):
        database.executescript(
            migration.read_text(encoding="utf-8").replace(
                "--> statement-breakpoint", ""
            )
        )
        applied.append(migration.name)
    database.commit()
    return applied


def seed_synthetic_fixture(database: sqlite3.Connection) -> None:
    now = "2026-07-31T12:00:00Z"
    database.execute(
        """INSERT INTO contributions (
             id, submission_type, status, submitted_at, updated_at,
             product_name, organisation_name, evidence_url,
             sensitive_confirmed, status_token_hash
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            "synthetic-contribution",
            "product",
            "received",
            now,
            now,
            "Synthetic Grid Tool",
            "Synthetic Energy Lab",
            "https://example.invalid/evidence",
            0,
            "synthetic-token-hash",
        ),
    )
    database.execute(
        "INSERT INTO contribution_contacts VALUES (?, ?, ?)",
        (
            "synthetic-contribution",
            "synthetic@example.invalid",
            "2026-12-28T12:00:00Z",
        ),
    )
    database.execute(
        "INSERT INTO contribution_rate_limits VALUES (?, ?, ?)",
        ("synthetic-rate-key", now, 1),
    )
    database.execute(
        """INSERT INTO assertion_reviews (
             assertion_id, batch_id, decision, source_checked, safety_checked,
             reviewer_email, reviewed_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            "synthetic-assertion",
            "synthetic-batch",
            "needs_evidence",
            1,
            1,
            "editor@example.invalid",
            now,
            now,
        ),
    )
    database.execute(
        """INSERT INTO source_reviews (
             source_id, rights_status, source_license, independence_class,
             reviewer_email, reviewed_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            "synthetic-source",
            "resolved",
            "factual_metadata_and_linking_only",
            "independent_primary",
            "editor@example.invalid",
            now,
            now,
        ),
    )
    database.execute(
        """INSERT INTO review_audit_events (
             id, record_type, record_id, action, reason, reviewer_email,
             occurred_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            "synthetic-audit-event",
            "assertion",
            "synthetic-assertion",
            "reviewed",
            "Synthetic recovery fixture",
            "editor@example.invalid",
            now,
        ),
    )
    database.execute(
        "INSERT INTO system_settings VALUES (?, ?, ?, ?, ?)",
        ("intake_paused", "false", "editor@example.invalid", now, 1),
    )
    database.execute(
        """INSERT INTO maintenance_runs (
             id, status, started_at, finished_at, notes
           ) VALUES (?, ?, ?, ?, ?)""",
        (
            "synthetic-maintenance",
            "completed",
            now,
            now,
            "Synthetic recovery fixture",
        ),
    )
    database.execute(
        """INSERT INTO bulk_imports (
             id, original_filename, workbook_hash, payload_hash, status,
             uploaded_by, uploaded_at, row_count, entity_count,
             planned_batch_count, warnings_json, batch_plan_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            "synthetic-bulk-import",
            "synthetic.xlsx",
            "a" * 64,
            "b" * 64,
            "candidate",
            "editor@example.invalid",
            now,
            1,
            2,
            1,
            "[]",
            '[{"number":1}]',
        ),
    )
    database.execute(
        """INSERT INTO bulk_import_rows (
             id, import_id, row_number, row_key, record_type, payload_json,
             created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            "synthetic-bulk-row",
            "synthetic-bulk-import",
            4,
            "synthetic-row",
            "product",
            '{"row_key":"synthetic-row"}',
            now,
        ),
    )
    database.execute(
        """INSERT INTO bulk_row_reviews (
             row_id, decision, normalized_source_url, source_opened,
             source_direct, source_supports, safety_checked, notes,
             reviewer_email, reviewed_at, updated_at, version
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            "synthetic-bulk-row",
            "accept",
            "https://example.invalid/evidence",
            1,
            1,
            1,
            1,
            "Synthetic recovery fixture",
            "editor@example.invalid",
            now,
            now,
            1,
        ),
    )
    database.execute(
        """INSERT INTO organisation_catalogue_reviews (
             candidate_id, decision, amendments_json, normalized_source_url,
             source_opened, identity_confirmed, classifications_confirmed,
             safety_checked, notes, reviewer_email, reviewed_at, updated_at,
             version
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            "listing_afr_0002",
            "accept",
            "{}",
            "https://example.invalid/organisation",
            1,
            1,
            1,
            1,
            "Synthetic recovery fixture",
            "editor@example.invalid",
            now,
            now,
            1,
        ),
    )
    database.execute(
        """INSERT INTO promoted_assertions (
             id, row_id, import_id, batch_id, subject_type, subject_id,
             subject_label, subject_context, subject_href, predicate, value,
             source_id, source_title, source_publisher, source_url,
             source_license, source_independence, locator, evidence_status,
             notes, created_by, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            "synthetic-promoted-assertion",
            "synthetic-bulk-row",
            "synthetic-bulk-import",
            "synthetic-batch",
            "product",
            "synthetic-product",
            "Synthetic Grid Tool",
            "Synthetic Energy Lab",
            "/directory",
            "name",
            "Synthetic Grid Tool",
            "synthetic-promoted-source",
            "Synthetic evidence",
            "Synthetic publisher",
            "https://example.invalid/evidence",
            "factual_metadata_and_linking_only",
            "independent primary",
            "Synthetic locator",
            "independently_evidenced",
            "Synthetic recovery fixture",
            "editor@example.invalid",
            now,
        ),
    )
    database.commit()


def table_names(database: sqlite3.Connection) -> list[str]:
    return [
        row[0]
        for row in database.execute(
            """SELECT name FROM sqlite_schema
               WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
               ORDER BY name"""
        )
    ]


def table_counts(database: sqlite3.Connection) -> dict[str, int]:
    return {
        table: int(
            database.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
        )
        for table in table_names(database)
    }


def content_fingerprint(database: sqlite3.Connection) -> str:
    digest = hashlib.sha256()
    for table in table_names(database):
        columns = [
            row[1]
            for row in database.execute(f'PRAGMA table_info("{table}")').fetchall()
        ]
        rows = database.execute(f'SELECT * FROM "{table}" ORDER BY rowid').fetchall()
        digest.update(
            json.dumps(
                {"table": table, "columns": columns, "rows": rows},
                ensure_ascii=True,
                separators=(",", ":"),
            ).encode("utf-8")
        )
    return digest.hexdigest()


def verify_database(database: sqlite3.Connection) -> dict[str, object]:
    integrity = database.execute("PRAGMA integrity_check").fetchone()[0]
    foreign_key_failures = database.execute("PRAGMA foreign_key_check").fetchall()
    tables = set(table_names(database))
    if integrity != "ok":
        raise RuntimeError(f"integrity check failed: {integrity}")
    if foreign_key_failures:
        raise RuntimeError("foreign-key check failed")
    if tables != EXPECTED_TABLES:
        raise RuntimeError(
            f"table mismatch: expected {sorted(EXPECTED_TABLES)}, got {sorted(tables)}"
        )
    return {
        "integrity": integrity,
        "foreignKeyFailures": len(foreign_key_failures),
        "tableCounts": table_counts(database),
        "contentFingerprint": content_fingerprint(database),
    }


def run_rehearsal(rto_seconds: float = 900) -> dict[str, object]:
    started = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="aesm-d1-recovery-") as temporary:
        directory = Path(temporary)
        source = connect(directory / "source.sqlite3")
        migrations = apply_migrations(source)
        seed_synthetic_fixture(source)
        baseline = verify_database(source)

        backup = connect(directory / "backup.sqlite3")
        source.backup(backup)
        backup.commit()
        backup_verification = verify_database(backup)

        source.execute("DELETE FROM contribution_contacts")
        source.execute("DELETE FROM contributions")
        source.execute("DELETE FROM bulk_import_rows")
        source.execute("DELETE FROM organisation_catalogue_reviews")
        source.execute(
            "UPDATE system_settings SET value = 'damaged' WHERE key = 'intake_paused'"
        )
        source.commit()
        damaged_fingerprint = content_fingerprint(source)
        if damaged_fingerprint == baseline["contentFingerprint"]:
            raise RuntimeError("simulated loss did not change the database")

        restored = connect(directory / "restored.sqlite3")
        backup.backup(restored)
        restored.commit()
        restored_verification = verify_database(restored)

        source.close()
        backup.close()
        restored.close()

    if backup_verification["contentFingerprint"] != baseline["contentFingerprint"]:
        raise RuntimeError("backup fingerprint differs from the source")
    if restored_verification["contentFingerprint"] != baseline["contentFingerprint"]:
        raise RuntimeError("restored fingerprint differs from the source")
    if restored_verification["tableCounts"] != baseline["tableCounts"]:
        raise RuntimeError("restored table counts differ from the source")

    duration_seconds = time.perf_counter() - started
    return {
        "status": "passed" if duration_seconds <= rto_seconds else "failed",
        "completedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "drillMode": "local_sqlite_d1_compatibility_rehearsal",
        "productionD1Untouched": True,
        "containsOnlySyntheticData": True,
        "migrations": migrations,
        "tablesVerified": len(EXPECTED_TABLES),
        "tableCounts": restored_verification["tableCounts"],
        "baselineFingerprint": baseline["contentFingerprint"],
        "restoredFingerprint": restored_verification["contentFingerprint"],
        "simulatedLossDetected": damaged_fingerprint
        != baseline["contentFingerprint"],
        "integrity": restored_verification["integrity"],
        "foreignKeyFailures": restored_verification["foreignKeyFailures"],
        "durationSeconds": round(duration_seconds, 3),
        "rtoTargetSeconds": rto_seconds,
        "productionTimeTravelDrillRequired": True,
        "publicationAuthorised": False,
    }


def main() -> int:
    args = parse_args()
    report = run_rehearsal(args.rto_seconds)
    rendered = json.dumps(report, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    print(json.dumps(report))
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
