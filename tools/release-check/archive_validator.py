"""Validate archive records without treating a URL as proof of historical accuracy."""

from __future__ import annotations

import ast
from datetime import date
import json
from pathlib import Path
import re
from urllib.parse import urlparse


class ArchiveParseError(ValueError):
    pass


def _tokens(source: str) -> list[str]:
    tokens = []
    index = 0
    while index < len(source):
        if source[index].isspace():
            index += 1
        elif source.startswith("//", index):
            end = source.find("\n", index)
            index = len(source) if end < 0 else end + 1
        elif source.startswith("/*", index):
            end = source.find("*/", index + 2)
            if end < 0:
                raise ArchiveParseError("Kapatılmamış TypeScript yorumu.")
            index = end + 2
        elif source[index] in "'\"`":
            quote = source[index]
            end = index + 1
            while end < len(source):
                if source[end] == "\\":
                    end += 2
                elif source[end] == quote:
                    break
                else:
                    end += 1
            if end >= len(source):
                raise ArchiveParseError("Kapatılmamış metin değeri.")
            raw = source[index:end + 1]
            if quote == "`":
                value = raw[1:-1]
                if "${" in value:
                    raise ArchiveParseError("Arşiv verisinde dinamik template string desteklenmiyor.")
            else:
                value = ast.literal_eval(raw)
            tokens.append(json.dumps(value, ensure_ascii=False))
            index = end + 1
        elif source[index] in "{}[]:,":
            tokens.append(source[index])
            index += 1
        else:
            match = re.match(r"[A-Za-z_$][\w$-]*|-?\d+(?:\.\d+)?", source[index:])
            if not match:
                raise ArchiveParseError(f"Desteklenmeyen TypeScript değeri: {source[index:index + 20]!r}")
            tokens.append(match.group(0))
            index += len(match.group(0))
    return tokens


def _parse_value(tokens: list[str], index: int = 0) -> tuple[object, int]:
    if index >= len(tokens):
        raise ArchiveParseError("Değer bekleniyordu.")
    token = tokens[index]
    if token == "{":
        value: dict[str, object] = {}
        index += 1
        while index < len(tokens) and tokens[index] != "}":
            key = tokens[index]
            if key.startswith('"'):
                key = json.loads(key)
            index += 1
            if index >= len(tokens) or tokens[index] != ":":
                raise ArchiveParseError(f"'{key}' alanından sonra ':' bekleniyordu.")
            item, index = _parse_value(tokens, index + 1)
            value[str(key)] = item
            if index < len(tokens) and tokens[index] == ",":
                index += 1
            elif index < len(tokens) and tokens[index] != "}":
                raise ArchiveParseError("Nesne alanlarından sonra ',' bekleniyordu.")
        if index >= len(tokens):
            raise ArchiveParseError("Kapatılmamış nesne.")
        return value, index + 1
    if token == "[":
        values = []
        index += 1
        while index < len(tokens) and tokens[index] != "]":
            item, index = _parse_value(tokens, index)
            values.append(item)
            if index < len(tokens) and tokens[index] == ",":
                index += 1
            elif index < len(tokens) and tokens[index] != "]":
                raise ArchiveParseError("Dizi elemanlarından sonra ',' bekleniyordu.")
        if index >= len(tokens):
            raise ArchiveParseError("Kapatılmamış dizi.")
        return values, index + 1
    if token.startswith('"'):
        return json.loads(token), index + 1
    if token == "true":
        return True, index + 1
    if token == "false":
        return False, index + 1
    if token == "null":
        return None, index + 1
    if token == "undefined":
        return None, index + 1
    if re.fullmatch(r"-?\d+(?:\.\d+)?", token):
        return float(token) if "." in token else int(token), index + 1
    raise ArchiveParseError(f"Desteklenmeyen değer: {token}")


