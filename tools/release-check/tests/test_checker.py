import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

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

    def test_next_source_audit_ignores_generated_playwright_report(self):
        self.write("app/page.tsx", "<main>Home</main>")
        self.write("playwright-report/index.html", '<a href="/not-a-route">Report link</a>')
        checker.check_target(self.root, "next", self.report, 5, False, 1, 0, {})
        codes = {item["code"] for item in self.report["findings"]}
        self.assertNotIn("broken-route", codes)
        self.assertIn("missing-route", codes)

    def test_next_source_link_to_existing_route_handler_passes(self):
        # V0.9 güvenlik denetimi: app/**/route.ts geçerli bir bağlantı hedefidir (yanlış pozitif düzeltmesi).
        self.write("app/page.tsx", '<a href="/api/export?format=csv">CSV</a>')
        self.write("app/api/export/route.ts", "export async function GET() { return new Response('x'); }")
        self.write("components/ExportSection.tsx", '<a href="/api/export?format=json">JSON</a>')
        checker.check_next_sources(self.root, self.report)
        self.assertNotIn("broken-route", {item["code"] for item in self.report["findings"]})

    def test_next_source_link_to_missing_route_handler_is_still_reported(self):
        self.write("app/page.tsx", '<a href="/api/yok?format=csv">CSV</a>')
        self.write("app/api/export/route.ts", "export async function GET() { return new Response('x'); }")
        self.write("components/ExportSection.tsx", '<a href="/api/hic-yok">JSON</a>')
        checker.check_next_sources(self.root, self.report)
        broken = {item["message"] for item in self.report["findings"] if item["code"] == "broken-route"}
        self.assertTrue(any("/api/yok?format=csv" in message for message in broken), broken)
        self.assertTrue(any("/api/hic-yok" in message for message in broken), broken)

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

    def test_next_route_handler_is_recognized(self):
        self.write("app/page.tsx", '<a href="/api/export">Dışa Aktar</a>')
        self.write("app/api/export/route.ts", 'export async function GET() {}')
        checker.check_next_sources(self.root, self.report)
        self.assertNotIn("broken-route", {item["code"] for item in self.report["findings"]})

    def test_next_source_broken_anchor_is_reported(self):
        self.write("app/page.tsx", '<a href="#missing">Anchor</a>')
        checker.check_next_sources(self.root, self.report)
        self.assertIn("broken-anchor", {item["code"] for item in self.report["findings"]})

    def test_next_external_url_check_is_offline_by_default(self):
        self.write("app/page.tsx", '<a href="https://example.invalid">External</a>')
        checker.check_next_sources(self.root, self.report)
        self.assertNotIn("external-link-failed", {item["code"] for item in self.report["findings"]})

    def test_next_external_link_uses_supplied_cache(self):
        self.write("app/page.tsx", '<a href="https://example.invalid">A</a><a href="https://example.invalid">B</a>')
        cache = {"https://example.invalid": (200, "")}
        checker.check_next_sources(self.root, self.report, external=True, cache=cache)
        self.assertEqual(len(cache), 1)

    def test_next_required_route_inventory_is_enforced(self):
        self.write("app/page.tsx", "<main>Home</main>")
        checker.check_next_sources(self.root, self.report)
        self.assertIn("missing-route", {item["code"] for item in self.report["findings"]})

    def test_next_image_with_missing_alt_is_reported(self):
        self.write("app/page.tsx", '<Image src="/assets/photo.webp" />')
        checker.check_next_sources(self.root, self.report)
        self.assertIn("missing-image-alt", {item["code"] for item in self.report["findings"]})

    def test_next_decorative_empty_alt_is_allowed(self):
        self.write("app/page.tsx", '<Image src="/assets/photo.webp" alt="" />')
        checker.check_next_sources(self.root, self.report)
        self.assertNotIn("missing-image-alt", {item["code"] for item in self.report["findings"]})

    def test_next_missing_asset_is_reported(self):
        self.write("app/page.tsx", '<Image src="/assets/missing.webp" alt="Photo" />')
        checker.check_next_sources(self.root, self.report)
        self.assertIn("broken-resource", {item["code"] for item in self.report["findings"]})

    def test_next_button_without_event_is_reported(self):
        self.write("app/page.tsx", "<button>Click</button>")
        checker.check_next_sources(self.root, self.report)
        self.assertIn("button-without-action", {item["code"] for item in self.report["findings"]})

    def test_next_button_with_event_is_allowed(self):
        self.write("app/page.tsx", '<button type="button" onClick={() => run()}>Run</button>')
        checker.check_next_sources(self.root, self.report)
        self.assertNotIn("button-without-action", {item["code"] for item in self.report["findings"]})

    def test_next_button_with_href_is_allowed(self):
        # Tasarım sistemi <Button href> bileşeni Link render eder; geçerli eylemdir.
        self.write("app/page.tsx", '<Button href="/about">Link Button</Button>')
        self.write("app/about/page.tsx", '<main>About</main>')
        checker.check_next_sources(self.root, self.report)
        self.assertNotIn("button-without-action", {item["code"] for item in self.report["findings"]})

    def test_native_button_with_href_is_still_reported(self):
        # V1.0 denetimi: yerel <button href> tarayıcıda hiçbir şey yapmaz; kapı bunu kaçırmamalı.
        self.write("app/page.tsx", '<button href="/about">Ölü düğme</button>')
        self.write("app/about/page.tsx", '<main>About</main>')
        checker.check_next_sources(self.root, self.report)
        self.assertIn("button-without-action", {item["code"] for item in self.report["findings"]})

    def test_next_http_link_is_insecure(self):
        self.write("app/page.tsx", '<a href="http://example.invalid">External</a>')
        checker.check_next_sources(self.root, self.report)
        self.assertIn("insecure-external-link", {item["code"] for item in self.report["findings"]})

    def test_next_blank_external_link_requires_safe_rel(self):
        self.write("app/page.tsx", '<a href="https://example.invalid" target="_blank">External</a>')
        checker.check_next_sources(self.root, self.report)
        self.assertIn("unsafe-external-link", {item["code"] for item in self.report["findings"]})

    def test_next_blank_external_link_with_safe_rel_passes(self):
        self.write("app/page.tsx", '<a href="https://example.invalid" target="_blank" rel="noopener noreferrer">External</a>')
        checker.check_next_sources(self.root, self.report)
        self.assertNotIn("unsafe-external-link", {item["code"] for item in self.report["findings"]})

    def test_required_missing_target_is_critical_not_skip_only(self):
        checker.check_target(self.root / "missing", "next", self.report, 5, False, 1, 0, {}, require_target=True)
        self.assertIn("required-target-missing", {item["code"] for item in self.report["findings"]})

    def test_secret_detector_reports_without_echoing_secret(self):
        content = "pass" + "word = '" + "a-fake-test-value-long-enough" + "'"
        self.write("credentials.txt", content)
        checker.check_secret_leaks(self.root, self.report)
        finding = next(item for item in self.report["findings"] if item["code"] == "potential-secret-credential-assignment")
        self.assertNotIn("a-fake-test-value-long-enough", finding["message"])

    def test_secret_environment_file_is_critical(self):
        self.write(".env.local", "SITE_TOKEN=fake")
        checker.check_secret_leaks(self.root, self.report)
        self.assertIn("environment-file-present", {item["code"] for item in self.report["findings"]})

    def test_example_env_file_is_allowed(self):
        self.write(".env.example", "API_KEY=replace-me")
        checker.check_secret_leaks(self.root, self.report)
        self.assertNotIn("environment-file-present", {item["code"] for item in self.report["findings"]})

    def test_seo_configuration_requires_sitemap_and_robots(self):
        self.write("app/layout.tsx", "export const metadata = { title: 'Title' };")
        checker.check_next_seo(self.root, self.report)
        codes = {item["code"] for item in self.report["findings"]}
        self.assertIn("missing-robots-config", codes)
        self.assertIn("missing-sitemap-config", codes)
        self.assertIn("missing-seo-twitter-card", codes)

    def test_seo_configuration_rejects_missing_open_graph_asset(self):
        self.write("app/layout.tsx", 'export const metadata = { openGraph: { images: [{ url: "/assets/missing.webp" }] } };')
        checker.check_next_seo(self.root, self.report)
        self.assertIn("broken-og-image", {item["code"] for item in self.report["findings"]})

    def test_consistent_package_lock_passes(self):
        self.write("package.json", json.dumps({
            "dependencies": {"next": "1"},
            "scripts": {"lint": "eslint", "typecheck": "tsc", "test": "node --test", "build": "next build"},
        }))
        self.write("package-lock.json", json.dumps({"packages": {"": {
            "dependencies": {"next": "1"}, "devDependencies": {}, "optionalDependencies": {},
        }}}))
        checker.check_web_package(self.root, self.report)
        self.assertNotIn("package-lock-mismatch", {item["code"] for item in self.report["findings"]})

    def test_mismatched_package_lock_is_critical(self):
        self.write("package.json", json.dumps({
            "dependencies": {"next": "2"}, "scripts": {"lint": "eslint", "typecheck": "tsc", "test": "node --test", "build": "next build"},
        }))
        self.write("package-lock.json", json.dumps({"packages": {"": {
            "dependencies": {"next": "1"}, "devDependencies": {}, "optionalDependencies": {},
        }}}))
        checker.check_web_package(self.root, self.report)
        self.assertIn("package-lock-mismatch", {item["code"] for item in self.report["findings"]})

    def test_large_file_threshold_is_reported(self):
        self.write("index.html", "<p>AI temsili</p>")
        self.write("large.bin", "x" * 2048)
        checker.check_target(self.root, "static", self.report, 0.0001, False, 1, 0, {})
        self.assertIn("large-file", {item["code"] for item in self.report["findings"]})

    @patch.dict("os.environ", {"GITHUB_HEAD_REF": "feature/quality", "GITHUB_REF_NAME": "6/merge"})
    def test_ci_pr_branch_is_reported_when_checkout_is_detached(self):
        checker.check_repo(self.root, self.report, {})
        self.assertEqual(self.report["git"]["branch"], "feature/quality")
        self.assertNotIn("unknown-branch", {item["code"] for item in self.report["findings"]})

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

    def test_node_modules_backup_directories_are_ignored(self):
        self.write("node_modules.external/package/tsconfig.json", '{"compilerOptions": {"strict": true,}}')
        checker.check_json_data(self.root, "next", self.report)
        self.assertNotIn("invalid-json", {item["code"] for item in self.report["findings"]})

    def test_external_archive_catalog_is_counted(self):
        web = self.root / "web"
        self.write("content/archive/records/example.json", json.dumps({
            "verification": {"status": "published"}
        }))
        self.assertEqual(checker.external_archive_stats(web), {
            "total": 1, "published": 1, "reviewed": 0, "draft": 0,
            "published_events": 0,
        })

    def test_markdown_report_contains_finding(self):
        report = {"target": "static", "fail_on": "none", "targets": {"static": "CHECKED"},
                  "git": {}, "findings": [{"severity": "error", "target": "static", "code": "broken-route",
                                           "path": "index.html", "message": "Hedef yok"}]}
        markdown = checker.render_markdown(report)
        self.assertIn("broken-route", markdown)
        self.assertIn("Hedef yok", markdown)


if __name__ == "__main__":
    unittest.main()
