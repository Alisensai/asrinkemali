from pathlib import Path
import sys
import tempfile
import unittest

TOOL_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL_DIR))
import audit_ledger


def make_event(sequence=1, previous_hash=audit_ledger.GENESIS_HASH, **overrides):
    event = {
        "sequence": sequence,
        "timestamp": "2026-10-22T12:00:00Z",
        "record_id": "record-1",
        "event_type": "review_submitted",
        "actor": "Human history reviewer",
        "actor_role": "human_expert",
        "form_sha256": "a" * 64,
        "evidence_refs": ["catalog/box-1/item-3"],
        "previous_event_hash": previous_hash,
    }
    event.update(overrides)
    event["event_hash"] = audit_ledger.event_hash(event)
    return event


class AuditLedgerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "audit.jsonl"

    def tearDown(self):
        self.temp.cleanup()

    def write(self, *events):
        self.path.write_text("".join(__import__("json").dumps(item) + "\n" for item in events), encoding="utf-8")

    def test_valid_hash_chain_is_verified_without_identity_claim(self):
        first = make_event()
        second = make_event(
            sequence=2,
            previous_hash=first["event_hash"],
            event_type="editor_approval_recorded",
            actor="Human editor",
            actor_role="human_editor",
        )
        self.write(first, second)
        result = audit_ledger.verify_ledger(self.path)
        self.assertEqual(result["valid_event_count"], 2)
        self.assertEqual(result["findings"], [])
        self.assertFalse(result["identity_authenticity_proven"])

    def test_tampered_event_is_detected(self):
        event = make_event()
        event["actor"] = "Different person"
        self.write(event)
        result = audit_ledger.verify_ledger(self.path)
        self.assertIn("event_hash_mismatch", {finding["code"] for finding in result["findings"]})

    def test_wrong_previous_hash_is_detected(self):
        first = make_event()
        second = make_event(sequence=2, previous_hash="b" * 64)
        self.write(first, second)
        result = audit_ledger.verify_ledger(self.path)
        self.assertIn("broken_previous_hash", {finding["code"] for finding in result["findings"]})

    def test_ai_actor_and_role_mismatch_are_rejected(self):
        event = make_event(actor="Copilot AI")
        self.write(event)
        result = audit_ledger.verify_ledger(self.path)
        codes = {finding["code"] for finding in result["findings"]}
        self.assertIn("ai_actor_forbidden", codes)

    def test_approval_event_requires_editor_role(self):
        event = make_event(event_type="editor_approval_recorded", actor_role="human_expert")
        self.write(event)
        result = audit_ledger.verify_ledger(self.path)
        self.assertIn("actor_role_mismatches_event_type", {finding["code"] for finding in result["findings"]})

    def test_malformed_jsonl_is_reported(self):
        self.path.write_text("{bad json}\n", encoding="utf-8")
        result = audit_ledger.verify_ledger(self.path)
        self.assertEqual(result["findings"][0]["code"], "invalid_jsonl")


if __name__ == "__main__":
    unittest.main()
