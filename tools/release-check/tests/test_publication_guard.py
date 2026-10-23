from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import publication_guard


NOW = datetime(2026, 10, 23, 12, 0, tzinfo=timezone.utc)


def valid_record(**overrides):
    record = {
        "id": "record-one",
        "slug": "record-one",
        "title": "Tarihi kayıt örneği",
        "type": "document",
        "date": {
            "start": "1923-10-29",
            "end": None,
            "precision": "day",
            "certainty": "exact",
        },
        "source": {
            "institution": "Örnek Arşiv",
            "institutionType": "archive",
            "institutionUrl": "https://archive.example/",
            "url": "https://archive.example/record/one",
            "accessedAt": "2026-10-20",
        },
        "provenance": [{"institution": "Örnek Arşiv", "url": "https://archive.example/record/one"}],
        "rights": {"status": "official_link_only", "imageReuse": "not_downloaded"},
        "verification": {
            "status": "reviewed",
            "reviewedBy": "Tarih editörü",
            "reviewedAt": "2026-10-20",
            "checks": {
                "sourceReachable": True,
                "dateVerified": True,
                "rightsVerified": True,
                "duplicateChecked": True,
            },
        },
    }
    record.update(overrides)
    return record


def approval(**overrides):
    value = {
        "status": "approved",
        "authority": "human",
        "role": "human_editor",
        "approvedBy": "Baş editör",
        "approvedAt": "2026-10-21T12:00:00Z",
    }
    value.update(overrides)
    return value


def schedule(**overrides):
    value = {
        "id": "schedule-one",
        "recordId": "record-one",
        "status": "scheduled",
        "scheduledAt": "2026-10-24T12:00:00Z",
        "approval": approval(),
    }
    value.update(overrides)
    return value


class PublicationGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "content/archive/records").mkdir(parents=True)
        (self.root / "data/archive/catalog").mkdir(parents=True)
        self.record_path = self.root / "content/archive/records/record-one.json"
        self.write_record(valid_record())

    def tearDown(self):
        self.temp.cleanup()

    def write_record(self, record, path=None):
        target = path or self.record_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(record, ensure_ascii=False), encoding="utf-8")
        return target

    def write_schedule(self, item, filename="schedule-one.json"):
        path = self.root / "content/scheduled" / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(item, ensure_ascii=False), encoding="utf-8")
        return path

    def result(self, now=NOW):
        return publication_guard.validate_repository(self.root, now=now)

    def codes(self, result=None):
        return {finding["code"] for finding in (result or self.result())["findings"]}

    def test_reviewed_catalog_record_with_human_reviewer_passes(self):
        self.assertEqual(self.result()["catalog"]["record_count"], 1)
        self.assertNotIn("human-expert-review-required", self.codes())

    def test_published_record_requires_explicit_human_publication_approval(self):
        record = valid_record()
        record["verification"]["status"] = "published"
        record["publicationApproval"] = approval()
        self.write_record(record)
        self.assertNotIn("unauthorized-published-record", self.codes())

    def test_published_record_without_approval_is_critical(self):
        record = valid_record()
        record["verification"]["status"] = "published"
        self.write_record(record)
        findings = self.result()["findings"]
        finding = next(item for item in findings if item["code"] == "unauthorized-published-record")
        self.assertEqual(finding["severity"], "critical")

    def test_ai_agent_cannot_be_the_human_reviewer(self):
        record = valid_record()
        record["verification"]["status"] = "published"
        record["verification"]["reviewedBy"] = "OpenCode archive review (AI)"
        record["publicationApproval"] = approval()
        self.write_record(record)
        codes = self.codes()
        self.assertIn("human-expert-review-required", codes)
        self.assertIn("published-without-human-review", codes)

    def test_nonhuman_approval_cannot_authorize_publication(self):
        record = valid_record()
        record["verification"]["status"] = "published"
        record["publicationApproval"] = approval(approvedBy="Copilot agent")
        self.write_record(record)
        self.assertIn("unauthorized-published-record", self.codes())

    def test_publication_approval_requires_timezone_aware_timestamp(self):
        record = valid_record()
        record["verification"]["status"] = "published"
        record["publicationApproval"] = approval(approvedAt="2026-10-21T12:00:00")
        self.write_record(record)
        self.assertIn("unauthorized-published-record", self.codes())

    def test_future_or_invalid_review_date_is_not_human_review(self):
        record = valid_record()
        record["verification"]["reviewedAt"] = "2027-01-01"
        self.write_record(record)
        self.assertIn("human-expert-review-required", self.codes())

    def test_missing_source_url_is_rejected(self):
        record = valid_record()
        record["source"]["url"] = ""
        self.write_record(record)
        self.assertIn("invalid-catalog-source-url", self.codes())

    def test_http_source_url_is_rejected(self):
        record = valid_record()
        record["source"]["url"] = "http://archive.example/record/one"
        self.write_record(record)
        self.assertIn("invalid-catalog-source-url", self.codes())

    def test_source_url_with_credentials_is_rejected(self):
        record = valid_record()
        record["source"]["url"] = "https://user:password@archive.example/record/one"
        self.write_record(record)
        self.assertIn("invalid-catalog-source-url", self.codes())

    def test_published_homepage_source_is_rejected(self):
        record = valid_record()
        record["verification"]["status"] = "published"
        record["source"]["url"] = "https://archive.example/"
        record["provenance"][0]["url"] = "https://archive.example/"
        record["publicationApproval"] = approval()
        self.write_record(record)
        self.assertIn("generic-published-source", self.codes())

    def test_invalid_calendar_date_is_rejected(self):
        record = valid_record()
        record["date"]["start"] = "1923-02-30"
        self.write_record(record)
        self.assertIn("invalid-catalog-date", self.codes())

    def test_invalid_date_certainty_is_rejected(self):
        record = valid_record()
        record["date"]["certainty"] = "unknown"
        self.write_record(record)
        self.assertIn("invalid-catalog-date", self.codes())

    def test_missing_verification_status_is_rejected(self):
        record = valid_record()
        record["verification"].pop("status")
        self.write_record(record)
        self.assertIn("missing-publication-status", self.codes())

    def test_reversed_date_range_is_rejected(self):
        record = valid_record()
        record["date"].update(start="1924-01-01", end="1923-01-01", precision="range")
        self.write_record(record)
        self.assertIn("invalid-catalog-date", self.codes())

    def test_published_event_requires_exact_day_precision(self):
        record = valid_record(type="event")
        record["verification"]["status"] = "published"
        record["date"].update(start="1923-01-01", precision="year", certainty="estimated")
        record["publicationApproval"] = approval()
        self.write_record(record)
        self.assertIn("imprecise-published-event", self.codes())

    def test_unknown_rights_cannot_be_published(self):
        record = valid_record()
        record["verification"]["status"] = "published"
        record["rights"]["status"] = "unknown"
        record["publicationApproval"] = approval()
        self.write_record(record)
        self.assertIn("unpublishable-rights-status", self.codes())

    def test_duplicate_ids_across_catalog_directories_are_reported(self):
        self.write_record(valid_record(), self.root / "data/archive/catalog/copy.json")
        self.assertIn("duplicate-catalog-id", self.codes())

    def test_duplicate_slugs_are_reported(self):
        second = valid_record(id="record-two", slug="record-one")
        self.write_record(second, self.root / "data/archive/catalog/copy.json")
        self.assertIn("duplicate-catalog-slug", self.codes())

    def test_duplicate_content_identity_is_reported(self):
        second = valid_record(id="record-two", slug="record-two")
        self.write_record(second, self.root / "data/archive/catalog/copy.json")
        self.assertIn("duplicate-catalog-record", self.codes())

    def test_malformed_json_is_critical(self):
        (self.root / "data/archive/catalog/broken.json").write_text("{", encoding="utf-8")
        self.assertIn("invalid-publication-json", self.codes())

    def test_schedule_with_future_timestamp_and_human_approval_passes(self):
        self.write_schedule(schedule())
        result = self.result()
        self.assertEqual(result["scheduled_content"]["valid_entry_count"], 1)
        self.assertNotIn("invalid-scheduled-at", self.codes(result))

    def test_schedule_cannot_publish_draft_catalog_record(self):
        record = valid_record()
        record["verification"]["status"] = "draft"
        self.write_record(record)
        self.write_schedule(schedule())
        self.assertIn("schedule-target-not-reviewed", self.codes())

    def test_schedule_cannot_publish_ai_reviewed_record(self):
        record = valid_record()
        record["verification"]["reviewedBy"] = "OpenCode AI"
        self.write_record(record)
        self.write_schedule(schedule())
        self.assertIn("schedule-target-not-reviewed", self.codes())

    def test_scheduled_publication_without_human_approval_is_critical(self):
        self.write_schedule(schedule(approval=None))
        self.assertIn("unauthorized-scheduled-publication", self.codes())

    def test_schedule_approval_requires_timezone_aware_timestamp(self):
        self.write_schedule(schedule(approval=approval(approvedAt="2026-10-21T12:00:00")))
        self.assertIn("unauthorized-scheduled-publication", self.codes())

    def test_scheduled_timestamp_requires_timezone(self):
        self.write_schedule(schedule(scheduledAt="2026-10-24T12:00:00"))
        self.assertIn("invalid-scheduled-at", self.codes())

    def test_past_scheduled_publication_is_critical(self):
        self.write_schedule(schedule(scheduledAt="2026-10-22T12:00:00Z"))
        self.assertIn("overdue-scheduled-content", self.codes())

    def test_published_content_cannot_have_future_schedule(self):
        record = valid_record()
        record["verification"]["status"] = "published"
        record["publicationApproval"] = approval()
        self.write_record(record)
        self.write_schedule(schedule(status="published"))
        self.assertIn("published-before-schedule", self.codes())

    def test_published_schedule_passes_after_approved_catalog_record(self):
        record = valid_record()
        record["verification"]["status"] = "published"
        record["publicationApproval"] = approval()
        self.write_record(record)
        self.write_schedule(schedule(status="published", scheduledAt="2026-10-22T12:00:00Z"))
        result = self.result()
        self.assertEqual(result["scheduled_content"]["valid_entry_count"], 1)
        self.assertFalse(any(item["severity"] == "critical" for item in result["findings"]))

    def test_schedule_must_reference_existing_archive_record(self):
        self.write_schedule(schedule(recordId="does-not-exist"))
        self.assertIn("schedule-record-not-found", self.codes())

    def test_duplicate_active_schedules_for_same_record_are_rejected(self):
        self.write_schedule(schedule())
        self.write_schedule(schedule(id="schedule-two"), "schedule-two.json")
        self.assertIn("duplicate-active-schedule", self.codes())

    def test_approval_must_precede_scheduled_publication(self):
        self.write_schedule(schedule(approval=approval(approvedAt="2026-10-25T12:00:00Z")))
        self.assertIn("approval-after-schedule", self.codes())

    def test_empty_schedule_directory_is_reported_without_becoming_a_critical(self):
        result = self.result()
        self.assertEqual(result["scheduled_content"]["status"], "not-configured")
        finding = next(item for item in result["findings"] if item["code"] == "scheduled-content-not-configured")
        self.assertEqual(finding["severity"], "warning")


if __name__ == "__main__":
    unittest.main()
