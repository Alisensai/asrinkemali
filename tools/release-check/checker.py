#!/usr/bin/env python3
"""Dependency-free release quality checks for the Asrın Kemali website."""

from __future__ import annotations

import argparse
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import posixpath
import re
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urldefrag, urljoin, urlparse
from urllib.request import Request, urlopen


AI_DISCLOSURE = ("yapay zekâ", "yapay zeka", "ai-generated", "ai generated", "temsilî", "temsili")
QUOTE_KEYS = {"quote", "quotation", "alıntı", "alinti"}
SOURCE_KEYS = {"source", "sourceurl", "reference", "citation", "cite", "kaynak", "kaynakça", "kaynakca"}
HTML_EXTENSIONS = {".html", ".htm"}
CODE_EXTENSIONS = {".html", ".htm", ".js", ".jsx", ".ts", ".tsx", ".json", ".md"}
IGNORE_DIRS = {".git", "node_modules", ".next", "dist", "build", ".venv", "__pycache__"}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.links: list[tuple[str, str]] = []
        self.resources: list[str] = []
        self.images: list[tuple[str, str | None]] = []
        self.buttons: list[dict[str, str | None]] = []
        self.meta: dict[str, str] = {}
        self.title = ""
        self._title = False
        self._button: dict[str, str | None] | None = None
        self._button_text = ""
        self._quote_tags: list[tuple[str, list[str], bool]] = []
        self.quotes: list[tuple[str, bool]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"] or "")
        if tag == "a":
            self.links.append((values.get("href") or "", values.get("rel") or ""))
        if tag == "img":
            self.images.append((values.get("src") or "", values.get("alt")))
            if values.get("src"):
                self.resources.append(values["src"] or "")
        if tag == "meta":
            key = values.get("name") or values.get("property") or ""
            if key:
                self.meta[key.lower()] = values.get("content") or ""
        if tag == "link" and "canonical" in (values.get("rel") or "").lower().split():
            self.meta["canonical"] = values.get("href") or ""
        if tag == "link" and values.get("href") and "canonical" not in (values.get("rel") or "").lower().split():
            self.resources.append(values["href"] or "")
        if tag == "script" and values.get("src"):
            self.resources.append(values["src"] or "")
        if tag == "title":
            self._title = True
        if tag == "button":
            self._button = values
            self._button_text = ""
        if tag in {"blockquote", "q"}:
            self._quote_tags.append((tag, [], bool(values.get("cite", "").strip())))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_data(self, data: str) -> None:
        if self._title:
            self.title += data
        if self._button is not None:
            self._button_text += data
        for _, chunks, _ in self._quote_tags:
            chunks.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._title = False
        if tag == "button" and self._button is not None:
            self._button["__text"] = self._button_text.strip()
            self.buttons.append(self._button)
            self._button = None
        if tag in {"blockquote", "q"}:
            for index in range(len(self._quote_tags) - 1, -1, -1):
                if self._quote_tags[index][0] == tag:
                    _, chunks, cited = self._quote_tags.pop(index)
                    self.quotes.append((" ".join(chunks).strip(), cited))
                    break


def issue(report: dict, target: str, severity: str, code: str, message: str, path: str = "") -> None:
    report["findings"].append({
        "target": target, "severity": severity, "code": code, "path": path, "message": message,
    })


def files_under(root: Path, suffixes: set[str] | None = None) -> list[Path]:
    files = []
    for current, dirs, names in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in IGNORE_DIRS)
        for name in sorted(names):
            path = Path(current) / name
            if suffixes is None or path.suffix.lower() in suffixes:
                files.append(path)
    return files


def is_source(value: object) -> bool:
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, dict):
        return any(str(key).lower().replace("_", "") in SOURCE_KEYS and is_source(item)
                   for key, item in value.items())
    return False


