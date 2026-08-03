from __future__ import annotations

import unittest

from scripts.prepare_organisation_inventory import (
    DEFAULT_SNAPSHOT,
    load_indexes,
    reconcile,
    record_shape,
    source_leads,
)


def row(name: str, website: str = "") -> dict[str, object]:
    return {
        "line": 1,
        "section": "FINANCIERS TABLE",
        "group": "org_group_capital",
        "name": name,
        "website": website,
        "headquarters": "",
        "stakeholder": "financier",
        "segments": "",
        "ownership": "",
        "scale": "",
        "notes": "",
    }


class OrganisationInventoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.indexes = load_indexes(DEFAULT_SNAPSHOT)

    def test_exact_canonical_name_matches(self) -> None:
        result = reconcile(row("Bboxx", "bboxx.com"), self.indexes)
        self.assertEqual(result["status"], "canonical_match")
        self.assertEqual(result["matchedOn"], "canonical_name")

    def test_similar_crossboundary_names_are_not_conflated(self) -> None:
        result = reconcile(
            row("CrossBoundary (advisory/access arm)", "crossboundary.com"),
            self.indexes,
        )
        self.assertNotEqual(result["status"], "canonical_match")

    def test_grouped_rows_require_split(self) -> None:
        candidate = row("PIDG / InfraCo Africa", "pidg.org")
        self.assertEqual(record_shape(candidate), "grouped_row")
        self.assertEqual(reconcile(candidate, self.indexes)["status"], "needs_split")

    def test_source_leads_normalise_domains_without_claiming_evidence(self) -> None:
        self.assertEqual(
            source_leads("afdb.org; https://www.example.org/path"),
            ["https://afdb.org/", "https://example.org/"],
        )


if __name__ == "__main__":
    unittest.main()
