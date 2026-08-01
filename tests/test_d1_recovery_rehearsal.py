from __future__ import annotations

import unittest

from scripts.run_d1_recovery_rehearsal import EXPECTED_TABLES, run_rehearsal


class D1RecoveryRehearsalTests(unittest.TestCase):
    def test_all_private_tables_survive_backup_and_restore(self) -> None:
        report = run_rehearsal(rto_seconds=30)
        self.assertEqual(report["status"], "passed")
        self.assertTrue(report["productionD1Untouched"])
        self.assertTrue(report["containsOnlySyntheticData"])
        self.assertTrue(report["simulatedLossDetected"])
        self.assertEqual(report["integrity"], "ok")
        self.assertEqual(report["foreignKeyFailures"], 0)
        self.assertEqual(report["tablesVerified"], len(EXPECTED_TABLES))
        self.assertEqual(
            report["baselineFingerprint"], report["restoredFingerprint"]
        )
        self.assertTrue(
            all(report["tableCounts"][table] == 1 for table in EXPECTED_TABLES)
        )
        self.assertTrue(report["productionTimeTravelDrillRequired"])
        self.assertFalse(report["publicationAuthorised"])


if __name__ == "__main__":
    unittest.main()