def check_json_data(root: Path, target: str, report: dict) -> None:
    for path in files_under(root, {".json"}):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            issue(report, target, "error", "invalid-json", f"JSON okunamadı: {exc}", str(path.relative_to(root)))
            continue

        slugs: set[str] = set()

        def visit(value: object) -> None:
            if isinstance(value, dict):
                slug = value.get("slug")
                if isinstance(slug, str):
                    if slug in slugs:
                        issue(report, target, "error", "duplicate-slug", f"Tekrarlanan slug: {slug}", str(path.relative_to(root)))
                    slugs.add(slug)
                for key, item in value.items():
                    if str(key).lower() in QUOTE_KEYS and isinstance(item, str) and item.strip() and not is_source(value):
                        issue(report, target, "error", "unsourced-quote", "Kaynak/citation alanı olmayan alıntı.", str(path.relative_to(root)))
                    visit(item)
            elif isinstance(value, list):
                for item in value:
                    visit(item)

        visit(data)


def local_target(root: Path, page: Path, href: str) -> tuple[Path, str] | None:
    href = html.unescape(href.strip())
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        if href.startswith("#"):
            return page, unquote(href[1:])
        return None
    parsed = urlparse(href)
    if parsed.scheme or parsed.netloc:
        return None
    path_part = unquote(parsed.path)
    target = (page.parent / path_part).resolve() if path_part else page.resolve()
    root_resolved = root.resolve()
    try:
        target.relative_to(root_resolved)
    except ValueError:
        return root / "__outside_root__", ""
    if target.is_dir():
        target = target / "index.html"
    elif not target.suffix:
        if target.with_suffix(".html").is_file():
            target = target.with_suffix(".html")
        else:
            target = target / "index.html"
    return target, unquote(parsed.fragment)


