import csv
from contextlib import redirect_stdout
from datetime import date, datetime, timezone
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

TOOL_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL_DIR))

import audit_ledger
import editorial_review
import source_links


TODAY = date(2026, 10, 23)


def sample_record(**overrides):
    record = {
        "id": "record-one",
        "slug": "record-one",
        "title": "Örnek tarihî kayıt",
        "type": "event",
        "date": {
            "start": "1923-10-29",
            "end": None,
            "precision": "day",
            "certainty": "exact",
        },
        "source": {
            "institution": "Örnek Arşiv",
            "url": "https://archive.example/records/1",
            "title": "Kayıt 1",
            "note": "Arşiv kataloğu girdisi.",
        },
        "rights": {"status": "official_link_only"},
        "verification": {
            "status": "published",
            "reviewedBy": "OpenCode AI archive review",
            "reviewedAt": "2026-10-20",
            "checks": {"sourceReachable": True},
        },
        "quotation": None,
        "image": None,
    }
    record.update(overrides)
    return record


class EditorialReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.records_dir = self.root / "content/archive/records"
        self.catalog_dir = self.root / "data/archive/catalog"
        self.forms_dir = self.root / "forms"
        self.reports_dir = self.root / "reports"
        self.records_dir.mkdir(parents=True)
        self.catalog_dir.mkdir(parents=True)
        self.path = self.records_dir / "record-one.json"
        self.write_record(sample_record(), self.path)

    def tearDown(self):
        self.temp.cleanup()

    def write_record(self, record, path):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(record, ensure_ascii=False), encoding="utf-8")
        return path

    def test_inventory_reads_both_archive_roots(self):
        self.write_record(
            sample_record(id="record-two", slug="record-two"),
            self.catalog_dir / "record-two.json",
        )
        report = editorial_review.build_inventory(self.root, today=TODAY)
        self.assertEqual(report["summary"]["record_count"], 2)
        self.assertEqual({row["record_id"] for row in report["records"]}, {"record-one", "record-two"})

    def test_inventory_separates_ai_and_unverified_human_review(self):
        report = editorial_review.build_inventory(self.root, today=TODAY)
        row = report["records"][0]
        self.assertEqual(row["ai_review_status"], "ai_review_only")
        self.assertEqual(row["human_expert_review_status"], "ai_review_only")
        self.assertEqual(row["recorded_source_access_claim"], "previously_reported_reachable_not_rechecked")
        self.assertEqual(row["source_access_status"], "not_checked")

    def test_inventory_summarizes_missing_rights_and_pending_publication(self):
        record = sample_record()
        record["rights"] = {"status": "unknown"}
        self.write_record(record, self.path)
        summary = editorial_review.build_inventory(self.root, today=TODAY)["summary"]
        self.assertEqual(summary["rights_unclear_ids"], ["record-one"])
        self.assertEqual(summary["publication_approval_pending_ids"], ["record-one"])
        self.assertEqual(summary["human_review_missing_ids"], ["record-one"])

    def test_malformed_json_is_reported_without_stopping_inventory(self):
        (self.records_dir / "broken.json").write_text("{", encoding="utf-8")
        report = editorial_review.build_inventory(self.root, today=TODAY)
        self.assertEqual(report["summary"]["record_count"], 1)
        self.assertEqual(report["findings"][0]["code"], "invalid_archive_json")

    def test_duplicate_candidate_and_source_conflict_are_heuristic_findings(self):
        second = sample_record(
            id="record-two",
            source={
                "institution": "Başka Arşiv",
                "url": "https://other.example/records/99",
                "citation": "Başka kaynak, 1923.",
            },
        )
        self.write_record(second, self.catalog_dir / "record-two.json")
        report = editorial_review.build_inventory(self.root, today=TODAY)
        self.assertEqual(report["summary"]["probable_duplicate_group_count"], 1)
        self.assertEqual(report["summary"]["conflicting_source_group_count"], 1)
        self.assertTrue(any("Başka Arşiv" in item for item in report["conflicting_source_groups"][0]["source_claims"]))

    def test_duplicate_record_ids_and_slugs_are_reported(self):
        second = sample_record(id="record-one", slug="record-one", title="Farklı başlık")
        self.write_record(second, self.catalog_dir / "second.json")
        report = editorial_review.build_inventory(self.root, today=TODAY)
        self.assertEqual(report["summary"]["record_identifier_collision_group_count"], 2)
        self.assertIn("duplicate_record_identifier", {item["code"] for item in report["findings"]})

    def test_estimated_date_is_listed_as_a_risk(self):
        record = sample_record()
        record["date"].update(start="1923-01-01", precision="year", certainty="estimated")
        self.write_record(record, self.path)
        report = editorial_review.build_inventory(self.root, today=TODAY)
        self.assertEqual(report["summary"]["estimated_date_ids"], ["record-one"])
        self.assertIn("estimated_date_requires_context_review", report["records"][0]["risk_flags"])

    def test_form_creation_starts_pending_and_does_not_change_archive(self):
        before = self.path.read_bytes()
        result = editorial_review.create_forms(self.root, self.forms_dir)
        form = json.loads((self.forms_dir / "record-one.json").read_text(encoding="utf-8"))
        self.assertEqual(result["created"], ["record-one"])
        self.assertEqual(form["review_status"], "pending")
        self.assertEqual(form["outcome"], "pending")
        self.assertTrue(all(value == "not_reviewed" for value in form["checks"].values()))
        self.assertIsNone(form["reviewer"])
        self.assertIsNone(form["publicationApproval"])
        self.assertEqual(self.path.read_bytes(), before)

    def test_repeated_form_generation_preserves_human_draft(self):
        editorial_review.create_forms(self.root, self.forms_dir)
        form_path = self.forms_dir / "record-one.json"
        form_path.write_text('{"preserve": "manual draft"}', encoding="utf-8")
        result = editorial_review.create_forms(self.root, self.forms_dir)
        self.assertEqual(result["preserved"], ["record-one"])
        self.assertEqual(json.loads(form_path.read_text(encoding="utf-8")), {"preserve": "manual draft"})

    def test_form_schema_matches_generated_pending_form(self):
        schema = json.loads((TOOL_DIR / "review-form.schema.json").read_text(encoding="utf-8"))
        form = editorial_review.create_review_form(self.path, self.root, sample_record())
        self.assertEqual(set(schema["required"]), set(form))
        self.assertEqual(schema["properties"]["review_status"]["enum"], ["pending", "submitted"])
        self.assertEqual(schema["properties"]["publicationApproval"]["oneOf"][0]["type"], "null")
        self.assertEqual(form["checks"].keys(), schema["properties"]["checks"]["properties"].keys())

    def test_valid_human_form_and_publication_approval_match_release_guard_contract(self):
        record = sample_record()
        form = editorial_review.create_review_form(self.path, self.root, record)
        form.update({
            "review_status": "submitted",
            "reviewer": {"name": "Tarih uzmanı", "role": "human_expert"},
            "review_date": "2026-10-21",
            "checks": {
                "historical_facts": "pass",
                "source_authenticity": "pass",
                "source_record_consistency": "pass",
                "quotation": "not_applicable",
                "copyright_and_reuse": "pass",
            },
            "outcome": "approved",
            "evidence": [{"description": "Kurum katalog kaydı incelendi.", "reference": "Kutu 12 / belge 4"}],
            "explanation": "Tarih ve katalog tanımı birincil belgeyle karşılaştırıldı.",
            "publicationApproval": {
                "status": "approved",
                "authority": "human",
                "role": "human_editor",
                "approvedBy": "İnsan yayın editörü",
                "approvedAt": "2026-10-22T10:30:00Z",
            },
        })
        self.assertEqual(editorial_review.validate_review_form(form, record, TODAY), [])

    def test_ai_agent_cannot_submit_as_human_expert(self):
        form = self._approved_form(sample_record(), reviewer="OpenCode AI")
        errors = editorial_review.validate_review_form(form, sample_record(), TODAY)
        self.assertIn("ai_cannot_be_human_reviewer", errors)

    def test_ai_agent_cannot_create_publication_approval(self):
        form = self._approved_form(sample_record(), editor="Copilot agent")
        errors = editorial_review.validate_review_form(form, sample_record(), TODAY)
        self.assertIn("valid_human_editor_publication_approval_required", errors)

    def test_approved_form_requires_editor_contract_and_passed_checks(self):
        form = self._approved_form(sample_record())
        form["publicationApproval"]["role"] = "human_expert"
        form["checks"]["source_authenticity"] = "fail"
        errors = editorial_review.validate_review_form(form, sample_record(), TODAY)
        self.assertIn("approval_requires_all_applicable_checks_to_pass", errors)
        self.assertIn("valid_human_editor_publication_approval_required", errors)

    def test_approval_timestamp_must_follow_review_and_not_be_future(self):
        form = self._approved_form(sample_record())
        form["publicationApproval"]["approvedAt"] = "2026-10-20T08:00:00Z"
        self.assertIn(
            "valid_human_editor_publication_approval_required",
            editorial_review.validate_review_form(form, sample_record(), TODAY),
        )
        form["publicationApproval"]["approvedAt"] = "2026-10-24T08:00:00Z"
        self.assertIn(
            "valid_human_editor_publication_approval_required",
            editorial_review.validate_review_form(form, sample_record(), TODAY),
        )

    def test_review_form_rejects_future_date_and_stale_record_snapshot(self):
        record = sample_record()
        form = self._approved_form(record)
        form["review_date"] = "2026-10-24"
        self.assertIn("invalid_review_date", editorial_review.validate_review_form(form, record, TODAY))
        form["review_date"] = "2026-10-21"
        changed_record = sample_record(title="Kayıt değişti")
        self.assertIn("stale_record_snapshot", editorial_review.validate_review_form(form, changed_record, TODAY))

    def test_quotation_requires_explicit_review_for_approval(self):
        record = sample_record(quotation={"text": "Bir alıntı", "source": "Belge"})
        form = self._approved_form(record)
        form["checks"]["quotation"] = "not_applicable"
        self.assertIn(
            "approval_requires_all_applicable_checks_to_pass",
            editorial_review.validate_review_form(form, record, TODAY),
        )

    def test_unknown_review_status_and_pending_approval_are_rejected(self):
        record = sample_record()
        form = editorial_review.create_review_form(self.path, self.root, record)
        form["review_status"] = "approved"
        form["publicationApproval"] = {
            "status": "approved",
            "authority": "human",
            "role": "human_editor",
            "approvedBy": "İnsan editör",
            "approvedAt": "2026-10-22T12:00:00Z",
        }
        errors = editorial_review.validate_review_form(form, record, TODAY)
        self.assertIn("invalid_review_status", errors)
        self.assertIn("publication_approval_without_submitted_review", errors)

    def test_unexpected_schema_fields_and_wrong_typed_inputs_are_rejected(self):
        record = sample_record()
        form = editorial_review.create_review_form(self.path, self.root, record)
        form["unexpected"] = "value"
        form["checks"]["historical_facts"] = []
        errors = editorial_review.validate_review_form(form, record, TODAY)
        self.assertIn("form_fields_do_not_match_schema", errors)
        self.assertIn("invalid_check_value:historical_facts", errors)

    def test_validate_forms_reports_missing_file(self):
        report = editorial_review.validate_forms(self.root, self.forms_dir, TODAY)
        self.assertEqual(report["form_count"], 0)
        self.assertEqual(report["findings"][0]["code"], "review_form_missing")

    def test_csv_report_escapes_formula_injection(self):
        record = sample_record(title="=HYPERLINK(\"https://example.invalid\")")
        record["type"] = "+CMD"
        self.write_record(record, self.path)
        report = editorial_review.build_inventory(self.root, today=TODAY)
        editorial_review.write_reports(report, self.reports_dir)
        with (self.reports_dir / "inventory.csv").open(encoding="utf-8-sig", newline="") as stream:
            row = next(csv.DictReader(stream))
        self.assertTrue(row["title"].startswith("'="))
        self.assertTrue(row["type"].startswith("'+"))

    def test_reports_are_json_csv_and_markdown(self):
        report = editorial_review.build_inventory(self.root, today=TODAY)
        editorial_review.write_reports(report, self.reports_dir)
        self.assertEqual(json.loads((self.reports_dir / "inventory.json").read_text())["summary"]["record_count"], 1)
        self.assertIn("record-one", (self.reports_dir / "inventory.md").read_text())
        self.assertTrue((self.reports_dir / "inventory.csv").is_file())

    def test_priority_report_orders_source_date_quote_and_rights_risks(self):
        source_gap = sample_record(id="source-gap")
        source_gap["source"].update(url="", citation="", title="", note="")
        self.write_record(source_gap, self.catalog_dir / "source-gap.json")
        date_gap = sample_record(id="date-gap", date={"precision": "unknown", "certainty": "unknown"})
        date_gap["date"] = {"precision": "broken"}
        self.write_record(date_gap, self.catalog_dir / "date-gap.json")
        quote_gap = sample_record(
            id="quote-gap",
            quotation={"text": "Kaynağı belirtilmeyen alıntı"},
        )
        self.write_record(quote_gap, self.catalog_dir / "quote-gap.json")
        rights_gap = sample_record(id="rights-gap", rights={"status": "unknown"})
        self.write_record(rights_gap, self.catalog_dir / "rights-gap.json")

        report = editorial_review.build_inventory(self.root, today=TODAY)
        priorities = {row["record_id"]: row["review_priority"] for row in report["records"]}
        self.assertEqual(priorities["source-gap"]["level"], "P0")
        self.assertEqual(priorities["date-gap"]["level"], "P0")
        self.assertEqual(priorities["quote-gap"]["level"], "P0")
        self.assertEqual(priorities["rights-gap"]["level"], "P1")
        self.assertEqual(priorities["record-one"]["level"], "P3")
        self.assertEqual(priorities["record-one"]["human_expert_review_status"], "ai_review_only")
        self.assertEqual(
            priorities["record-one"]["human_publication_approval_status"],
            "pending",
        )

    def test_schema_report_diffs_archive_versions_and_form_schema_independently(self):
        old_schema = sample_record(id="old-schema", schemaVersion="1.0.0")
        new_schema = sample_record(id="new-schema", schemaVersion="1.1.0", provenance=[])
        self.write_record(old_schema, self.catalog_dir / "old-schema.json")
        self.write_record(new_schema, self.catalog_dir / "new-schema.json")

        schema_report = editorial_review.build_inventory(
            self.root, today=TODAY
        )["schema_compatibility"]
        self.assertEqual(
            schema_report["archive_schema_version_counts"],
            {"(missing)": 1, "1.0.0": 1, "1.1.0": 1},
        )
        self.assertIn(
            "provenance",
            schema_report["archive_fields_by_version"]["1.1.0"],
        )
        self.assertEqual(
            schema_report["editorial_form_schema_version_expected"],
            editorial_review.FORM_SCHEMA_VERSION,
        )
        self.assertIn("ayrı sürüm alanlarıdır", schema_report["interpretation"])

    def test_update_adds_only_missing_forms_and_writes_all_report_formats(self):
        self.write_record(
            sample_record(id="record-two", slug="record-two"),
            self.catalog_dir / "record-two.json",
        )
        first_output = io.StringIO()
        with redirect_stdout(first_output):
            exit_code = editorial_review.main([
                "update",
                "--root", str(self.root),
                "--forms-dir", str(self.forms_dir),
                "--output-dir", str(self.reports_dir),
            ])
        first = json.loads(first_output.getvalue())
        self.assertEqual(exit_code, 0)
        self.assertEqual(first["created_form_count"], len(first["created_form_ids"]))
        self.assertEqual(first["inventory_summary"]["record_count"], 2)
        self.assertEqual(first["form_validation"]["pending_count"], 2)
        self.assertEqual(first["findings"], [])
        expected_count = first["inventory_summary"]["record_count"]
        priority_json = json.loads(
            (self.reports_dir / "review-priority.json").read_text()
        )
        self.assertEqual(priority_json["record_count"], expected_count)
        self.assertEqual(
            priority_json["human_expert_review_pending_count"],
            first["inventory_summary"]["human_review_missing_count"],
        )
        self.assertEqual(
            priority_json["human_publication_approval_pending_count"],
            first["inventory_summary"]["publication_approval_pending_count"],
        )
        self.assertEqual(
            json.loads((self.reports_dir / "schema-compatibility.json").read_text())["archive_record_count"],
            expected_count,
        )
        self.assertIn(
            "## Arşiv kayıt şemaları",
            (self.reports_dir / "schema-compatibility.md").read_text(encoding="utf-8"),
        )
        for stem in ("inventory", "review-priority", "schema-compatibility"):
            self.assertTrue((self.reports_dir / f"{stem}.json").is_file())
            self.assertTrue((self.reports_dir / f"{stem}.csv").is_file())
            self.assertTrue((self.reports_dir / f"{stem}.md").is_file())
            self.assertTrue((self.reports_dir / f"{stem}.md").read_text(encoding="utf-8").strip())
        for stem in ("inventory", "review-priority", "schema-compatibility"):
            with (self.reports_dir / f"{stem}.csv").open(
                encoding="utf-8-sig", newline=""
            ) as stream:
                self.assertTrue(list(csv.DictReader(stream)))

        second_output = io.StringIO()
        with redirect_stdout(second_output):
            exit_code = editorial_review.main([
                "update",
                "--root", str(self.root),
                "--forms-dir", str(self.forms_dir),
                "--output-dir", str(self.reports_dir),
            ])
        second = json.loads(second_output.getvalue())
        self.assertEqual(exit_code, 0)
        self.assertEqual(second["created_form_count"], 0)
        self.assertEqual(second["preserved_form_count"], 2)
        with (self.reports_dir / "review-priority.csv").open(
            encoding="utf-8-sig", newline=""
        ) as stream:
            self.assertEqual(len(list(csv.DictReader(stream))), second["inventory_summary"]["record_count"])

    def test_update_preserves_submitted_human_expert_form_byte_for_byte(self):
        record = sample_record()
        editorial_review.create_forms(self.root, self.forms_dir)
        form_path = self.forms_dir / "record-one.json"
        form = self._approved_form(record)
        form_path.write_text(json.dumps(form, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        before = form_path.read_bytes()

        result = editorial_review.update_inventory(self.root, self.forms_dir, self.reports_dir)

        self.assertEqual(form_path.read_bytes(), before)
        self.assertEqual(result["created_form_count"], 0)
        self.assertEqual(result["preserved_form_count"], 1)

    @unittest.skipUnless(
        os.environ.get("EDITORIAL_ARCHIVE_TEST_ROOT"),
        "Set EDITORIAL_ARCHIVE_TEST_ROOT to run the external archive snapshot integration test.",
    )
    def test_external_archive_snapshot_scales_forms_schema_and_reports(self):
        archive_root = Path(os.environ["EDITORIAL_ARCHIVE_TEST_ROOT"]).resolve()
        loaded, findings = editorial_review.load_records(archive_root)
        self.assertTrue(loaded)
        self.assertEqual(findings, [])
        with tempfile.TemporaryDirectory() as temporary:
            temporary_path = Path(temporary)
            forms_dir = temporary_path / "forms"
            reports_dir = temporary_path / "reports"
            result = editorial_review.update_inventory(archive_root, forms_dir, reports_dir)

            expected_count = len(loaded)
            self.assertEqual(result["inventory_summary"]["record_count"], expected_count)
            self.assertEqual(result["form_validation"]["record_count"], expected_count)
            self.assertEqual(result["form_validation"]["form_count"], expected_count)
            self.assertEqual(result["form_validation"]["pending_count"], expected_count)
            self.assertEqual(result["created_form_count"], expected_count)
            self.assertEqual(result["schema_compatibility"]["archive_record_count"], expected_count)
            self.assertEqual(
                sum(result["schema_compatibility"]["archive_schema_version_counts"].values()),
                expected_count,
            )
            self.assertEqual(result["form_validation"]["findings"], [])
            with (reports_dir / "inventory.csv").open(encoding="utf-8-sig", newline="") as stream:
                self.assertEqual(len(list(csv.DictReader(stream))), expected_count)
            with (reports_dir / "review-priority.csv").open(
                encoding="utf-8-sig", newline=""
            ) as stream:
                self.assertEqual(len(list(csv.DictReader(stream))), expected_count)
            priority_json = json.loads(
                (reports_dir / "review-priority.json").read_text(encoding="utf-8")
            )
            schema_json = json.loads(
                (reports_dir / "schema-compatibility.json").read_text(encoding="utf-8")
            )
            self.assertEqual(priority_json["record_count"], expected_count)
            self.assertEqual(len(priority_json["records"]), expected_count)
            self.assertEqual(
                priority_json["human_expert_review_pending_count"],
                result["inventory_summary"]["human_review_missing_count"],
            )
            self.assertEqual(
                priority_json["human_publication_approval_pending_count"],
                result["inventory_summary"]["publication_approval_pending_count"],
            )
            self.assertEqual(schema_json["archive_record_count"], expected_count)
            with (reports_dir / "schema-compatibility.csv").open(
                encoding="utf-8-sig", newline=""
            ) as stream:
                schema_rows = list(csv.DictReader(stream))
            self.assertEqual(
                len(schema_rows),
                len(schema_json["archive_schema_version_counts"])
                + len(schema_json["editorial_form_schema_version_counts"]),
            )
            for stem in ("inventory", "review-priority", "schema-compatibility"):
                self.assertTrue((reports_dir / f"{stem}.json").is_file())
                self.assertTrue(
                    (reports_dir / f"{stem}.md").read_text(encoding="utf-8").strip()
                )

    def _approved_form(self, record, reviewer="Tarih uzmanı", editor="Yayın editörü"):
        form = editorial_review.create_review_form(self.path, self.root, record)
        form.update({
            "review_status": "submitted",
            "reviewer": {"name": reviewer, "role": "human_expert"},
            "review_date": "2026-10-21",
            "checks": {
                "historical_facts": "pass",
                "source_authenticity": "pass",
                "source_record_consistency": "pass",
                "quotation": "not_applicable",
                "copyright_and_reuse": "pass",
            },
            "outcome": "approved",
            "evidence": [{"description": "Kaynak belgesi karşılaştırıldı.", "reference": "Katalog/4"}],
            "explanation": "İddia birincil belgeyle karşılaştırıldı.",
            "publicationApproval": {
                "status": "approved",
                "authority": "human",
                "role": "human_editor",
                "approvedBy": editor,
                "approvedAt": "2026-10-22T10:30:00Z",
            },
        })
        return form


if __name__ == "__main__":
    unittest.main()
