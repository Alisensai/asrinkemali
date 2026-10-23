"""Asrın Kemali minimal zero-dependency smoke checks."""
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.refs = []
        self.images = []
        self.has_lang = False
        self.has_title = False
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "html" and d.get("lang") == "tr":
            self.has_lang = True
        if tag == "title":
            self._in_title = True
        if "id" in d:
            self.ids.append(d["id"])
        if tag == "a" and d.get("href", "").startswith("#"):
            self.refs.append(d["href"][1:])
        if tag == "img":
            self.images.append((d.get("src", ""), d.get("alt")))

    def handle_data(self, data):
        if self._in_title and data.strip():
            self.has_title = True

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

p = PageParser()
p.feed((ROOT / "index.html").read_text(encoding="utf-8"))
errors = []
if not p.has_lang: errors.append("html lang=tr eksik")
if not p.has_title: errors.append("title eksik")
if len(p.ids) != len(set(p.ids)): errors.append("Tekrarlanan HTML id var")
for anchor in p.refs:
    if anchor and anchor not in p.ids: errors.append(f"Kırık hedef: #{anchor}")
for src, alt in p.images:
    if not src or not (ROOT / src).is_file(): errors.append(f"Eksik görsel: {src}")
    if alt is None: errors.append(f"Alt metin tanımsız: {src}")
if not (ROOT / "design/ONAYLANAN-TASARIM.webp").exists(): errors.append("Onaylı tasarım eksik")
if "AI" not in (ROOT / "README.md").read_text(encoding="utf-8") and "yapay zekâ" not in (ROOT / "README.md").read_text(encoding="utf-8").lower(): errors.append("Temsili görsel açıklaması eksik")
if errors:
    for error in errors: print("HATA:", error)
    raise SystemExit(1)
print(f"OK — {len(p.ids)} benzersiz id; {len(p.refs)} sayfa içi bağlantı; {len(p.images)} HTML görseli. Her şey mevcut.")
