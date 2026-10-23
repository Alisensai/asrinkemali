import sys
from pathlib import Path
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import archive_validator


def valid_record(**overrides):
    record = {
        "id": "record-1",
        "slug": "record-one",
        "title": "Belge başlığı",
        "type": "belge",
        "date": "1923-10-29",
        "datePrecision": "day",
        "description": "Kaynağa dayalı açıklama.",
        "sourceInstitution": "Örnek Arşiv",
        "sourceUrl": "https://archive.example/record/1",
        "sourceDescription": "Katalog numarası: A-1.",
        "license": "Kamu malı olduğu uzman incelemesinde belirlendi.",
        "useStatus": "Yeniden kullanım için izin doğrulandı.",
        "verificationStatus": "doğrulandı",
        "expertReviewStatus": "completed",
        "reviewedBy": "Tarih editörü",
        "reviewedAt": "2026-10-23",
    }
    record.update(overrides)
    return record


class ArchiveValidatorTests(unittest.TestCase):
    def codes(self, records):
        return [item["code"] for item in archive_validator.validate_records(records)["findings"]]

    def test_empty_archive_is_release_readiness_warning(self):
        result = archive_validator.validate_records([])
        self.assertEqual(result["findings"][0]["code"], "missing-archive-content")
        self.assertEqual(result["findings"][0]["severity"], "warning")

    def test_valid_expert_reviewed_record_passes(self):
        self.assertEqual(archive_validator.validate_records([valid_record()])["findings"], [])

    def test_unique_id_is_required(self):
        self.assertIn("missing-id", self.codes([valid_record(id="")]))

    def test_duplicate_ids_are_rejected(self):
        self.assertIn("duplicate-id", self.codes([valid_record(), valid_record(slug="record-two")]))

    def test_duplicate_slugs_are_rejected(self):
        self.assertIn("duplicate-slug", self.codes([valid_record(), valid_record(id="record-2")]))

    def test_repeated_content_records_are_rejected(self):
        self.assertIn("duplicate-record", self.codes([valid_record(), valid_record(id="record-2", slug="record-two")]))

    def test_invalid_calendar_day_is_rejected(self):
        self.assertIn("invalid-date", self.codes([valid_record(date="1923-02-30")]))

    def test_date_precision_must_match_date(self):
        self.assertIn("invalid-date", self.codes([valid_record(date="1923", datePrecision="day")]))

    def test_year_precision_is_supported(self):
        self.assertNotIn("invalid-date", self.codes([valid_record(date="1923", datePrecision="year")]))

    def test_date_range_is_validated(self):
        self.assertNotIn("invalid-date", self.codes([valid_record(date="1919-05-19/1923-10-29", datePrecision="range")]))

    def test_invalid_date_range_order_is_rejected(self):
        self.assertIn("invalid-date", self.codes([valid_record(date="1923/1919", datePrecision="range")]))

    def test_source_institution_is_required(self):
        self.assertIn("missing-source-institution", self.codes([valid_record(sourceInstitution="")]))

    def test_source_url_must_be_well_formed_http_url(self):
        self.assertIn("invalid-source-url", self.codes([valid_record(sourceUrl="not a URL")]))

    def test_source_description_is_required(self):
        self.assertIn("missing-source-description", self.codes([valid_record(sourceDescription="")]))

    def test_copyright_status_is_required(self):
        self.assertIn("missing-copyright-status", self.codes([valid_record(license="")]))

    def test_usage_status_is_required(self):
        self.assertIn("missing-use-status", self.codes([valid_record(useStatus="")]))

    def test_unverified_draft_requires_expert_review(self):
        findings = archive_validator.validate_records([valid_record(verificationStatus="taslak", expertReviewStatus="required")])["findings"]
        self.assertTrue(any(item["code"] == "expert-review-required" and item["severity"] == "expert_review" for item in findings))

    def test_unverified_published_record_is_critical(self):
        findings = archive_validator.validate_records([valid_record(verificationStatus="taslak", isPublished=True)])["findings"]
        self.assertTrue(any(item["code"] == "unverified-published-record" and item["severity"] == "critical" for item in findings))

    def test_verified_record_requires_reviewer_identity(self):
        self.assertIn("incomplete-expert-review", self.codes([valid_record(reviewedBy="")]))

    def test_quote_needs_its_own_source_metadata(self):
        self.assertIn("unsourced-attributed-quote", self.codes([valid_record(quote="Atatürk alıntısı")]))

    def test_quote_with_source_metadata_passes(self):
        item = valid_record(
            quote="Alıntı metni.",
            quoteSourceInstitution="Arşiv",
            quoteSourceUrl="https://archive.example/quote/1",
            quoteSourceDescription="Belge, sayfa 4.",
        )
        self.assertNotIn("unsourced-attributed-quote", self.codes([item]))

    def test_ai_illustration_cannot_be_historical_photograph(self):
        image = {"src": "/assets/temsili.webp", "alt": "Temsili görsel", "isIllustrative": True}
        self.assertIn("ai-image-misclassified", self.codes([valid_record(type="fotoğraf", image=image)]))

    def test_ai_image_without_explicit_flag_is_still_identified_as_illustrative(self):
        image = {"src": "/assets/temsili.webp", "alt": "Temsili görsel", "isIllustrative": False}
        self.assertIn("ai-image-misclassified", self.codes([valid_record(type="fotoğraf", image=image)]))

    def test_source_url_is_not_claimed_as_historical_verification(self):
        self.assertNotIn("expert-review-required", self.codes([valid_record()]))
        item = valid_record(expertReviewStatus="required", reviewedBy="", reviewedAt="")
        self.assertIn("expert-review-required", self.codes([item]))

    def test_typescript_archive_array_is_read(self):
        source = """import type { ArchiveRecord } from './site-types';
export const archiveRecords: ArchiveRecord[] = [
  { id: 'one', slug: 'one', nested: { ok: true }, flags: ['a', 'b'] },
];"""
        records = archive_validator.extract_typescript_records(source)
        self.assertEqual(records[0]["nested"], {"ok": True})
        self.assertEqual(records[0]["flags"], ["a", "b"])

    def test_json_archive_file_is_read(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "records.json"
            path.write_text('[{"id":"one"}]', encoding="utf-8")
            self.assertEqual(archive_validator.load_records(path), [{"id": "one"}])

    def test_missing_typescript_export_is_an_explicit_error(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "site-data.ts"
            path.write_text("export const something = [];", encoding="utf-8")
            result = archive_validator.validate_file(path)
            self.assertEqual(result["findings"][0]["code"], "invalid-archive-data")

    def test_empty_site_collections_are_reported_as_missing_content(self):
        source = """
export const publications = [];
export const chronology = [];
export const searchItems = [];
export const primaryNavigation = [];
export const archiveCollections = [];
"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "site-data.ts"
            path.write_text(source, encoding="utf-8")
            result = archive_validator.validate_site_collections(path)
        self.assertEqual(result["collection_counts"]["publications"], 0)
        self.assertIn("missing-published-content", {item["code"] for item in result["findings"]})

    def test_incomplete_publication_is_rejected(self):
        source = """
export const publications = [{ id: 'one', title: '', publishedAt: '2026', href: '', source: '' }];
export const chronology = [];
export const searchItems = [];
export const primaryNavigation = [];
export const archiveCollections = [];
"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "site-data.ts"
            path.write_text(source, encoding="utf-8")
            result = archive_validator.validate_site_collections(path)
        codes = {item["code"] for item in result["findings"]}
        self.assertIn("incomplete-publication", codes)
        self.assertIn("invalid-publication-date", codes)

    def test_chronology_without_source_is_rejected(self):
        source = """
export const publications = [];
export const chronology = [{ year: '1923', description: 'Bir olay', source: '' }];
export const searchItems = [];
export const primaryNavigation = [];
export const archiveCollections = [];
"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "site-data.ts"
            path.write_text(source, encoding="utf-8")
            result = archive_validator.validate_site_collections(path)
        self.assertIn("unsourced-chronology", {item["code"] for item in result["findings"]})

    def test_site_quote_requires_original_source(self):
        source = """
export const publications = [{ id: 'one', title: 'Yayın', publishedAt: '1923-01-01', href: '/yayinlar', source: 'Arşiv', quote: 'Alıntı' }];
export const chronology = [];
export const searchItems = [];
export const primaryNavigation = [];
export const archiveCollections = [];
"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "site-data.ts"
            path.write_text(source, encoding="utf-8")
            result = archive_validator.validate_site_collections(path)
        self.assertIn("unsourced-attributed-quote", {item["code"] for item in result["findings"]})

    def test_duplicate_navigation_href_is_reported(self):
        source = """
export const publications = [];
export const chronology = [];
export const searchItems = [];
export const primaryNavigation = [{ label: 'A', href: '/' }, { label: 'B', href: '/' }];
export const archiveCollections = [];
"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "site-data.ts"
            path.write_text(source, encoding="utf-8")
            result = archive_validator.validate_site_collections(path)
        self.assertIn("duplicate-content-href", {item["code"] for item in result["findings"]})

    def test_illustrative_site_image_must_disclose_representation(self):
        source = """
export const publications = [];
export const chronology = [];
export const searchItems = [];
export const primaryNavigation = [];
export const archiveCollections = [{ type: 'A', title: 'A', description: 'A', status: 'draft', href: '/arsiv', image: { src: '/assets/ai.webp', alt: 'Bir görsel', isIllustrative: true } }];
"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "site-data.ts"
            path.write_text(source, encoding="utf-8")
            result = archive_validator.validate_site_collections(path)
        self.assertIn("missing-illustration-disclosure", {item["code"] for item in result["findings"]})


if __name__ == "__main__":
    unittest.main()