def check_html(root: Path, target: str, report: dict, external: bool, timeout: float, rate_limit: float,
               cache: dict[str, tuple[int | None, str]]) -> None:
    pages = files_under(root, HTML_EXTENSIONS)
    source_files = files_under(root, CODE_EXTENSIONS)
    js_text = "\n".join(p.read_text(encoding="utf-8", errors="replace") for p in source_files if p.suffix.lower() in {".js", ".jsx", ".ts", ".tsx"})
    page_parsers: dict[Path, PageParser] = {}
    for page in pages:
        rel = str(page.relative_to(root))
        try:
            text = page.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            issue(report, target, "error", "unreadable-page", f"HTML okunamadı: {exc}", rel)
            continue
        parser = PageParser()
        try:
            parser.feed(text)
            parser.close()
        except Exception as exc:
            issue(report, target, "error", "invalid-html", f"HTML ayrıştırılamadı: {exc}", rel)
        page_parsers[page.resolve()] = parser
        if len(parser.ids) != len(set(parser.ids)):
            issue(report, target, "error", "duplicate-id", "Sayfada yinelenen id bulundu.", rel)
        if not parser.title.strip():
            issue(report, target, "warning", "missing-title", "SEO için <title> eksik.", rel)
        for field, label in (("description", "description"), ("robots", "robots"),
                             ("og:title", "og:title"), ("og:description", "og:description"),
                             ("og:image", "og:image"), ("canonical", "canonical URL")):
            if not parser.meta.get(field, "").strip():
                issue(report, target, "warning", "missing-seo-" + field.replace(":", "-"),
                      f"SEO metadata eksik: {label}.", rel)
        for src, alt in parser.images:
            if not src.strip():
                issue(report, target, "error", "empty-image-src", "Görsel src değeri boş.", rel)
            if alt is None or not alt.strip():
                issue(report, target, "error", "missing-image-alt", f"Görsel için anlamlı alt metin eksik: {src or '(src yok)'}", rel)
        for button in parser.buttons:
            label = button.get("aria-label") or button.get("title") or button.get("__text") or ""
            button_id = button.get("id") or ""
            has_action = (
                bool(button.get("onclick"))
                or bool(button.get("type") == "submit")
                or any(key.startswith("data-") for key in button)
                or any(button.get(key) for key in ("aria-controls", "aria-expanded", "aria-pressed", "aria-haspopup"))
                or bool(button_id and re.search(rf"""(?:getElementById\(['"]{re.escape(button_id)}['"]\)|#{re.escape(button_id)}\b)""", js_text))
                or any(
                    re.search(rf"""(?:[$]{{1,2}}|document\.querySelector(?:All)?)\s*\(\s*['"][^'"]*\.{re.escape(class_name)}(?:[.#\s'"]|$)""", js_text)
                    and "addEventListener" in js_text
                    for class_name in (button.get("class") or "").split()
                )
            )
            if not label.strip():
                issue(report, target, "error", "unlabeled-button", "Düğmenin görünür veya erişilebilir etiketi yok.", rel)
            if not has_action and "disabled" not in button and button.get("aria-disabled") != "true":
                issue(report, target, "error", "button-without-action", f"İşlevi tespit edilemeyen düğme: {label.strip() or button_id or '(etiketsiz)'}", rel)
        for quote, has_cite in parser.quotes:
            if quote and not has_cite and not re.search(r"\b(?:kaynak|source|cite|citation|atıf|referans)\b", quote, re.I):
                issue(report, target, "warning", "unsourced-quote", "Alıntı öğesinde kaynak/citation görünmüyor.", rel)
        og_image = parser.meta.get("og:image", "")
        if og_image and not urlparse(og_image).scheme and not urlparse(og_image).netloc:
            image_target = local_target(root, page, og_image)
            if image_target and not image_target[0].is_file():
                issue(report, target, "error", "broken-og-image", f"Open Graph görseli bulunamadı: {og_image}", rel)
        for resource in parser.resources:
            resolved = local_target(root, page, resource)
            if resolved and not resolved[0].is_file():
                issue(report, target, "error", "broken-resource", f"Yerel kaynak bulunamadı: {resource}", rel)

    all_ids = {path: set(parser.ids) for path, parser in page_parsers.items()}
    has_sitemap = any((root / name).is_file() for name in ("sitemap.xml", "sitemap-index.xml"))
    robots_txt = root / "robots.txt"
    if robots_txt.is_file():
        has_sitemap = has_sitemap or bool(re.search(r"(?im)^\s*sitemap\s*:", robots_txt.read_text(encoding="utf-8", errors="replace")))
    if not has_sitemap:
        issue(report, target, "warning", "missing-sitemap", "sitemap.xml veya robots.txt içindeki Sitemap bildirimi yok.")
    for page, parser in page_parsers.items():
        rel = str(page.relative_to(root.resolve()))
        for href, _ in parser.links:
            resolved = local_target(root, page, href)
            if resolved:
                destination, fragment = resolved
                if not destination.is_file():
                    issue(report, target, "error", "broken-route", f"Yerel hedef bulunamadı: {href}", rel)
                elif fragment:
                    ids = all_ids.get(destination.resolve())
                    if ids is None:
                        try:
                            linked_parser = PageParser()
                            linked_parser.feed(destination.read_text(encoding="utf-8"))
                            ids = set(linked_parser.ids)
                        except (OSError, UnicodeError):
                            ids = set()
                    if fragment not in ids:
                        issue(report, target, "error", "broken-anchor", f"Sayfa içi hedef bulunamadı: {href}", rel)
            if external and urlparse(href).scheme in {"http", "https"}:
                if href not in cache:
                    if cache:
                        time.sleep(rate_limit)
                    request = Request(href, method="HEAD", headers={"User-Agent": "AsrinKemaliReleaseCheck/1.0"})
                    try:
                        with urlopen(request, timeout=timeout) as response:
                            cache[href] = (response.status, "")
                    except HTTPError as exc:
                        if exc.code in {405, 501}:
                            try:
                                with urlopen(Request(href, headers={"Range": "bytes=0-0", "User-Agent": "AsrinKemaliReleaseCheck/1.0"}), timeout=timeout) as response:
                                    cache[href] = (response.status, "")
                            except (HTTPError, URLError, TimeoutError) as second:
                                cache[href] = (getattr(second, "code", None), str(second))
                        else:
                            cache[href] = (exc.code, str(exc))
                    except (URLError, TimeoutError, OSError) as exc:
                        cache[href] = (None, str(exc))
                status, detail = cache[href]
                if status is None or status >= 400:
                    issue(report, target, "warning", "external-link-failed",
                          f"Dış bağlantı doğrulanamadı ({status or 'ağ hatası'}): {detail or href}", rel)


