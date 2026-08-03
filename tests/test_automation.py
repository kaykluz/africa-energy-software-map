from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripts.build_review_assist import (
    DEFAULT_OUTPUT,
    DEFAULT_SNAPSHOT,
    build_review_assist,
)
from scripts.materialize_review_release_shard import (
    ShardMaterializationError,
    build_release_shard,
    write_release_shard,
)
from scripts.prepare_next_batch import DEFAULT_AUDIT, build_plan
from scripts.prepare_review_release import build_release_plan
from scripts.promote_reviewed_batch import (
    DEFAULT_SOURCE,
    build_reviewed_release,
    read_csv,
)
from scripts.run_agent_dry_run import approved_sources
from scripts.validate_bulk_template import (
    BULK_FIELDS,
    DEFAULT_TEMPLATE,
    validate_template,
)


class AutomationTests(unittest.TestCase):
    def test_materializes_a_private_review_as_a_public_bounded_shard(self) -> None:
        source_url = "https://example.org/source"
        promoted = []
        fields = [
            ("organisation", "cand_org_example", "name", "Example Energy"),
            (
                "organisation",
                "cand_org_example",
                "origin_classification",
                "africa_built",
            ),
            (
                "organisation",
                "cand_org_example",
                "website",
                "https://example.org/",
            ),
            ("product", "cand_prod_example", "name", "Example Planner"),
            (
                "product",
                "cand_prod_example",
                "organisation_id",
                "cand_org_example",
            ),
            (
                "product",
                "cand_prod_example",
                "primary_category_id",
                "cat_planning_geospatial",
            ),
            ("product", "cand_prod_example", "lifecycle_status", "active"),
            (
                "product",
                "cand_prod_example",
                "access_model",
                "commercial_proprietary",
            ),
            (
                "product",
                "cand_prod_example",
                "website",
                "https://example.org/product",
            ),
            (
                "product",
                "cand_prod_example",
                "description",
                "Planning software.",
            ),
            (
                "organisation_role",
                "orgrole_example",
                "organisation_id",
                "cand_org_example",
            ),
            (
                "organisation_role",
                "orgrole_example",
                "role_id",
                "org_role_software_developer",
            ),
            (
                "organisation_role",
                "orgrole_example",
                "is_primary",
                "true",
            ),
            (
                "organisation_sector",
                "orgsector_example",
                "organisation_id",
                "cand_org_example",
            ),
            (
                "organisation_sector",
                "orgsector_example",
                "sector_id",
                "sector_power_utilities",
            ),
            (
                "organisation_segment",
                "orgsegment_example",
                "organisation_id",
                "cand_org_example",
            ),
            (
                "organisation_segment",
                "orgsegment_example",
                "segment_id",
                "org_segment_transmission_distribution",
            ),
            (
                "organisation_alias",
                "orgalias_example",
                "organisation_id",
                "cand_org_example",
            ),
            (
                "organisation_alias",
                "orgalias_example",
                "alias",
                "Example Planning Co",
            ),
            (
                "organisation_alias",
                "orgalias_example",
                "alias_type",
                "org_alias_former_name",
            ),
            (
                "organisation_relationship",
                "orgrel_example",
                "organisation_id",
                "cand_org_example",
            ),
            (
                "organisation_relationship",
                "orgrel_example",
                "related_organisation_id",
                "org_parent",
            ),
            (
                "organisation_relationship",
                "orgrel_example",
                "relationship_type",
                "org_relationship_subsidiary_of",
            ),
            (
                "organisation_software_relationship",
                "orgsoft_example",
                "organisation_id",
                "cand_org_example",
            ),
            (
                "organisation_software_relationship",
                "orgsoft_example",
                "product_id",
                "cand_prod_example",
            ),
            (
                "organisation_software_relationship",
                "orgsoft_example",
                "relationship_type",
                "org_software_develops",
            ),
        ]
        for index, (subject_type, subject_id, predicate, value) in enumerate(fields):
            promoted.append(
                {
                    "id": f"asrt_bulk_material_{index:02d}",
                    "rowId": "bulk_material_001",
                    "batchId": "bulk_material/batch-01",
                    "subjectType": subject_type,
                    "subjectId": subject_id,
                    "predicate": predicate,
                    "value": value,
                    "sourceId": "cand_src_example",
                    "evidenceStatus": "public_source",
                    "locator": "Product page, overview section.",
                }
            )
        package = {
            "schemaVersion": "1.1.0",
            "batchId": "batch-001",
            "generatedAt": "2026-08-02T14:06:22.441Z",
            "status": {
                "containsPublicDataChanges": False,
                "publicationAuthorised": False,
            },
            "promotedAssertions": promoted,
            "promotedSources": [
                {
                    "id": "cand_src_example",
                    "title": "Example product page",
                    "publisher": "Example Energy",
                    "url": source_url,
                    "sourceType": "web",
                    "sourceLicense": "unknown",
                    "independenceClass": "provider_authored",
                    "retrieved": "2026-08-02T10:00:00Z",
                }
            ],
            "assertionReviews": [
                {
                    "assertionId": item["id"],
                    "decision": "accept",
                    "sourceChecked": True,
                    "safetyChecked": True,
                    "reviewedAt": "2026-08-02T13:35:32.452Z",
                }
                for item in promoted
            ],
            "sourceReviews": [
                {
                    "sourceId": "cand_src_example",
                    "rightsStatus": "resolved",
                    "sourceLicense": "all_rights_reserved",
                    "independenceClass": "provider_authored",
                }
            ],
            "bulkCandidates": [
                {
                    "id": "bulk_material_001",
                    "importId": "bulk_material",
                    "rowKey": "example-planner",
                    "recordType": "product",
                    "status": "accept",
                    "effectivePayload": {
                        "product_name": "Example Planner",
                        "source_url": source_url,
                    },
                    "review": {"decision": "accept"},
                }
            ],
        }
        snapshot = {
            "release": {},
            "organisations": [],
            "products": [],
            "assertions": [],
            "sources": [],
        }
        tables, manifest, readme = build_release_shard(
            package=package,
            package_hash="0" * 64,
            snapshot=snapshot,
            shard_id="release-001",
            reviewer="kaykluz",
        )
        self.assertEqual(manifest["assertionCount"], len(fields))
        self.assertEqual(manifest["entityCount"], 2)
        self.assertFalse(manifest["publicationAuthorised"])
        self.assertEqual(tables["organisations.csv"][0]["id"], "org_example")
        self.assertEqual(tables["products.csv"][0]["id"], "prod_example")
        self.assertEqual(
            tables["products.csv"][0]["organisation_id"], "org_example"
        )
        self.assertEqual(
            tables["organisation-roles.csv"][0]["organisation_id"],
            "org_example",
        )
        self.assertEqual(
            tables["organisation-sectors.csv"][0]["sector_id"],
            "sector_power_utilities",
        )
        self.assertEqual(
            tables["organisation-segments.csv"][0]["segment_id"],
            "org_segment_transmission_distribution",
        )
        self.assertEqual(
            tables["organisation-aliases.csv"][0]["alias"],
            "Example Planning Co",
        )
        self.assertEqual(
            tables["organisation-relationships.csv"][0][
                "related_organisation_id"
            ],
            "org_parent",
        )
        self.assertEqual(
            tables["organisation-software-relationships.csv"][0]["product_id"],
            "prod_example",
        )
        self.assertEqual(
            tables["sources.csv"][0]["id"], "src_68e9a02c4a4f420f"
        )
        self.assertNotIn("@", json.dumps(manifest))
        incomplete = json.loads(json.dumps(package))
        excluded_ids = {
            item["id"]
            for item in incomplete["promotedAssertions"]
            if item["subjectType"] in {"organisation_role", "organisation_sector"}
        }
        incomplete["promotedAssertions"] = [
            item
            for item in incomplete["promotedAssertions"]
            if item["id"] not in excluded_ids
        ]
        incomplete["assertionReviews"] = [
            item
            for item in incomplete["assertionReviews"]
            if item["assertionId"] not in excluded_ids
        ]
        with self.assertRaisesRegex(
            ShardMaterializationError, "lacks a reviewed primary role"
        ):
            build_release_shard(
                package=incomplete,
                package_hash="0" * 64,
                snapshot=snapshot,
                shard_id="release-001",
                reviewer="kaykluz",
            )
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "release-001"
            write_release_shard(output, tables, manifest, readme)
            self.assertTrue((output / "checksums.txt").exists())

    def test_review_assist_is_complete_and_cannot_decide(self) -> None:
        snapshot = json.loads(DEFAULT_SNAPSHOT.read_text(encoding="utf-8"))
        assist = build_review_assist(snapshot)
        self.assertEqual(assist["status"], "proposal_only")
        self.assertFalse(assist["publicationAuthorised"])
        self.assertEqual(assist["summary"]["assertions"], 1276)
        self.assertEqual(assist["summary"]["sources"], 75)
        self.assertEqual(assist["summary"]["rightsFirst"], 0)
        self.assertEqual(
            {item["assertionId"] for item in assist["assertions"]},
            {item["id"] for item in snapshot["assertions"]},
        )
        self.assertTrue(
            all(
                item["automationCanDecide"] is False
                for item in assist["assertions"]
            )
        )
        self.assertNotIn(
            "accept",
            {item["recommendedAction"] for item in assist["assertions"]},
        )

    def test_committed_review_assist_is_reproducible(self) -> None:
        snapshot = json.loads(DEFAULT_SNAPSHOT.read_text(encoding="utf-8"))
        expected = json.dumps(
            build_review_assist(snapshot), indent=2, ensure_ascii=False
        ) + "\n"
        self.assertEqual(
            DEFAULT_OUTPUT.read_text(encoding="utf-8"),
            expected,
        )

    def test_batch_002_plan_is_bounded_and_candidate_only(self) -> None:
        audit = json.loads(DEFAULT_AUDIT.read_text(encoding="utf-8"))
        plan = build_plan(audit, "batch_001")
        self.assertEqual(plan["batch"]["id"], "batch-002")
        self.assertLessEqual(plan["batch"]["entityCount"], 25)
        self.assertLessEqual(plan["batch"]["assertionCount"], 100)
        self.assertFalse(plan["publicationAuthorised"])
        self.assertIn("publication", plan["automation"]["prohibited"])

    def test_empty_source_register_keeps_external_research_idle(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            source_register = Path(temporary) / "source-register.csv"
            source_register.write_text(
                "id,name,source_family,countries,categories,base_url,"
                "discovery_method,automation_permitted,"
                "expected_update_frequency,default_independence_class,"
                "language,last_checked_at,next_review_at,status,notes\n",
                encoding="utf-8",
            )
            self.assertEqual(approved_sources(source_register), [])

    def test_bulk_template_is_empty_and_import_compatible(self) -> None:
        report = validate_template(DEFAULT_TEMPLATE)
        self.assertEqual(report["status"], "valid")
        self.assertEqual(report["fields"], len(BULK_FIELDS))
        self.assertFalse(report["publication_authorised"])

    def test_review_export_can_prepare_but_not_authorise_a_data_pr(self) -> None:
        snapshot = json.loads(DEFAULT_SNAPSHOT.read_text(encoding="utf-8"))
        review_package = {
            "schemaVersion": "1.0.0",
            "batchId": "batch-001",
            "generatedAt": "2026-07-30T12:00:00Z",
            "status": {
                "containsPublicDataChanges": False,
                "publicationAuthorised": False,
            },
            "assertionReviews": [
                {
                    "assertionId": assertion["id"],
                    "decision": "accept",
                    "sourceChecked": True,
                    "safetyChecked": True,
                }
                for assertion in snapshot["assertions"]
            ],
            "sourceReviews": [
                {
                    "sourceId": source["id"],
                    "rightsStatus": "resolved",
                    "sourceLicense": "reuse-cleared",
                    "independenceClass": source["independenceClass"],
                }
                for source in snapshot["sources"]
                if source["sourceLicense"] == "unknown"
            ],
        }
        plan = build_release_plan(snapshot, review_package)
        self.assertEqual(plan["status"], "ready_for_data_pr")
        self.assertEqual(plan["summary"]["accepted"], 1276)
        self.assertEqual(plan["summary"]["blockers"], 0)
        self.assertFalse(plan["publicationAuthorised"])

    def test_review_release_plan_blocks_unresolved_evidence(self) -> None:
        snapshot = json.loads(DEFAULT_SNAPSHOT.read_text(encoding="utf-8"))
        review_package = {
            "schemaVersion": "1.0.0",
            "batchId": "batch-001",
            "status": {
                "containsPublicDataChanges": False,
                "publicationAuthorised": False,
            },
            "assertionReviews": [
                {
                    "assertionId": snapshot["assertions"][0]["id"],
                    "decision": "needs_evidence",
                    "sourceChecked": False,
                    "safetyChecked": False,
                }
            ],
            "sourceReviews": [],
        }
        plan = build_release_plan(snapshot, review_package)
        self.assertEqual(plan["status"], "blocked")
        self.assertGreater(plan["summary"]["blockers"], 1)
        self.assertFalse(plan["publicationAuthorised"])

    def test_review_release_plan_treats_applied_amendment_as_a_no_op(self) -> None:
        snapshot = {
            "release": {},
            "assertions": [
                {
                    "id": "asrt_already_corrected",
                    "subjectType": "product",
                    "subjectId": "prod_example",
                    "predicate": "website",
                    "value": "https://example.org/corrected",
                    "sourceId": "src_example",
                    "evidenceStatus": "public_source",
                }
            ],
            "sources": [
                {
                    "id": "src_example",
                    "sourceLicense": "factual_metadata_and_linking_only",
                }
            ],
        }
        package = {
            "schemaVersion": "1.1.0",
            "status": {
                "containsPublicDataChanges": False,
                "publicationAuthorised": False,
            },
            "assertionReviews": [
                {
                    "assertionId": "asrt_already_corrected",
                    "decision": "amend",
                    "proposedValue": "https://example.org/corrected",
                    "proposedEvidenceStatus": "public_source",
                    "sourceChecked": True,
                    "safetyChecked": True,
                }
            ],
            "sourceReviews": [],
            "promotedAssertions": [],
            "promotedSources": [],
            "bulkCandidates": [],
        }
        plan = build_release_plan(snapshot, package)
        self.assertEqual(plan["status"], "ready_for_data_pr")
        self.assertEqual(plan["actions"]["amendAssertions"], [])
        self.assertEqual(
            plan["actions"]["keepAssertionIds"], ["asrt_already_corrected"]
        )

    def test_promoted_bulk_assertion_enters_the_release_plan_safely(self) -> None:
        snapshot = {"assertions": [], "sources": [], "release": {}}
        promoted_assertion = {
            "id": "asrt_bulk_example",
            "rowId": "bulk_example_001",
            "subjectType": "product",
            "subjectId": "cand_prod_example",
            "predicate": "name",
            "value": "Example Grid Suite",
            "sourceId": "cand_src_example",
            "evidenceStatus": "customer_confirmed",
            "notes": "Promoted from a reviewed bulk candidate.",
        }
        promoted_source = {
            "id": "cand_src_example",
            "title": "Direct programme page",
            "publisher": "Example Utility",
            "url": "https://example.org/programme",
            "sourceType": "web",
            "independenceClass": "customer_or_official",
            "sourceLicense": "factual_metadata_and_linking_only",
            "notes": "Direct source checked by a human reviewer.",
        }
        package = {
            "schemaVersion": "1.1.0",
            "batchId": "bulk-example/batch-01",
            "status": {
                "containsPublicDataChanges": False,
                "publicationAuthorised": False,
            },
            "promotedAssertions": [promoted_assertion],
            "promotedSources": [promoted_source],
            "assertionReviews": [
                {
                    "assertionId": "asrt_bulk_example",
                    "decision": "accept",
                    "sourceChecked": True,
                    "safetyChecked": True,
                }
            ],
            "sourceReviews": [],
            "bulkCandidates": [
                {
                    "id": "bulk_example_001",
                    "importId": "bulk_example",
                    "rowKey": "example-grid-suite",
                    "recordType": "product",
                    "status": "accept",
                    "effectivePayload": {"product_name": "Example Grid Suite"},
                    "review": {"decision": "accept"},
                },
                {
                    "id": "bulk_example_002",
                    "importId": "bulk_example",
                    "rowKey": "example-needs-evidence",
                    "recordType": "product",
                    "status": "needs_evidence",
                    "effectivePayload": {
                        "product_name": "Example Needs Evidence"
                    },
                    "review": {"decision": "needs_evidence"},
                },
            ],
        }
        plan = build_release_plan(snapshot, package)
        self.assertEqual(plan["status"], "ready_for_data_pr")
        self.assertEqual(plan["summary"]["promotedAssertions"], 1)
        self.assertEqual(
            plan["actions"]["addAssertions"][0]["id"],
            "asrt_bulk_example",
        )
        self.assertEqual(
            plan["actions"]["addSources"][0]["id"],
            "src_23f8415f3e26dd9c",
        )
        self.assertEqual(
            plan["actions"]["addAssertions"][0]["sourceId"],
            "src_23f8415f3e26dd9c",
        )
        self.assertEqual(
            plan["actions"]["candidateContexts"][0]["rowId"],
            "bulk_example_001",
        )
        self.assertEqual(plan["summary"]["bulkCandidates"], 2)
        self.assertEqual(plan["summary"]["candidateIncluded"], 1)
        self.assertEqual(plan["summary"]["candidateHeld"], 1)
        self.assertEqual(plan["summary"]["candidateRejected"], 0)
        self.assertEqual(
            plan["actions"]["excludedCandidateRows"][0]["rowId"],
            "bulk_example_002",
        )
        self.assertIn("1 candidate row is held", plan["scopeNote"])
        self.assertFalse(plan["publicationAuthorised"])

    def test_promoted_source_with_unknown_rights_blocks_release(self) -> None:
        snapshot = {"assertions": [], "sources": [], "release": {}}
        package = {
            "schemaVersion": "1.1.0",
            "status": {
                "containsPublicDataChanges": False,
                "publicationAuthorised": False,
            },
            "promotedAssertions": [
                {
                    "id": "asrt_bulk_unknown_rights",
                    "rowId": "bulk_example_001",
                    "subjectType": "product",
                    "subjectId": "cand_prod_example",
                    "predicate": "name",
                    "value": "Example Grid Suite",
                    "sourceId": "cand_src_unknown_rights",
                    "evidenceStatus": "public_source",
                    "notes": "",
                }
            ],
            "promotedSources": [
                {
                    "id": "cand_src_unknown_rights",
                    "title": "Example source",
                    "publisher": "Example publisher",
                    "url": "https://example.org/source",
                    "sourceLicense": "unknown",
                    "independenceClass": "independent_secondary",
                }
            ],
            "assertionReviews": [
                {
                    "assertionId": "asrt_bulk_unknown_rights",
                    "decision": "accept",
                    "sourceChecked": True,
                    "safetyChecked": True,
                }
            ],
            "sourceReviews": [],
            "bulkCandidates": [],
        }
        plan = build_release_plan(snapshot, package)
        self.assertEqual(plan["status"], "blocked")
        self.assertIn(
            "source_rights_unresolved",
            {blocker["type"] for blocker in plan["blockers"]},
        )

    def test_release_plan_re_shards_promoted_rows_within_pr_limits(self) -> None:
        snapshot = {"assertions": [], "sources": [], "release": {}}
        promoted_assertions = []
        assertion_reviews = []
        bulk_candidates = []
        for index in range(101):
            row_number = index // 4
            assertion_id = f"asrt_bulk_{index:03d}"
            row_id = f"bulk_example_{row_number:03d}"
            promoted_assertions.append(
                {
                    "id": assertion_id,
                    "rowId": row_id,
                    "batchId": "bulk-example/original-batch-01",
                    "subjectType": "product",
                    "subjectId": f"cand_prod_{row_number:03d}",
                    "predicate": f"field_{index:03d}",
                    "value": f"value_{index:03d}",
                    "sourceId": "cand_src_sharding",
                    "evidenceStatus": "public_source",
                    "notes": "",
                }
            )
            assertion_reviews.append(
                {
                    "assertionId": assertion_id,
                    "decision": "accept",
                    "sourceChecked": True,
                    "safetyChecked": True,
                }
            )
        for row_number in range(26):
            bulk_candidates.append(
                {
                    "id": f"bulk_example_{row_number:03d}",
                    "importId": "bulk_example",
                    "rowKey": f"row-{row_number:03d}",
                    "recordType": "product",
                    "status": "accept",
                    "effectivePayload": {
                        "product_name": f"Product {row_number:03d}"
                    },
                    "review": {"decision": "accept"},
                }
            )
        package = {
            "schemaVersion": "1.1.0",
            "status": {
                "containsPublicDataChanges": False,
                "publicationAuthorised": False,
            },
            "promotedAssertions": promoted_assertions,
            "promotedSources": [
                {
                    "id": "cand_src_sharding",
                    "title": "Sharding source",
                    "publisher": "Example publisher",
                    "url": "https://example.org/source",
                    "sourceLicense": "factual_metadata_and_linking_only",
                    "independenceClass": "independent_secondary",
                }
            ],
            "assertionReviews": assertion_reviews,
            "sourceReviews": [],
            "bulkCandidates": bulk_candidates,
        }
        plan = build_release_plan(snapshot, package)
        shards = plan["actions"]["releaseShards"]
        self.assertEqual(plan["status"], "ready_for_data_pr")
        self.assertEqual(len(shards), 2)
        self.assertTrue(
            all(shard["assertionCount"] <= 100 for shard in shards)
        )
        self.assertTrue(all(shard["entityCount"] <= 25 for shard in shards))
        self.assertEqual(
            sum(shard["assertionCount"] for shard in shards), 101
        )
        self.assertEqual(
            {assertion_id for shard in shards for assertion_id in shard["assertionIds"]},
            {item["id"] for item in promoted_assertions},
        )

    def test_reviewed_promotion_uses_public_reviewer_and_keeps_package_private(
        self,
    ) -> None:
        assertions = read_csv(DEFAULT_SOURCE / "assertions.csv")
        sources = read_csv(DEFAULT_SOURCE / "sources.csv")
        package = {
            "schemaVersion": "1.0.0",
            "batchId": "data/imports/kaykluz-v0.1/batches/batch-001",
            "generatedAt": "2026-07-30T22:41:38Z",
            "generatedBy": "private@example.com",
            "status": {
                "containsPublicDataChanges": False,
                "publicationAuthorised": False,
            },
            "assertionReviews": [
                {
                    "assertionId": assertion["id"],
                    "decision": "accept",
                    "sourceChecked": True,
                    "safetyChecked": True,
                    "reviewedAt": "2026-07-30T22:30:00Z",
                }
                for assertion in assertions
            ],
            "sourceReviews": [
                {
                    "sourceId": source["id"],
                    "rightsStatus": "resolved",
                    "sourceLicense": "factual_metadata_and_linking_only",
                    "independenceClass": source["independence_class"],
                    "reviewedAt": "2026-07-30T22:31:00Z",
                }
                for source in sources
                if source["source_license"] == "unknown"
            ],
        }
        candidate, report, summary, _ = build_reviewed_release(
            source=DEFAULT_SOURCE,
            package=package,
            package_hash="a" * 64,
            reviewer="public-editor",
            version="test",
        )
        self.assertTrue(
            all(
                assertion["reviewed_by"] == "public-editor"
                for assertion in candidate.tables["assertions.csv"]
            )
        )
        self.assertFalse(summary["reviewPackageCommitted"])
        self.assertNotIn("private@example.com", json.dumps(summary))
        self.assertFalse(summary["publicationAuthorised"])
        self.assertEqual(
            report["research_review"]["record_changes"]
            + summary["reviewChangeRecords"],
            len(candidate.tables["changes.csv"]),
        )


if __name__ == "__main__":
    unittest.main()
