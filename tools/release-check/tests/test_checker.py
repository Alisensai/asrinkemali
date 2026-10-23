import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import checker


class ReleaseCheckTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.report = {"findings": [], "targets": {}}

    def tearDown(self):
        self.temp.cleanup()

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def check_html(self, content):
        self.write("index.html", content)
        checker.check_html(self.root, "static", self.report, False, 0.1, 0, {})
        return {finding["code"] for finding in self.report["findings"]}

    def test_invalid_json_is_reported(self):
        self.write("data.json", '{"items": [}')
        checker.check_json_data(self.root, "static", self.report)
        self.assertIn("invalid-json", {item["code"] for item in self.report["findings"]})

    def test_duplicate_slugs_are_reported(self):
        self.write("items.json", json.dumps([{"slug": "same"}, {"slug": "same"}]))
        checker.check_json_data(self.root, "static", self.report)
        self.assertIn("duplicate-slug", {item["code"] for item in self.report["findings"]})

    def test_unsourced_json_quote_is_reported(self):
        self.write("items.json", json.dumps([{"quote": "Bir alıntı"}]))
        checker.check_json_data(self.root, "static", self.report)
        self.assertIn("unsourced-quote", {item["code"] for item in self.report["findings"]})

    def test_sourced_json_quote_is_allowed(self):
        self.write("items.json", json.dumps([{"quote": "Bir alıntı", "source": "Arşiv"}]))
        checker.check_json_data(self.root, "static", self.report)
        self.assertNotIn("unsourced-quote", {item["code"] for item in self.report["findings"]})

    def test_unsourced_html_quote_is_reported(self):
        self.assertIn("unsourced-quote", self.check_html("<blockquote>Bir söz.</blockquote>"))

    def test_html_quote_cite_attribute_is_allowed(self):
        self.assertNotIn("unsourced-quote", self.check_html('<blockquote cite="https://example.invalid">Bir söz.</blockquote>'))

    def test_broken_anchor_is_reported(self):
        self.assertIn("broken-anchor", self.check_html('<a href="#missing">Bölüm</a>'))

    def test_valid_anchor_passes(self):
        self.assertNotIn("broken-anchor", self.check_html('<a href="#ok">Bölüm</a><section id="ok"></section>'))

    def test_broken_route_is_reported(self):
        self.assertIn("broken-route", self.check_html('<a href="/missing/">Sayfa</a>'))

    def test_valid_route_passes(self):
        self.write("sub/index.html", "<h1>Var</h1>")
        self.assertNotIn("broken-route", self.check_html('<a href="sub/">Sayfa</a>'))

    def test_missing_image_alt_is_reported(self):
        self.assertIn("missing-image-alt", self.check_html('<img src="image.webp">'))

    def test_missing_local_image_is_reported(self):
        self.assertIn("broken-resource", self.check_html('<img src="missing.webp" alt="Açıklama">'))

    def test_missing_css_asset_is_reported(self):
        self.write("styles.css", ".hero { background-image: url('../missing.webp'); }")
        checker.check_css_resources(self.root, "static", self.report)
        self.assertIn("broken-resource", {item["code"] for item in self.report["findings"]})

    def test_missing_og_image_is_reported(self):
        self.assertIn("broken-og-image", self.check_html('<meta property="og:image" content="missing.webp">'))

    def test_empty_image_alt_is_reported(self):
        self.assertIn("missing-image-alt", self.check_html('<img src="image.webp" alt="">'))

    def test_missing_title_is_reported(self):
        self.assertIn("missing-title", self.check_html("<html><body>İçerik</body></html>"))

    def test_all_required_seo_metadata_is_checked(self):
        codes = self.check_html("<html><head><title>Başlık</title></head></html>")
        for field in ("description", "robots", "canonical", "og:title", "og:description", "og:image"):
            self.assertIn("missing-seo-" + field.replace(":", "-"), codes)

    def test_missing_sitemap_is_reported(self):
        self.assertIn("missing-sitemap", self.check_html("<html><title>Başlık</title></html>"))

    def test_sitemap_in_robots_is_recognized(self):
        self.write("robots.txt", "User-agent: *\nSitemap: https://example.invalid/sitemap.xml\n")
        self.assertNotIn("missing-sitemap", self.check_html("<html><title>Başlık</title></html>"))

    def test_unlabeled_button_is_reported(self):
        self.assertIn("unlabeled-button", self.check_html('<button id="go"></button>'))

    def test_button_without_action_is_reported(self):
        self.assertIn("button-without-action", self.check_html('<button>Gönder</button>'))

    def test_button_with_class_listener_is_recognized(self):
        self.write("app.js", "$$('.search-launch').forEach(button=>button.addEventListener('click', openSearch));")
        codes = self.check_html('<button class="search-launch">Ara</button>')
        self.assertNotIn("button-without-action", codes)

    def test_disabled_button_is_not_reported_as_empty_action(self):
        self.assertNotIn("button-without-action", self.check_html('<button disabled>Yakında</button>'))

    def test_missing_ai_disclosure_is_reported(self):
        self.write("index.html", "<html><body>Prototip</body></html>")
        checker.check_target(self.root, "static", self.report, 5, False, 1, 0, {})
        self.assertIn("missing-ai-disclosure", {item["code"] for item in self.report["findings"]})

    def test_ai_disclosure_is_recognized(self):
        self.write("index.html", "<p>Temsili görsel; yapay zekâ ile üretildi.</p>")
        checker.check_target(self.root, "static", self.report, 5, False, 1, 0, {})
        self.assertNotIn("missing-ai-disclosure", {item["code"] for item in self.report["findings"]})

    def test_missing_target_is_reported_as_skip(self):
        checker.check_target(self.root / "missing", "next", self.report, 5, False, 1, 0, {})
        self.assertTrue(self.report["targets"]["next"].startswith("SKIP (belirtilen dalda yok)"))

    def test_next_source_broken_route_is_reported(self):
        page = self.write("app/page.tsx", '<a href="/missing">Boş rota</a>')
        checker.check_next_sources(self.root, self.report)
        self.assertIn("broken-route", {item["code"] for item in self.report["findings"]})

    def test_next_source_valid_route_passes(self):
        self.write("app/page.tsx", '<a href="/about">About</a>')
        self.write("app/about/page.tsx", '<main id="bio">About</main>')
        checker.check_next_sources(self.root, self.report)
        self.assertNotIn("broken-route", {item["code"] for item in self.report["findings"]})

    def test_next_dynamic_route_is_recognized(self):
        self.write("app/page.tsx", '<a href="/archive/42">Kayıt</a>')
        self.write("app/archive/[slug]/page.tsx", "<main>Kayıt</main>")
        checker.check_next_sources(self.root, self.report)
        self.assertNotIn("broken-route", {item["code"] for item in self.report["findings"]})

    def test_next_source_broken_anchor_is_reported(self):
        self.write("app/page.tsx", '<a href="#missing">Anchor</a>')
        checker.check_next_sources(self.root, self.report)
        self.assertIn("broken-anchor", {item["code"] for item in self.report["findings"]})

    def test_large_file_threshold_is_reported(self):
        self.write("index.html", "<p>AI temsili</p>")
        self.write("large.bin", "x" * 2048)
        checker.check_target(self.root, "static", self.report, 0.0001, False, 1, 0, {})
        self.assertIn("large-file", {item["code"] for item in self.report["findings"]})

    def test_local_target_rejects_parent_escape(self):
        resolved = checker.local_target(self.root, self.root / "index.html", "../outside.html")
        self.assertEqual(resolved[0], self.root / "__outside_root__")

    def test_offline_mode_makes_no_network_requests(self):
        codes = self.check_html('<a href="https://example.invalid">Dış site</a>')
        self.assertNotIn("external-link-failed", codes)

    def test_external_link_cache_deduplicates_repeated_urls(self):
        self.write("a.html", '<a href="https://example.invalid">A</a><a href="https://example.invalid">B</a>')
        cache = {"https://example.invalid": (200, "")}
        checker.check_html(self.root, "static", self.report, True, 0.1, 0, cache)
        self.assertEqual(len(cache), 1)

    def test_markdown_report_contains_finding(self):
        report = {"target": "static", "fail_on": "none", "targets": {"static": "CHECKED"},
                  "git": {}, "findings": [{"severity": "error", "target": "static", "code": "broken-route",
                                           "path": "index.html", "message": "Hedef yok"}]}
        markdown = checker.render_markdown(report)
        self.assertIn("broken-route", markdown)
        self.assertIn("Hedef yok", markdown)


if __name__ == "__main__":
    unittest.main()
