from __future__ import annotations

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from workbook_migration import (  # noqa: E402
    MigrationError,
    XlsxValuesReader,
    build_ui_bundle,
    canonical_id,
    customer_fields,
    entity_count,
    evidence_status,
    plan_review_batches,
    safe_scalar,
    source_metadata,
    transform_rows,
    write_package,
)


CONFIG = json.loads(
    (ROOT / "data" / "imports" / "kaykluz-v0.1" / "mapping.json").read_text(
        encoding="utf-8"
    )
)


def sample_sheets(
    *,
    country: str = "Nigeria",
    evidence_level: str = "Verified live deployment",
    deployment_source: str = (
        "https://www.afd.fr/en/actualites/"
        "digital-energy-challenge-africa-energy-transition"
    ),
) -> dict[str, list[dict[str, str]]]:
    return {
        "Organisations": [
            {
                "Org_ID": "ORG-001",
                "Organisation": "Example Energy",
                "Organisation_Type": "Energy software company",
                "Africa_Relationship": "Africa-built",
                "Origin_Country": "Nigeria",
                "HQ_Country": "Nigeria",
                "Status": "Active; official site visible",
                "Website": "https://example.energy/",
                "Primary_Focus": "Energy operations software",
                "Primary_Source_URL": "https://example.energy/",
                "Last_Verified": "2026-07-24",
            }
        ],
        "Products": [
            {
                "Product_ID": "PROD-001",
                "Org_ID": "ORG-001",
                "Organisation": "Example Energy",
                "Product_Name": "Example Platform",
                "Primary_Value_Chain": "Distribution utility operations",
                "Functions": "Monitoring; control; billing",
                "Customer_Types": "Utilities",
                "Commercial_Model": "Enterprise SaaS",
                "Africa_Relationship": "Africa-built",
                "Evidence_Status": "Verified product; named deployment",
                "Source_URL": "https://example.energy/",
                "Last_Verified": "2026-07-24",
            }
        ],
        "Deployments": [
            {
                "Deployment_ID": "DEP-001",
                "Product_ID": "PROD-001",
                "Org_ID": "ORG-001",
                "Organisation": "Example Energy",
                "Product_Name": "Example Platform",
                "Country": country,
                "City_or_Region": "Northern service area",
                "Customer_or_Partner": "Example Utility",
                "Deployment_Year": "2024",
                "Deployment_Status": "Live",
                "Scale_or_Result": "Operational use",
                "Evidence_Level": evidence_level,
                "Source_URL": deployment_source,
                "Map_Precision": "Utility territory",
                "Notes": "",
                "Last_Verified": "2026-07-24",
            }
        ],
        "Taxonomy": [],
        "Research_Queue": [],
    }


def write_minimal_xlsx(path: Path, *, formula: bool = False) -> None:
    workbook_xml = """<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Organisations" sheetId="1" r:id="rId1"/></sheets>
</workbook>"""
    relationships_xml = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
   Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
   Target="worksheets/sheet1.xml"/>
</Relationships>"""
    shared_strings_xml = """<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 count="2" uniqueCount="2"><si><t>Org_ID</t></si><si><t>ORG-001</t></si></sst>"""
    data_cell = (
        '<c r="A2"><f>1+1</f><v>2</v></c>'
        if formula
        else '<c r="A2" t="s"><v>1</v></c>'
    )
    sheet_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c></row>
    <row r="2">{data_cell}</row>
  </sheetData>
</worksheet>"""
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("xl/workbook.xml", workbook_xml)
        archive.writestr("xl/_rels/workbook.xml.rels", relationships_xml)
        archive.writestr("xl/sharedStrings.xml", shared_strings_xml)
        archive.writestr("xl/worksheets/sheet1.xml", sheet_xml)


