import unittest

from scripts.import_phase1_landscape import (
    CATEGORY_MAP,
    PRIVATE_EDITORIAL_PATTERNS,
    STAGE_MAP,
    ensure_public_safe,
)


class LandscapeImportTests(unittest.TestCase):
    def test_all_source_taxonomy_values_are_mapped(self):
        self.assertEqual(len(STAGE_MAP), 7)
        self.assertEqual(len(CATEGORY_MAP), 30)
        self.assertEqual(STAGE_MAP["cross_cutting_data"], [])

    def test_private_editorial_relationship_text_is_blocked(self):
        with self.assertRaisesRegex(ValueError, "private editorial metadata"):
            ensure_public_safe(
                {"summaryAsSubmitted": "Owned by the maintainer"},
                "example",
            )

    def test_normal_product_language_is_not_blocked(self):
        ensure_public_safe(
            {"summaryAsSubmitted": "Carbon accounting and climate disclosure platform"},
            "example",
        )

    def test_privacy_rules_are_narrow_and_nonempty(self):
        self.assertGreaterEqual(len(PRIVATE_EDITORIAL_PATTERNS), 8)


if __name__ == "__main__":
    unittest.main()
