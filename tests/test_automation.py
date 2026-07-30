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
from scripts.run_agent_dry_run import approved_sources


class AutomationTests(unittest.TestCase):
    def test_review_assist_is_complete_and_cannot_decide(self) -> None:
        snapshot = json.loads(DEFAULT_SNAPSHOT.read_text(encoding="utf-8"))
        assist = build_review_assist(snapshot)
        self.assertEqual(assist["status"], "proposal_only")
        self.assertFalse(assist["publicationAuthorised"])
        self.assertEqual(assist["summary"]["assertions"], 88)
        self.assertEqual(assist["summary"]["sources"], 9)
        self.assertEqual(assist["summary"]["rightsFirst"], 5)
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


if __name__ == "__main__":
    unittest.main()