class WorkbookMigrationTests(unittest.TestCase):
    def test_xlsx_reader_reads_values_without_external_dependencies(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            workbook_path = Path(temporary) / "sample.xlsx"
            write_minimal_xlsx(workbook_path)
            sheets = XlsxValuesReader(workbook_path).read({"Organisations"})
            self.assertEqual(sheets["Organisations"], [{"Org_ID": "ORG-001"}])

    def test_xlsx_reader_rejects_formulas_in_eligible_sheets(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            workbook_path = Path(temporary) / "formula.xlsx"
            write_minimal_xlsx(workbook_path, formula=True)
            with self.assertRaises(MigrationError):
                XlsxValuesReader(workbook_path).read({"Organisations"})

    def test_canonical_id_is_stable_and_repository_safe(self) -> None:
        self.assertEqual(canonical_id("ORG-001"), "org_001")
        self.assertEqual(canonical_id("PROD-099"), "prod_099")
        with self.assertRaises(MigrationError):
            canonical_id("001")

    def test_formula_like_values_are_rejected(self) -> None:
        for value in ("=HYPERLINK('bad')", "+cmd", "@SUM(A1:A2)", "-cmd"):
            with self.subTest(value=value), self.assertRaises(MigrationError):
                safe_scalar(value, "test")
        self.assertEqual(safe_scalar("-12", "test"), "-12")

    def test_provider_source_cannot_upgrade_evidence(self) -> None:
        status, flags = evidence_status(
            "Verified live deployment", "provider_authored", "deployment"
        )
        self.assertEqual(status, "provider_claim_only")
        self.assertIn("workbook_verified_word_downgraded", flags)

    def test_official_programme_can_support_independent_evidence(self) -> None:
        source = source_metadata(
            "https://www.afd.fr/en/actualites/example", CONFIG
        )
        status, flags = evidence_status(
            "Verified live deployment",
            source["independence_class"],
            "deployment",
        )
        self.assertEqual(source["independence_class"], "independent_primary")
        self.assertEqual(status, "independently_evidenced")
        self.assertEqual(flags, [])

    def test_undisclosed_customer_name_is_removed(self) -> None:
        name, disclosure = customer_fields(
            "Four developers, not publicly named", ""
        )
        self.assertEqual(name, "")
        self.assertEqual(disclosure, "undisclosed")

    def test_multi_country_record_is_not_a_deployment(self) -> None:
        sheets = sample_sheets(
            country="Africa - multi-country",
            evidence_level="Vendor-claimed live deployment",
            deployment_source="https://example.energy/",
        )
        package = transform_rows(sheets, CONFIG, {"ORG-001"})
        self.assertEqual(package.tables["deployments.csv"], [])
        availability = [
            row
            for row in package.tables["assertions.csv"]
            if row["predicate"] == "claimed_availability"
        ]
        self.assertEqual(len(availability), 1)
        self.assertEqual(
            availability[0]["evidence_status"], "provider_claim_only"
        )

    def test_candidate_package_reconciles_ui_counts(self) -> None:
        package = transform_rows(sample_sheets(), CONFIG, {"ORG-001"})
        bundle = build_ui_bundle(package)
        manifest = bundle["data-manifest.json"]
        self.assertEqual(manifest["status"], "candidate_only")
        self.assertEqual(manifest["counts"]["organisations"], 1)
        self.assertEqual(manifest["counts"]["products"], 1)
        self.assertEqual(manifest["counts"]["deployments"], 1)
        self.assertIn("sources.json", manifest["files"])
        self.assertIn("assertions.json", manifest["files"])
        country = bundle["countries.json"][0]
        self.assertEqual(country["country_iso2"], "NG")
        self.assertEqual(country["independent_or_customer_count"], 1)

    def test_review_plan_respects_repository_limits(self) -> None:
        sheets = sample_sheets()
        plan = plan_review_batches(sheets, CONFIG)
        self.assertEqual(len(plan), 1)
        self.assertLessEqual(plan[0]["entity_count"], 25)
        self.assertLessEqual(plan[0]["assertion_count"], 100)

    def test_written_package_has_checksums_and_no_people_file(self) -> None:
        package = transform_rows(sample_sheets(), CONFIG, {"ORG-001"})
        manifest = {
            "version": "1.0.0",
            "status": "candidate_only",
            "source": {"filename": "sample.xlsx", "sha256": "a" * 64},
            "privacy": {
                "excluded_sheets": ["People", "Submission_Template"],
                "personal_records_emitted": 0,
            },
            "input_counts": {},
            "output_counts": {},
            "warnings": {},
            "review_batches": [],
            "selected_organisation_ids": ["ORG-001"],
        }
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "package"
            write_package(output, package, manifest)
            self.assertTrue((output / "checksums.txt").exists())
            self.assertTrue((output / "migration-report.json").exists())
            self.assertFalse((output / "people.csv").exists())
            checksum_text = (output / "checksums.txt").read_text(encoding="utf-8")
            self.assertIn("organisations.csv", checksum_text)
            self.assertGreater(entity_count(package), 0)


if __name__ == "__main__":
    unittest.main()
