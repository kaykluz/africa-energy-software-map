import hashlib
import json
import pathlib
import unittest
from urllib.parse import urlparse


ROOT = pathlib.Path(__file__).resolve().parents[1]


class PublicVisualAssetTests(unittest.TestCase):
    def test_brand_manifest_resolves_to_local_safe_images(self):
        manifest = json.loads((ROOT / "data/brand-assets/organisations.json").read_text())
        registry = json.loads((ROOT / "web/generated/registry-snapshot.json").read_text())
        organisation_ids = {item["id"] for item in registry["organisations"]}
        checksums = {}
        for line in (ROOT / "data/brand-assets/checksums.txt").read_text().splitlines():
            digest, relative_path = line.split("  ", 1)
            checksums[relative_path] = digest

        self.assertGreaterEqual(len(manifest["assets"]), 20)
        self.assertEqual(len(manifest["assets"]), len(checksums))
        for asset in manifest["assets"]:
            self.assertIn(asset["organisationId"], organisation_ids)
            self.assertEqual(urlparse(asset["sourcePageUrl"]).scheme, "https")
            self.assertEqual(urlparse(asset["assetSourceUrl"]).scheme, "https")
            self.assertTrue(asset["localPath"].startswith("/brand/organisations/"))
            relative_path = asset["localPath"].removeprefix("/")
            local_path = ROOT / "web/public" / relative_path
            self.assertTrue(local_path.is_file(), asset["name"])
            payload = local_path.read_bytes()
            self.assertLess(len(payload), 5 * 1024 * 1024)
            self.assertEqual(hashlib.sha256(payload).hexdigest(), checksums[relative_path])
            if local_path.suffix == ".svg":
                lowered = payload.lower()
                for unsafe in (b"<script", b"javascript:", b"onload=", b"onerror="):
                    self.assertNotIn(unsafe, lowered, asset["name"])

    def test_map_geometry_matches_all_registry_countries(self):
        geometry = json.loads((ROOT / "web/generated/africa-map-paths.json").read_text())
        registry = json.loads((ROOT / "web/generated/registry-snapshot.json").read_text())
        expected = {item["iso2"] for item in registry["countries"]}
        actual = {
            item["iso2"]
            for item in geometry["countries"]
            if item["interactive"]
        }
        self.assertEqual(actual, expected)
        self.assertEqual(geometry["source"]["licence"], "Public domain")
        for country in geometry["countries"]:
            self.assertTrue(country["path"].startswith("M"), country["name"])
            self.assertNotIn("coordinates", country)


if __name__ == "__main__":
    unittest.main()