def extract_typescript_array(source: str, export_name: str) -> list:
    declaration = re.search(rf"\bexport\s+const\s+{re.escape(export_name)}\b[^=]*=\s*", source)
    if not declaration:
        raise ArchiveParseError(f"export const {export_name} bulunamadı.")
    start = source.find("[", declaration.end())
    if start < 0:
        raise ArchiveParseError(f"{export_name} dizisi bulunamadı.")
    depth = 0
    quote = None
    index = start
    while index < len(source):
        char = source[index]
        if quote:
            if char == "\\":
                index += 2
                continue
            if char == quote:
                quote = None
        elif source.startswith("//", index):
            newline = source.find("\n", index)
            index = len(source) if newline < 0 else newline + 1
            continue
        elif source.startswith("/*", index):
            end = source.find("*/", index + 2)
            if end < 0:
                raise ArchiveParseError("Kapatılmamış TypeScript yorumu.")
            index = end + 2
            continue
        elif char in "'\"`":
            quote = char
        elif char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                break
        index += 1
    if depth:
        raise ArchiveParseError(f"Kapatılmamış {export_name} dizisi.")
    tokens = _tokens(source[start:index + 1])
    value, _ = _parse_value(tokens)
    if not isinstance(value, list):
        raise ArchiveParseError(f"{export_name}, bir dizi olmalıdır.")
    return value


def extract_typescript_records(source: str) -> list[dict]:
    value = extract_typescript_array(source, "archiveRecords")
    if any(not isinstance(item, dict) for item in value):
        raise ArchiveParseError("archiveRecords, nesnelerden oluşan bir dizi olmalıdır.")
    return value


