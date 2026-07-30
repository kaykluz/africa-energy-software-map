from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from scripts.build_registry_snapshot import (
    DEFAULT_CONFIG,
    ROOT,
    SnapshotError,
    build_downloads,
    build_snapshot,
    check_artifacts,
    load_json,
    verify_package_checksums,
)


class RegistrySnapshotTests(unittest.TestCase):
    def test_reviewed_snapshot_reconciles_counts_and_review_gate(self) -> None:
        snapshot = build_snapshot()
        self.assertEqual(snapshot["release"]["mode"], "published")
        self.assertEqual(
            snapshot["counts"],
            {
                "organisations": 3,
                "products": 5,
                "deployments": 4,
                "sources": 9,
                "assertions": 88,
            },
        )
        self.assertEqual(snapshot["reviewGate"]["reviewedAssertions"], 88)
        self.assertEqual(snapshot["reviewGate"]["unreviewedAssertions"], 0)
        self.assertEqual(snapshot["reviewGate"]["unresolvedSources"], 0)
        self.assertTrue(snapshot["reviewGate"]["publishable"])

    def test_published_mode_refuses_unreviewed_candidate_data(self) -> None:
        config = load_json(DEFAULT_CONFIG)
        config["source_batch"] = (
            "data/imports/kaykluz-v0.1/batches/batch-001"
        )
        with tempfile.TemporaryDirectory() as temporary:
            config_path = Path(temporary) / "interface-snapshot.json"
            config_path.write_text(json.dumps(config), encoding="utf-8")
            with self.assertRaises(SnapshotError):
                build_snapshot(config_path)

    def test_downloads_are_deterministic_and_geography_is_country_safe(self) -> None:
        config = load_json(DEFAULT_CONFIG)
        snapshot = build_snapshot()
        first = build_downloads(snapshot, config)
        second = build_downloads(snapshot, config)
        self.assertEqual(first, second)
        self.assertIn("csv-package.zip", first)
        self.assertNotIn("candidate-csv-package.zip", first)
        geojson = json.loads(first["deployments.geojson"])
        self.assertEqual(geojson["type"], "FeatureCollection")
        self.assertTrue(geojson["features"])
        for feature in geojson["features"]:
            self.assertIsNone(feature["geometry"])
            self.assertNotIn("latitude", feature["properties"])
            self.assertNotIn("longitude", feature["properties"])

    def test_batch_checksum_tampering_is_rejected(self) -> None:
        source_batch = ROOT / load_json(DEFAULT_CONFIG)["source_batch"]
        with tempfile.TemporaryDirectory() as temporary:
            copied_batch = Path(temporary) / "batch"
            shutil.copytree(source_batch, copied_batch)
            products = copied_batch / "products.csv"
            products.write_text(
                products.read_text(encoding="utf-8") + "\n",
                encoding="utf-8",
            )
            with self.assertRaises(SnapshotError):
                verify_package_checksums(copied_batch)

    def test_committed_snapshot_and_downloads_are_current(self) -> None:
        check_artifacts()


if __name__ == "__main__":
    unittest.main()