def check_css_resources(root: Path, target: str, report: dict) -> None:
    url_pattern = re.compile(r"""url\(\s*(['"]?)(.*?)\1\s*\)""", re.I)
    for stylesheet in files_under(root, {".css"}):
        text = stylesheet.read_text(encoding="utf-8", errors="replace")
        for match in url_pattern.finditer(text):
            value = html.unescape(match.group(2).strip())
            parsed = urlparse(value)
            if not value or parsed.scheme or parsed.netloc or value.startswith("#"):
                continue
            resolved = local_target(root, stylesheet, value)
            if resolved and not resolved[0].is_file():
                issue(report, target, "error", "broken-resource", f"CSS kaynağı bulunamadı: {value}",
                      str(stylesheet.relative_to(root)))


def check_next_sources(root: Path, report: dict) -> None:
    app_root = root / "app"
    pages_root = root / "pages"
    route_files: dict[str, Path] = {}
    for base in (app_root, pages_root):
        if not base.is_dir():
            continue
        for path in files_under(base, {".js", ".jsx", ".ts", ".tsx"}):
            relative = path.relative_to(base).with_suffix("")
            parts = list(relative.parts)
            if base == app_root:
                if parts[-1] != "page":
                    continue
                parts.pop()
                parts = [part for part in parts if not (part.startswith("(") and part.endswith(")"))]
            elif parts[-1] in {"_app", "_document", "_error"}:
                continue
            else:
                parts = [] if parts == ["index"] else (parts[:-1] if parts[-1] == "index" else parts)
            route = "/" + "/".join(parts)
            route_files[route.rstrip("/") or "/"] = path

    route_ids: dict[str, set[str]] = {}
    source_by_route: dict[str, str] = {}
    href_pattern = re.compile(r"""\bhref\s*=\s*(?:\{\s*)?(['"])(.*?)\1""")
    id_pattern = re.compile(r"""\bid\s*=\s*(?:\{\s*)?(['"])(.*?)\1""")
    for route, path in route_files.items():
        text = path.read_text(encoding="utf-8", errors="replace")
        route_ids[route] = {match.group(2) for match in id_pattern.finditer(text)}
        source_by_route[route] = text

    def matches_route(pattern: str, candidate: str) -> bool:
        parts = []
        for part in pattern.strip("/").split("/") if pattern.strip("/") else []:
            if part.startswith("[[...") and part.endswith("]]"):
                parts.append("(?:.+)?")
            elif part.startswith("[...") and part.endswith("]"):
                parts.append(".+")
            elif part.startswith("[") and part.endswith("]"):
                parts.append("[^/]+")
            else:
                parts.append(re.escape(part))
        return re.fullmatch("/" + "/".join(parts), candidate) is not None

    for route, path in route_files.items():
        text = source_by_route[route]
        for match in href_pattern.finditer(text):
            href = html.unescape(match.group(2).strip())
            parsed = urlparse(href)
            if parsed.scheme or parsed.netloc or href.startswith(("mailto:", "tel:", "javascript:")):
                continue
            if href.startswith("#"):
                if unquote(href[1:]) not in route_ids[route]:
                    issue(report, "next", "error", "broken-anchor", f"Next.js sayfasında hedef bulunamadı: {href}",
                          str(path.relative_to(root)))
                continue
            if parsed.path.startswith("/") or parsed.path:
                raw_destination = unquote(parsed.path)
                if not raw_destination.startswith("/"):
                    raw_destination = posixpath.normpath(posixpath.join(route, raw_destination))
                destination = raw_destination.rstrip("/") or "/"
                matching_routes = [known for known in route_files if matches_route(known, destination)]
                if not matching_routes:
                    issue(report, "next", "error", "broken-route", f"Next.js yerel rotası bulunamadı: {href}",
                          str(path.relative_to(root)))
                elif parsed.fragment:
                    target_route = matching_routes[0]
                    if target_route and unquote(parsed.fragment) not in route_ids[target_route]:
                        issue(report, "next", "error", "broken-anchor", f"Next.js hedef sayfasında anchor bulunamadı: {href}",
                              str(path.relative_to(root)))


