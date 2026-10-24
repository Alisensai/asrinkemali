import json
from pathlib import Path
import unittest
from unittest.mock import patch

import quality_runner


def audit_step(name, payload, exit_code=0):
    return {
        "name": name,
        "command": ["npm", "audit", "--json"],
        "passed": exit_code == 0,
        "exit_code": exit_code,
        "tests_passed": 0,
        "tests_failed": 0,
        "output_tail": "",
        "error": None,
        "_stdout": json.dumps(payload),
        "_stderr": "",
    }


class QualityRunnerTests(unittest.TestCase):
    def setUp(self):
        self.report = {"checks": [], "findings": []}

    def test_unittest_failure_summary_counts_passes_and_failures_precisely(self):
        output = "Ran 5 tests in 0.1s\n\nFAILED (failures=1, errors=1)"
        self.assertEqual(quality_runner._test_counts("release-checker-tests", output, 1), (3, 2))

    def test_unittest_failure_without_summary_counts_one_failed_test(self):
        output = "Ran 5 tests in 0.1s\n\nFAILED"
        self.assertEqual(quality_runner._test_counts("release-checker-tests", output, 1), (4, 1))

    @patch("quality_runner.run_step")
    def test_registry_error_fails_both_dependency_audits(self, run_step):
        failed = {"error": {"code": "ECONNRESET"}, "message": "registry unavailable"}
        run_step.side_effect = [
            audit_step("dependency-audit", failed, 1),
            audit_step("production-dependency-audit", failed, 1),
        ]

        quality_runner.check_audit(Path("."), self.report)

        self.assertEqual([check["passed"] for check in self.report["checks"]], [False, False])
        self.assertIn("dependency-audit-unavailable", {item["code"] for item in self.report["findings"]})

    @patch("quality_runner.run_step")
    def test_development_advisory_is_reported_without_blocking_production_audit(self, run_step):
        metadata = {"vulnerabilities": {"high": 1}, "dependencies": {}}
        vulnerable = {
            "metadata": metadata,
            "vulnerabilities": {
                "dev-package": {
                    "severity": "high",
                    "via": [{"title": "Development-only advisory"}],
                }
            },
        }
        clean = {
            "metadata": {"vulnerabilities": {"high": 0}, "dependencies": {}},
            "vulnerabilities": {},
        }
        run_step.side_effect = [
            audit_step("dependency-audit", vulnerable, 1),
            audit_step("production-dependency-audit", clean),
        ]

        quality_runner.check_audit(Path("."), self.report)

        self.assertEqual([check["passed"] for check in self.report["checks"]], [True, True])
        finding = next(item for item in self.report["findings"] if item["code"] == "dependency-vulnerability")
        self.assertEqual(finding["severity"], "warning")
        self.assertIn("development-only", finding["message"])


if __name__ == "__main__":
    unittest.main()
