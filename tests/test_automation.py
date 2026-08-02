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
    def test_review_assist_is_complete_and_cannot_decide(self) -> None:
        snapshot = json.loads(DEFAULT_SNAPSHOT.read_text(encoding="utf-8"))
        assist = build_review_assist(snapshot)
        self.assertEqual(assist["status"], "proposal_only")
        self.assertFalse(assist["publicationAuthorised"])
        self.assertEqual(assist["summary"]["assertions"], 88)
        self.assertEqual(assist["summary"]["sources"], 9)
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
        self.assertEqual(plan["summary"]["accepted"], 88)
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
            plan["actions"]["addSources"][0]["id"], "cand_src_example"
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
