import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from aeci import evaluate


BASE = {
    "request_id": "demo-001",
    "actor": "alice",
    "target": "window-1",
    "operation": "close",
    "permissions": ["execute"],
    "allowed_targets": ["window-1"],
    "allowed_operations": ["close"],
    "expected_state": {"position": "closed"},
}


class ContractTests(unittest.TestCase):
    def test_approved_fixture(self):
        self.assertTrue(evaluate(BASE).allowed)

    def test_unlisted_device_denied(self):
        self.assertIn("target_not_allowed", evaluate({**BASE, "target": "window-2"}).reasons)

    def test_no_execution_grant_denied(self):
        self.assertIn("execute_permission_missing", evaluate({**BASE, "permissions": []}).reasons)

    def test_missing_expected_state_denied(self):
        self.assertIn("expected_state_required", evaluate({**BASE, "expected_state": {}}).reasons)

    def test_malformed_shape_denied(self):
        self.assertFalse(evaluate({**BASE, "allowed_targets": "window-1"}).allowed)


if __name__ == "__main__":
    unittest.main()