def check_target(root: Path, target: str, report: dict, max_file_mb: float, external: bool,
                 timeout: float, rate_limit: float, cache: dict) -> None:
    root = root.resolve()
    if not root.is_dir():
        report["targets"][target] = f"SKIP (belirtilen dalda yok): {root}"
        return
    html_pages = files_under(root, HTML_EXTENSIONS)
    if target == "static" and not html_pages:
        report["targets"][target] = f"SKIP (belirtilen dalda yok): HTML sayfası yok ({root})"
        return
    if target == "next" and not any((root / folder).is_dir() for folder in ("app", "pages", "out")) and not html_pages:
        report["targets"][target] = f"SKIP (belirtilen dalda yok): Next.js app/pages/out bulunamadı ({root})"
        return
    report["targets"][target] = f"CHECKED: {root}"

    if not html_pages and target == "next":
        for candidate in (root / "app" / "layout.tsx", root / "app" / "layout.jsx", root / "pages" / "_document.tsx"):
            if candidate.is_file():
                text = candidate.read_text(encoding="utf-8", errors="replace")
                for key, pattern in (
                    ("title", r"\btitle\s*:\s*['\"`]"),
                    ("description", r"\bdescription\s*:\s*['\"`]"),
                    ("robots", r"\brobots\s*:"),
                    ("canonical", r"\bcanonical\s*:"),
                    ("og:title", r"\btitle\s*:"),
                    ("og:description", r"\bdescription\s*:"),
                    ("og:image", r"\bimages\s*:"),
                ):
                    if not re.search(pattern, text, re.I):
                        issue(report, target, "warning", "missing-seo-" + key.replace(":", "-"),
                              f"Next metadata içinde {key} bulunamadı.", str(candidate.relative_to(root)))
                break

    required_files = ("index.html", "styles.css", "app.js") if target == "static" else ()
    for name in required_files:
        if not (root / name).is_file():
            issue(report, target, "error", "missing-target-file", f"Statik hedef dosyası eksik: {name}", name)
    if target == "next" and not (root / "package.json").is_file():
        issue(report, target, "error", "missing-next-package", "Next.js hedefinde package.json bulunamadı.")

    check_html(root, target, report, external, timeout, rate_limit, cache)
    check_css_resources(root, target, report)
    if target == "next" and not html_pages:
        check_next_sources(root, report)
    check_json_data(root, target, report)

    if not any((root / name).is_file() for name in ("LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "COPYING")):
        package_json = root / "package.json"
        has_license = False
        if package_json.is_file():
            try:
                has_license = bool(json.loads(package_json.read_text(encoding="utf-8")).get("license"))
            except (OSError, json.JSONDecodeError, AttributeError):
                pass
        if not has_license:
            issue(report, target, "warning", "missing-license-metadata", "LICENSE dosyası veya package.json license metadata'sı yok.")

    content_extensions = {".html", ".htm", ".js", ".jsx", ".ts", ".tsx", ".json"}
    texts = []
    for path in files_under(root, content_extensions):
        try:
            texts.append(path.read_text(encoding="utf-8", errors="replace").lower())
        except OSError:
            continue
    if not any(disclosure in text for text in texts for disclosure in AI_DISCLOSURE):
        issue(report, target, "error", "missing-ai-disclosure", "Temsili/AI görselleri açıklayan metin bulunamadı.")

    for path in files_under(root):
        if path.stat().st_size > max_file_mb * 1024 * 1024:
            issue(report, target, "warning", "large-file",
                  f"Büyük dosya: {path.stat().st_size / 1024 / 1024:.2f} MiB (eşik {max_file_mb:.2f} MiB).",
                  str(path.relative_to(root)))


def check_repo(root: Path, report: dict, target_roots: dict[str, Path]) -> None:
    def git(*args: str) -> str:
        result = subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True, check=False)
        return result.stdout.strip() if result.returncode == 0 else ""

    branch = git("branch", "--show-current")
    report["git"] = {"branch": branch or None}
    if not branch:
        issue(report, "repository", "warning", "unknown-branch", "Git dalı belirlenemedi (detached HEAD veya Git yok).")
    status = git("status", "--short", "--untracked-files=all")
    changed_files = [line[3:].strip() for line in status.splitlines() if len(line) > 3]
    report["git"]["working_tree_files"] = changed_files
    report["git"]["working_tree_changes"] = len(changed_files)
    if not status:
        report["git"]["working_tree_changes"] = 0
    lockfiles = [p for p in ("package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml", "bun.lock", "bun.lockb") if (root / p).exists()]
    report["git"]["lockfiles"] = lockfiles
    package = root / "package.json"
    if package.exists():
        try:
            pkg = json.loads(package.read_text(encoding="utf-8"))
            managers = [name for name, lock in (("npm", {"package-lock.json", "npm-shrinkwrap.json"}),
                                                ("yarn", {"yarn.lock"}), ("pnpm", {"pnpm-lock.yaml"}),
                                                ("bun", {"bun.lock", "bun.lockb"})) if lock.intersection(lockfiles)]
            manager = (pkg.get("packageManager") or "").split("@")[0]
            if manager and managers and manager not in managers:
                issue(report, "repository", "error", "lockfile-manager-mismatch",
                      f"packageManager '{manager}' ile lockfile yöneticisi uyuşmuyor: {', '.join(managers)}.")
            if not managers and (pkg.get("dependencies") or pkg.get("devDependencies")):
                issue(report, "repository", "warning", "missing-lockfile", "package.json bağımlılık içeriyor ancak tanınan lockfile yok.")
            if len(managers) > 1:
                issue(report, "repository", "warning", "multiple-lockfiles", f"Birden fazla paket yöneticisi lockfile'ı var: {', '.join(managers)}.")
        except (OSError, json.JSONDecodeError) as exc:
            issue(report, "repository", "error", "invalid-package-json", f"package.json geçersiz: {exc}", "package.json")
    else:
        report["git"]["lockfile_check"] = "SKIP (package.json yok)"
        if lockfiles:
            issue(report, "repository", "warning", "orphan-lockfile", f"Lockfile var ancak package.json yok: {', '.join(lockfiles)}.")
    diff_base = git("merge-base", "HEAD", "origin/main")
    if diff_base:
        diff = git("diff", "--name-only", f"{diff_base}...HEAD")
        report["git"]["committed_files_vs_main"] = [p for p in diff.splitlines() if p]
    else:
        report["git"]["committed_files_vs_main"] = []
        issue(report, "repository", "warning", "branch-diff-unavailable", "origin/main ile branch diff belirlenemedi.")
    for name in ("README.md", "AGENTS.md", "design/ONAYLANAN-TASARIM.webp"):
        if not (root / name).is_file():
            issue(report, "repository", "error", "missing-critical-file", f"Kritik dosya eksik: {name}", name)


def render_markdown(report: dict) -> str:
    lines = ["# Release quality report", "", f"- **Hedef:** {report['target']}",
             f"- **Strict gate:** {report['fail_on']}", ""]
    lines.extend(["## Hedef durumu", "", "| Hedef | Sonuç |", "|---|---|"])
    for target, result in report["targets"].items():
        lines.append(f"| {target} | {result.replace('|', '\\|')} |")
    lines.extend(["", "## Git ve lockfile", ""])
    lines.append(f"- Dal: `{report.get('git', {}).get('branch') or 'bilinmiyor'}`")
    lines.append(f"- Çalışma ağacında değişiklik satırı: {report.get('git', {}).get('working_tree_changes', 'n/a')}")
    lines.append(f"- Lockfile: {', '.join(report.get('git', {}).get('lockfiles', [])) or 'yok'}")
    lines.extend(["", "## Bulgular", "", "| Şiddet | Hedef | Kod | Dosya | Açıklama |", "|---|---|---|---|---|"])
    findings = report["findings"]
    if not findings:
        lines.append("| — | — | — | — | Bulgu yok |")
    for item in findings:
        values = [item[key].replace("|", "\\|").replace("\n", " ") for key in ("severity", "target", "code", "path", "message")]
        lines.append("| " + " | ".join(values) + " |")
    lines.append("")
    lines.append("Dış bağlantı kontrolü etkinleştirilmedikçe ağ isteği yapılmaz. Bu rapor canlı site veya indekslenme iddiası içermez.")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Statik/Next.js sürüm kalite kontrolü; JSON ve Markdown rapor üretir.")
    parser.add_argument("--target", choices=("static", "next", "both"), default="both")
    parser.add_argument("--static-root", type=Path, default=Path("."))
    parser.add_argument("--next-root", type=Path, default=Path("next"))
    parser.add_argument("--output-dir", type=Path, default=Path("release-check-reports"))
    parser.add_argument("--external-links", action="store_true", help="İsteğe bağlı, rate-limited HEAD istekleri yap.")
    parser.add_argument("--timeout", type=float, default=5.0)
    parser.add_argument("--rate-limit", type=float, default=0.25, help="Dış istekler arası saniye.")
    parser.add_argument("--max-file-mb", type=float, default=5.0)
    parser.add_argument("--fail-on", choices=("none", "warning", "error"), default="none")
    args = parser.parse_args(argv)
    if args.timeout <= 0 or args.rate_limit < 0 or args.max_file_mb <= 0:
        parser.error("--timeout ve --max-file-mb pozitif, --rate-limit sıfır veya pozitif olmalı.")

    repo_root = Path.cwd().resolve()
    report = {"schema_version": 1, "target": args.target, "fail_on": args.fail_on,
              "targets": {}, "git": {}, "findings": []}
    check_repo(repo_root, report, {})
    roots = {"static": args.static_root, "next": args.next_root}
    cache: dict[str, tuple[int | None, str]] = {}
    selected = ("static", "next") if args.target == "both" else (args.target,)
    for name in selected:
        path = roots[name]
        if not path.is_absolute():
            path = repo_root / path
        check_target(path, name, report, args.max_file_mb, args.external_links, args.timeout, args.rate_limit, cache)

    report["summary"] = {severity: sum(item["severity"] == severity for item in report["findings"])
                         for severity in ("error", "warning")}
    report["external_links_checked"] = len(cache)
    try:
        args.output_dir.mkdir(parents=True, exist_ok=True)
        json_path = args.output_dir / "release-check.json"
        markdown_path = args.output_dir / "release-check.md"
        json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        markdown_path.write_text(render_markdown(report), encoding="utf-8")
    except OSError as exc:
        print(f"ERROR: Rapor yazılamadı: {exc}", file=sys.stderr)
        return 2
    for name, value in report["targets"].items():
        print(f"{name}: {value}")
    print(f"Rapor: {json_path} ve {markdown_path}")
    print(f"Bulgular: {report['summary']['error']} hata, {report['summary']['warning']} uyarı")
    threshold = {"none": 3, "warning": 2, "error": 1}[args.fail_on]
    if threshold < 3 and any({"error": 1, "warning": 2}[item["severity"]] <= threshold for item in report["findings"]):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