def load_records(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        data = json.loads(text)
        if isinstance(data, dict):
            data = data.get("archiveRecords", data.get("records"))
        if not isinstance(data, list) or any(not isinstance(item, dict) for item in data):
            raise ArchiveParseError("Arşiv JSON'u nesne kayıtlarından oluşan bir dizi olmalıdır.")
        return data
    return extract_typescript_records(text)


def _pick(record: dict, *keys: str) -> object:
    for key in keys:
        if key in record and record[key] not in (None, ""):
            return record[key]
    return None


def _is_http_url(value: object) -> bool:
    if not isinstance(value, str):
        return False
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _valid_date(value: object, precision: object) -> bool:
    if not isinstance(value, str) or not isinstance(precision, str):
        return False
    formats = {
        "year": r"\d{4}",
        "month": r"\d{4}-\d{2}",
        "day": r"\d{4}-\d{2}-\d{2}",
        "range": r"\d{4}(?:-\d{2}(?:-\d{2})?)?/\d{4}(?:-\d{2}(?:-\d{2})?)?",
    }
    aliases = {"yıl": "year", "ay": "month", "gün": "day", "gun": "day", "aralık": "range", "aralik": "range"}
    normalized = aliases.get(precision.lower(), precision.lower())
    pattern = formats.get(normalized)
    if not pattern or not re.fullmatch(pattern, value):
        return False

    def valid_part(part: str) -> bool:
        try:
            if len(part) == 4:
                date(int(part), 1, 1)
            elif len(part) == 7:
                date.fromisoformat(part + "-01")
            else:
                date.fromisoformat(part)
            return True
        except ValueError:
            return False

    parts = value.split("/")
    return all(valid_part(part) for part in parts) and (
        len(parts) < 2 or parts[0] <= parts[1]
    )


def validate_records(records: list[dict], target: str = "next") -> dict:
    findings: list[dict[str, str]] = []
    ids: dict[str, int] = {}
    slugs: dict[str, int] = {}
    identities: dict[tuple[str, str, str], int] = {}
    published = 0
    expert_review_required = 0

    def add(severity: str, code: str, message: str, path: str) -> None:
        findings.append({"target": target, "severity": severity, "code": code, "message": message, "path": path})

    if not records:
        add("warning", "missing-archive-content", "Arşiv kaydı yok; tarihî içerik yayına hazır değil.", "archiveRecords")

    for index, record in enumerate(records):
        path = f"archiveRecords[{index}]"
        record_id = record.get("id")
        slug = record.get("slug")
        status = str(record.get("verificationStatus") or "").lower()
        publish_status = str(record.get("status") or "").lower()
        is_published = record.get("isPublished") is True or publish_status in {"published", "yayında", "yayinlandi"}
        is_verified = status in {"doğrulandı", "dogrulandi", "verified"}
        publishable = is_published or is_verified
        if publishable:
            published += 1

        for value, label, seen in ((record_id, "id", ids), (slug, "slug", slugs)):
            if not isinstance(value, str) or not value.strip():
                add("critical" if publishable else "warning", f"missing-{label}", f"Kayıt {label} alanı boş.", path)
            elif value in seen:
                add("error", f"duplicate-{label}", f"Tekrarlanan {label}: {value} (ilk kayıt {seen[value]}).", path)
            else:
                seen[value] = index

        date_value = record.get("date")
        precision = _pick(record, "datePrecision", "dateAccuracy", "dateSpecificity")
        if not _valid_date(date_value, precision):
            add("critical" if publishable else "warning", "invalid-date",
                "Tarih ISO YYYY, YYYY-MM veya YYYY-MM-DD biçimi ve datePrecision ile uyumlu değil.", path)

        institution = _pick(record, "sourceInstitution", "institution", "sourceOrganization")
        source_url = _pick(record, "sourceUrl", "originalUrl", "sourceLink")
        source_description = _pick(record, "sourceDescription", "sourceNote", "source", "citation")
        for value, code, label in (
            (institution, "missing-source-institution", "Kaynak kurum"),
            (source_description, "missing-source-description", "Kaynak açıklaması"),
        ):
            if not isinstance(value, str) or not value.strip():
                add("critical" if publishable else "warning", code, f"{label} eksik.", path)
        if not _is_http_url(source_url):
            add("critical" if publishable else "warning", "invalid-source-url",
                "Kaynağın orijinal http(s) bağlantısı eksik veya geçersiz.", path)
        elif urlparse(str(source_url)).scheme == "http":
            add("warning", "insecure-source-url", "Kaynak bağlantısı HTTPS kullanmıyor; adresin ve kaynağın uzman tarafından kontrolü gerekir.", path)

        copyright_status = _pick(record, "copyrightStatus", "rightsStatus", "license")
        usage_status = _pick(record, "useStatus", "usageStatus", "usageRights")
        if not isinstance(copyright_status, str) or not copyright_status.strip():
            add("critical" if publishable else "warning", "missing-copyright-status", "Telif/hak durumu belirtilmemiş.", path)
        if not isinstance(usage_status, str) or not usage_status.strip():
            add("critical" if publishable else "warning", "missing-use-status", "Kullanım izni/durumu belirtilmemiş.", path)

        review_status = str(_pick(record, "expertReviewStatus", "reviewStatus") or "").lower()
        reviewed_by = _pick(record, "reviewedBy", "expertReviewer")
        reviewed_at = _pick(record, "reviewedAt")
        expert_reviewed = record.get("expertReviewed") is True or review_status in {"completed", "tamamlandı", "tamamlandi"}
        if not expert_reviewed:
            expert_review_required += 1
            add("critical" if publishable else "expert_review", "expert-review-required",
                "Tarihsel doğruluk URL varlığıyla doğrulanamaz; uzman incelemesi gerekli.", path)
        elif not isinstance(reviewed_by, str) or not reviewed_by.strip() or not isinstance(reviewed_at, str) or not reviewed_at.strip():
            add("critical" if publishable else "warning", "incomplete-expert-review",
                "Tamamlandı işaretli uzman incelemesinde inceleyen kişi ve tarih bulunmalı.", path)

        if publishable and not is_verified:
            add("critical", "unverified-published-record", "Doğrulanmamış kayıt yayına açık olarak işaretlenmiş.", path)
        if status not in {"taslak", "doğrulandı", "dogrulandi", "inceleme-gerekli", "verified", ""}:
            add("warning", "unknown-verification-status", f"Bilinmeyen verificationStatus: {status}.", path)

        identity = (str(record.get("title", "")).strip().casefold(),
                    str(date_value or "").strip(), str(institution or "").strip().casefold())
        if all(identity):
            if identity in identities:
                add("error", "duplicate-record", f"Aynı başlık/tarih/kurum birleşimi kayıt {identities[identity]} ile yineleniyor.", path)
            else:
                identities[identity] = index

        quote = _pick(record, "quote", "quotation", "alıntı", "alinti")
        if isinstance(quote, str) and quote.strip():
            quote_source_fields = (
                _pick(record, "quoteSourceInstitution", "quotationSourceInstitution"),
                _pick(record, "quoteSourceUrl", "quotationSourceUrl"),
                _pick(record, "quoteSourceDescription", "quotationSourceDescription"),
            )
            if not all(isinstance(value, str) and value.strip() for value in quote_source_fields) or not _is_http_url(quote_source_fields[1]):
                add("critical" if publishable else "warning", "unsourced-attributed-quote",
                    "Alıntı için özgün kurum, bağlantı ve kaynak açıklaması gereklidir.", path)

        image = record.get("image")
        if isinstance(image, dict):
            image_src = str(image.get("src") or "").lower()
            image_alt = str(image.get("alt") or "").lower()
            illustrative = image.get("isIllustrative") is True or any(token in image_src + " " + image_alt for token in ("temsili", "temsilî", "ai-generated", "ai generated"))
            record_type = str(record.get("type") or "").lower()
            if illustrative and record_type in {"fotoğraf", "fotograf", "photograph", "historical-photo"}:
                add("critical" if publishable else "error", "ai-image-misclassified",
                    "Yapay zekâ/temsili canlandırma tarihî fotoğraf olarak sınıflandırılamaz.", path)
            if not str(image.get("alt") or "").strip():
                add("critical" if publishable else "warning", "missing-image-alt", "Arşiv görselinin alt metni eksik.", path)

        if not str(record.get("description") or "").strip() or not str(record.get("title") or "").strip():
            add("critical" if publishable else "warning", "missing-record-content", "Başlık veya açıklama eksik.", path)

    return {
        "record_count": len(records),
        "publishable_record_count": published,
        "expert_review_required_count": expert_review_required,
        "verification_limitations": [
            "A source URL's presence or HTTP response cannot prove historical authenticity, attribution, context, or rights.",
            "Human expert review must inspect the original source and provenance before publication.",
        ],
        "findings": findings,
    }


def validate_file(path: Path, target: str = "next") -> dict:
    try:
        records = load_records(path)
    except (OSError, UnicodeError, json.JSONDecodeError, ArchiveParseError) as exc:
        return {
            "record_count": 0, "publishable_record_count": 0, "expert_review_required_count": 0,
            "verification_limitations": [
                "A source URL's presence or HTTP response cannot prove historical authenticity, attribution, context, or rights.",
                "Human expert review must inspect the original source and provenance before publication.",
            ],
            "findings": [{"target": target, "severity": "critical", "code": "invalid-archive-data",
                          "message": f"Arşiv verisi okunamadı: {exc}", "path": str(path)}],
        }
    result = validate_records(records, target)
    for finding in result["findings"]:
        finding["path"] = f"{path}:{finding['path']}"
    return result


def validate_site_collections(path: Path, target: str = "next") -> dict:
    required_collections = {
        "publications": "yayın",
        "chronology": "kronoloji",
        "searchItems": "arama",
        "primaryNavigation": "navigasyon",
        "archiveCollections": "arşiv koleksiyonu",
    }
    findings = []
    counts = {}

    def add(severity: str, code: str, message: str, location: str) -> None:
        findings.append({"target": target, "severity": severity, "code": code,
                         "message": message, "path": f"{path}:{location}"})

    try:
        source = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        add("critical", "invalid-site-data", f"Site içerik kaynağı okunamadı: {exc}", "")
        return {"collection_counts": counts, "findings": findings}

    collections = {}
    for name, label in required_collections.items():
        try:
            value = extract_typescript_array(source, name)
        except ArchiveParseError as exc:
            add("critical", "invalid-site-data", str(exc), name)
            continue
        if any(not isinstance(item, dict) for item in value):
            add("critical", "invalid-site-data", f"{name} nesne kayıtlarından oluşmalı.", name)
            continue
        collections[name] = value
        counts[name] = len(value)

    for name, records in collections.items():
        seen_ids: set[str] = set()
        seen_keys: set[tuple[str, str]] = set()
        seen_hrefs: set[str] = set()
        for index, record in enumerate(records):
            location = f"{name}[{index}]"
            identity = record.get("id")
            if identity is not None:
                if not isinstance(identity, str) or not identity.strip():
                    add("error", "empty-content-id", f"{name} id boş.", location)
                elif identity in seen_ids:
                    add("error", "duplicate-content-id", f"{name} id tekrar ediyor: {identity}.", location)
                seen_ids.add(str(identity))

            if name == "publications":
                for field in ("id", "title", "publishedAt", "href", "source"):
                    if not isinstance(record.get(field), str) or not record[field].strip():
                        add("error", "incomplete-publication", f"Yayın kaydında {field} eksik.", location)
                published_at = record.get("publishedAt")
                if isinstance(published_at, str) and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", published_at):
                    add("error", "invalid-publication-date", "Yayın tarihi YYYY-MM-DD olmalı.", location)
                key = (str(record.get("title", "")).casefold(), str(published_at or ""))
                if all(key) and key in seen_keys:
                    add("error", "duplicate-publication", "Başlık ve yayın tarihi yineleniyor.", location)
                seen_keys.add(key)
            elif name == "chronology":
                year = record.get("year")
                description = record.get("description")
                if not isinstance(year, str) or not re.fullmatch(r"\d{4}", year):
                    add("error", "invalid-chronology-year", "Kronoloji yılı YYYY biçiminde olmalı.", location)
                if not isinstance(description, str) or not description.strip():
                    add("error", "incomplete-chronology", "Kronoloji açıklaması boş.", location)
                if not isinstance(record.get("source"), str) or not record["source"].strip():
                    add("error", "unsourced-chronology", "Kronoloji olayında kaynak açıklaması yok.", location)
                key = (str(year or ""), str(description or "").strip().casefold())
                if all(key) and key in seen_keys:
                    add("error", "duplicate-chronology-entry", "Aynı yıl ve açıklama yineleniyor.", location)
                seen_keys.add(key)

            required_fields = {
                "searchItems": ("title", "kind", "href", "keywords"),
                "primaryNavigation": ("label", "href"),
                "archiveCollections": ("type", "title", "description", "status", "href", "image"),
            }.get(name, ())
            for field in required_fields:
                if record.get(field) in (None, ""):
                    add("error", "incomplete-content-record", f"{name} kaydında {field} eksik.", location)

            if name in {"searchItems", "primaryNavigation", "archiveCollections"}:
                for field in ("title", "label"):
                    if field in record and not str(record[field]).strip():
                        add("error", "empty-content-label", f"{name} {field} boş.", location)
                href = record.get("href")
                if href is not None and (not isinstance(href, str) or not href.strip()):
                    add("error", "empty-content-href", f"{name} href boş.", location)
                elif isinstance(href, str):
                    if href in seen_hrefs:
                        add("error", "duplicate-content-href", f"{name} href tekrar ediyor: {href}.", location)
                    seen_hrefs.add(href)

    def walk(value: object, location: str) -> None:
        if isinstance(value, dict):
            quote = _pick(value, "quote", "quotation", "alıntı", "alinti")
            if isinstance(quote, str) and quote.strip():
                institution = _pick(value, "quoteSourceInstitution", "quotationSourceInstitution")
                source_url = _pick(value, "quoteSourceUrl", "quotationSourceUrl")
                description = _pick(value, "quoteSourceDescription", "quotationSourceDescription")
                if not isinstance(institution, str) or not institution.strip() or not _is_http_url(source_url) or not isinstance(description, str) or not description.strip():
                    add("critical", "unsourced-attributed-quote",
                        "Site içerik verisindeki alıntı kurum, özgün URL ve kaynak açıklaması olmadan yayımlanamaz.", location)
            src = value.get("src")
            if isinstance(src, str) and src.startswith("/assets/"):
                alt = value.get("alt")
                if not isinstance(alt, str) or not alt.strip():
                    add("error", "missing-image-alt", "Site içerik görselinde alt metin eksik.", location)
                if value.get("isIllustrative") is True and isinstance(alt, str) and not re.search(
                    r"temsil|ai.generated|yapay zek", alt, re.I
                ):
                    add("warning", "missing-illustration-disclosure",
                        "Temsili görselin alt metni AI/temsili niteliğini açıklamıyor.", location)
            for key, item in value.items():
                walk(item, f"{location}.{key}")
        elif isinstance(value, list):
            for index, item in enumerate(value):
                walk(item, f"{location}[{index}]")

    walk(collections, "site-data")
    for name in ("publications", "chronology"):
        if name in collections and not collections[name]:
            add("warning", "missing-published-content", f"Henüz {required_collections[name]} kaydı yok; içerik yayına hazır değil.", name)
    return {"collection_counts": counts, "findings": findings}
