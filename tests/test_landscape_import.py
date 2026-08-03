import unittest

from scripts.import_phase1_landscape import (
    CATEGORY_MAP,
    FUNCTION_MAP,
    PRIVATE_EDITORIAL_PATTERNS,
    STAGE_MAP,
    classification_for,
    ensure_public_safe,
)


class LandscapeImportTests(unittest.TestCase):
    def test_all_source_taxonomy_values_are_mapped(self):
        self.assertEqual(len(STAGE_MAP), 7)
        self.assertEqual(len(CATEGORY_MAP), 30)
        self.assertEqual(STAGE_MAP["cross_cutting_data"], [])
        dynamic_function_categories = {
            "emobility_productive_use",
            "iot_data_interoperability",
            "mdm_vending_payment_rails",
            "utility_erp_cis_billing",
        }
        self.assertEqual(set(CATEGORY_MAP), set(FUNCTION_MAP) | dynamic_function_categories)

    def test_horizontal_payment_rail_is_not_labelled_as_energy_software(self):
        item = {
            "id": "land_phase1_paystack",
            "name": "Paystack",
            "kind": "product",
            "summaryAsSubmitted": "Payment gateway used by energy platforms",
            "categoryIds": ["cat_retail_metering_billing_payments"],
        }
        source_row = {
            "category": "mdm_vending_payment_rails",
            "product_name": "Paystack",
            "organisation": "Paystack (Stripe)",
            "one_line_description": "Payment gateway used by energy platforms",
            "segments_served": "payments",
        }
        classification = classification_for(item, source_row)
        self.assertEqual(classification["functionIds"], ["func_payment_infrastructure"])
        self.assertEqual(
            classification["energyRelationship"], "enabling_infrastructure"
        )

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
