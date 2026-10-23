"""Release-time checks for the V0.5 archive catalog and scheduled publications."""

from __future__ import annotations

from datetime import date, datetime, timezone
import json
from pathlib import Path
import re
from urllib.parse import urlparse


CATALOG_DIRS = (
    Path("content/archive/records"),
    Path("data/archive/catalog"),
)
SCHEDULE_DIR = Path("content/scheduled")
PUBLISHABLE_RIGHTS = {
    "public_domain",
    "open_license",
    "official_link_only",
    "institutional_terms",
}
RIGHTS_STATUSES = PUBLISHABLE_RIGHTS | {
    "unknown",
    "permission_required",
    "ai_representative",
}
DATE_PRECISIONS = {"day", "month", "year", "range", "unknown"}
VERIFICATION_STATUSES = {"draft", "reviewed", "published"}
SCHEDULE_STATUSES = {"draft", "scheduled", "published", "cancelled"}
NON_HUMAN_ACTOR = re.compile(r"\b(?:ai|yapay zek[aâ]|opencode|copilot|agent|bot|automation|automated)\b", re.I)


def _add(findings: list[dict], severity: str, code: str, message: str, path: str) -> None:
    findings.append({
        "target": "publication",
        "severity": severity,
        "code": code,
        "message": message,
        "path": path,
    })


def _is_human_name(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip()) and not NON_HUMAN_ACTOR.search(value)


def _parse_date(value: object) -> date | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        return None
    return parsed if parsed.isoformat() == value else None


def _parse_timestamp(value: object) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        return None
    return parsed.astimezone(timezone.utc)


def _https_url(value: object) -> bool:
    if not isinstance(value, str):
        return False
    parsed = urlparse(value)
    try:
        port = parsed.port
    except ValueError:
        return False
    return (
        parsed.scheme == "https"
        and bool(parsed.hostname)
        and port in {None, 443}
        and parsed.username is None
        and parsed.password is None
        and not any(character.isspace() for character in value)
    )


def _date_metadata_is_valid(record_date: object) -> bool:
    if not isinstance(record_date, dict):
        return False
    precision = record_date.get("precision")
    certainty = record_date.get("certainty")
    start_value = record_date.get("start")
    end_value = record_date.get("end")
    if precision not in DATE_PRECISIONS:
        return False
    if precision == "unknown":
        return start_value is None and end_value is None and certainty == "unknown"
    if certainty not in {"exact", "estimated"}:
        return False
    start = _parse_date(start_value)
    end = _parse_date(end_value) if end_value is not None else None
    if start is None or end_value is not None and end is None:
        return False
    if not 1800 <= start.year <= 2100 or end is not None and not 1800 <= end.year <= 2100:
        return False
    if end is not None and end < start:
        return False
    if precision == "range" and end is None:
        return False
    if precision == "day" and end is not None and end != start:
        return False
    if precision == "year" and (start.month != 1 or start.day != 1
                                or end is not None and end.year != start.year):
        return False
    if precision == "month" and (start.day != 1
                                 or end is not None and (end.year, end.month) != (start.year, start.month)):
        return False
    return True


def _approval_datetime(approval: object) -> datetime | None:
    if not isinstance(approval, dict):
        return None
    return _parse_timestamp(approval.get("approvedAt"))


def _approval_is_valid(approval: object, not_after: datetime | None = None) -> bool:
    if not isinstance(approval, dict):
        return False
    approved_at = _approval_datetime(approval)
    if approved_at is None or not _is_human_name(approval.get("approvedBy")):
        return False
    if approval.get("status") != "approved" or approval.get("authority") != "human":
        return False
    if approval.get("role") != "human_editor":
        return False
    return not_after is None or approved_at <= not_after


def _load_json_files(paths: list[Path], findings: list[dict], empty_code: str) -> list[tuple[Path, dict]]:
    loaded: list[tuple[Path, dict]] = []
    for path in paths:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            _add(findings, "critical", "invalid-publication-json", f"JSON okunamadı: {exc}", str(path))
            continue
        records = data if isinstance(data, list) else [data]
        if not records or any(not isinstance(record, dict) for record in records):
            _add(findings, "critical", "invalid-publication-shape",
                 "Dosya bir kayıt nesnesi veya nesne kayıtları dizisi olmalı.", str(path))
            continue
        for index, record in enumerate(records):
            location = f"{path}[{index}]" if isinstance(data, list) else str(path)
            loaded.append((Path(location), record))
    if not paths:
        _add(findings, "warning", empty_code, "Bu içerik kümesinde kayıt yok.", "")
    return loaded


def _validate_catalog(root: Path, now: datetime, findings: list[dict]) -> tuple[list[tuple[Path, dict]], dict]:
    paths: list[Path] = []
    for relative_dir in CATALOG_DIRS:
        directory = root / relative_dir
        if not directory.is_dir():
            _add(findings, "critical", "missing-catalog-directory",
                 f"Zorunlu arşiv kataloğu dizini bulunamadı: {relative_dir}.", str(relative_dir))
        else:
            paths.extend(sorted(directory.glob("*.json")))
    entries = _load_json_files(paths, findings, "empty-archive-catalog")
    ids: dict[str, str] = {}
    slugs: dict[str, str] = {}
    identities: dict[tuple[str, str, str], str] = {}
    status_counts = {status: 0 for status in VERIFICATION_STATUSES}
    expert_review_required = 0
    published_count = 0
    record_ids: dict[str, dict[str, str | bool]] = {}

    for path, record in entries:
        record_id = record.get("id")
        slug = record.get("slug")
        title = record.get("title")
        verification = record.get("verification")
        verification = verification if isinstance(verification, dict) else {}
        status = verification.get("status")
        published = status == "published"
        if published:
            published_count += 1
        if status in status_counts:
            status_counts[status] += 1
        else:
            code = "missing-publication-status" if status is None else "invalid-publication-status"
            _add(findings, "critical" if published else "error", code,
                 f"Geçersiz veya eksik verification.status: {status!r}.", str(path))
        if not isinstance(title, str) or len(title.strip()) < 3:
            _add(findings, "critical" if published else "error", "missing-catalog-title",
                 "Katalog kaydının başlığı eksik veya geçersiz.", str(path))
        if not isinstance(record.get("type"), str) or not record["type"].strip():
            _add(findings, "critical" if published else "error", "missing-catalog-type",
                 "Katalog kaydının türü eksik.", str(path))

        for value, label, seen in ((record_id, "id", ids), (slug, "slug", slugs)):
            if not isinstance(value, str) or not value.strip():
                _add(findings, "critical" if published else "error",
                     f"missing-catalog-{label}", f"Katalog kaydında {label} zorunlu.", str(path))
                continue
            if value in seen:
                _add(findings, "error", f"duplicate-catalog-{label}",
                     f"Tekrarlanan {label} {value!r}; ilk kayıt {seen[value]}.", str(path))
            else:
                seen[value] = str(path)
                if label == "id":
                    record_ids[value] = {"status": status if isinstance(status, str) else "",
                                         "human_reviewed": False}

        record_date = record.get("date")
        if not _date_metadata_is_valid(record_date):
            _add(findings, "critical" if published else "error", "invalid-catalog-date",
                 "Tarih geçersiz veya date precision ile tutarsız.", str(path))
        elif record.get("type") == "event" and published and (
            record_date.get("precision") != "day" or record_date.get("certainty") != "exact"
        ):
            _add(findings, "critical", "imprecise-published-event",
                 "Yayımlanmış olay kesin gün ve exact kesinlik gerektirir.", str(path))

        source = record.get("source")
        source = source if isinstance(source, dict) else {}
        source_url = source.get("url")
        if not isinstance(source.get("institution"), str) or not source["institution"].strip():
            _add(findings, "critical" if published else "warning", "missing-source-institution",
                 "Kaynak kurum bilgisi eksik.", str(path))
        if not _https_url(source_url):
            _add(findings, "critical" if published else "error", "invalid-catalog-source-url",
                 "Özgün kaynak URL'si geçersiz; https ve kimlik bilgisi içermeyen bağlantı gerekir.", str(path))
        elif published and urlparse(source_url).path in {"", "/"}:
            _add(findings, "critical", "generic-published-source",
                 "Yayımlanmış kayıtta kurum ana sayfası değil, özgün kayıt sayfası gerekir.", str(path))
        if not _parse_date(source.get("accessedAt")):
            _add(findings, "critical" if published else "warning", "invalid-source-access-date",
                 "Kaynağın erişim tarihi YYYY-MM-DD olmalı.", str(path))

        provenance = record.get("provenance")
        provenance = provenance if isinstance(provenance, list) else []
        if not provenance:
            _add(findings, "critical" if published else "warning", "missing-catalog-provenance",
                 "Kaynak provenans/koleksiyon açıklaması eksik.", str(path))
        provenance_urls = {
            item.get("url") for item in provenance if isinstance(item, dict) and isinstance(item.get("url"), str)
        }
        if published and source_url not in provenance_urls:
            _add(findings, "critical", "source-not-in-provenance",
                 "Yayımlanmış kaynağın özgün URL'si provenans kayıtlarında bulunmalı.", str(path))

        rights = record.get("rights")
        rights = rights if isinstance(rights, dict) else {}
        rights_status = rights.get("status")
        if rights_status not in RIGHTS_STATUSES:
            _add(findings, "critical" if published else "warning", "missing-rights-status",
                 "Telif ve kullanım hakları durumu eksik veya geçersiz.", str(path))
        if published and rights_status not in PUBLISHABLE_RIGHTS:
            _add(findings, "critical", "unpublishable-rights-status",
                 f"{rights_status!r} hak durumuyla içerik yayımlanamaz.", str(path))
        if rights_status == "open_license" and (
            not isinstance(rights.get("license"), str) or not rights["license"].strip()
            or not _https_url(rights.get("licenseUrl"))
        ):
            _add(findings, "critical" if published else "error", "incomplete-open-license",
                 "Açık lisans için lisans adı ve geçerli lisans URL'si zorunlu.", str(path))

        review_by = verification.get("reviewedBy")
        review_date = _parse_date(verification.get("reviewedAt"))
        human_reviewed = _is_human_name(review_by) and review_date is not None and review_date <= now.date()
        if isinstance(record_id, str) and record_id in record_ids and ids.get(record_id) == str(path):
            record_ids[record_id]["human_reviewed"] = human_reviewed
        if not human_reviewed:
            expert_review_required += 1
            _add(findings, "expert_review", "human-expert-review-required",
                 "İnsan uzmanının kimliği ve geçmişteki inceleme tarihi doğrulanmadı; AI/ajan incelemesi yeterli değil.",
                 str(path))

        approval = record.get("publicationApproval")
        approval_ok = _approval_is_valid(approval, now)
        if published and not approval_ok:
            _add(findings, "critical", "unauthorized-published-record",
                 "published durumu için açık, geçmiş tarihli insan editör onayı bulunmuyor.", str(path))
        if published and not human_reviewed:
            _add(findings, "critical", "published-without-human-review",
                 "Kayıt insan uzman incelemesi tamamlanmadan published işaretlenmiş.", str(path))

        checks = verification.get("checks")
        checks = checks if isinstance(checks, dict) else {}
        required_checks = ["sourceReachable", "dateVerified", "rightsVerified", "duplicateChecked"]
        if isinstance(record.get("quotation"), dict):
            required_checks.append("quoteVerified")
        if published:
            missing_checks = [name for name in required_checks if checks.get(name) is not True]
            if missing_checks:
                _add(findings, "critical", "incomplete-publication-checks",
                     f"Yayın doğrulama kontrolleri tamamlanmamış: {', '.join(missing_checks)}.", str(path))

        image = record.get("image")
        if isinstance(image, dict) and image.get("kind") == "ai_representative" and published:
            _add(findings, "critical", "published-ai-representation",
                 "AI/temsili canlandırma tarihî arşiv kaydı olarak yayımlanamaz.", str(path))

        if isinstance(title, str) and title.strip() and isinstance(record_date, dict):
            identity = (
                re.sub(r"\s+", " ", title).strip().casefold(),
                str(record_date.get("start") or ""),
                str(source_url or "").casefold(),
            )
            if all(identity):
                if identity in identities:
                    _add(findings, "error", "duplicate-catalog-record",
                         f"Başlık/tarih/kaynak birleşimi {identities[identity]} kaydıyla yineleniyor.", str(path))
                else:
                    identities[identity] = str(path)

    return entries, {
        "file_count": len(paths),
        "record_count": len(entries),
        "published_count": published_count,
        "status_counts": status_counts,
        "human_expert_review_required_count": expert_review_required,
        "record_statuses": record_ids,
    }


def _validate_schedules(root: Path, now: datetime, record_statuses: dict[str, dict[str, str | bool]],
                        findings: list[dict]) -> dict:
    schedule_root = root / SCHEDULE_DIR
    if not schedule_root.is_dir():
        _add(findings, "warning", "scheduled-content-not-configured",
             "Henüz content/scheduled/ dizininde zamanlanmış içerik yok; yeni yayın motoru entegrasyonu bekleniyor.",
             str(SCHEDULE_DIR))
        return {"status": "not-configured", "file_count": 0, "entry_count": 0}

    paths = sorted(schedule_root.glob("*.json"))
    if not paths:
        _add(findings, "warning", "scheduled-content-not-configured",
             "Henüz zamanlanmış içerik kaydı yok; yayın zamanı kontrolü şema ve testlerle hazır.",
             str(SCHEDULE_DIR))
        return {"status": "empty", "file_count": 0, "entry_count": 0}

    entries = _load_json_files(paths, findings, "scheduled-content-empty")
    ids: dict[str, str] = {}
    active_record_schedules: dict[str, str] = {}
    valid_count = 0
    for path, entry in entries:
        schedule_id = entry.get("id")
        record_id = entry.get("recordId")
        status = entry.get("status")
        if not isinstance(schedule_id, str) or not schedule_id.strip():
            _add(findings, "error", "missing-schedule-id", "Zamanlama kaydında id zorunlu.", str(path))
        elif schedule_id in ids:
            _add(findings, "error", "duplicate-schedule-id",
                 f"Zamanlama id'si {schedule_id!r} tekrar ediyor.", str(path))
        else:
            ids[schedule_id] = str(path)
        catalog_record = record_statuses.get(record_id) if isinstance(record_id, str) else None
        if catalog_record is None:
            _add(findings, "critical", "schedule-record-not-found",
                 f"Zamanlanan içerik kaydı katalogda bulunamadı: {record_id!r}.", str(path))
        if status not in SCHEDULE_STATUSES:
            _add(findings, "error", "invalid-schedule-status",
                 f"Geçersiz zamanlama durumu: {status!r}.", str(path))
            continue

        active = status in {"scheduled", "published"}
        if status == "scheduled" and catalog_record is not None and (
            catalog_record["status"] not in {"reviewed", "published"}
            or not catalog_record["human_reviewed"]
        ):
            _add(findings, "critical", "schedule-target-not-reviewed",
                 "Yayın planı yalnızca insan uzmanının incelediği bir arşiv kaydına bağlanabilir.", str(path))
        if active and isinstance(record_id, str):
            if record_id in active_record_schedules:
                _add(findings, "error", "duplicate-active-schedule",
                     f"{record_id!r} için birden fazla aktif yayın planı var.", str(path))
            else:
                active_record_schedules[record_id] = str(path)

        scheduled_at = _parse_timestamp(entry.get("scheduledAt"))
        if active and scheduled_at is None:
            _add(findings, "critical", "invalid-scheduled-at",
                 "Aktif zamanlama için saat dilimi içeren ISO-8601 scheduledAt zorunlu.", str(path))
            continue
        approval = entry.get("approval")
        approval_ok = _approval_is_valid(approval, now)
        if active and not approval_ok:
            _add(findings, "critical", "unauthorized-scheduled-publication",
                 "Zamanlanmış/yayımlanmış içerikte insan editör onayı geçersiz veya eksik.", str(path))
        if status == "scheduled" and scheduled_at is not None and scheduled_at <= now:
            _add(findings, "critical", "overdue-scheduled-content",
                 "scheduled durumu geçmiş veya şu anki yayın zamanıyla tutulamaz.", str(path))
        if status == "published" and scheduled_at is not None and scheduled_at > now:
            _add(findings, "critical", "published-before-schedule",
                 "Gelecekteki scheduledAt değerine sahip içerik published olamaz.", str(path))
        if scheduled_at is not None:
            approved_at = _approval_datetime(approval)
            if approved_at is not None and approved_at > scheduled_at:
                _add(findings, "critical", "approval-after-schedule",
                     "İnsan onayı yayın zamanından sonra verilemez.", str(path))
        if status == "published" and catalog_record is not None and catalog_record["status"] != "published":
            _add(findings, "critical", "schedule-publishes-unapproved-record",
                 "Yayın motoru katalogda published olmayan bir kaydı yayımlayamaz.", str(path))
        if not any(item["path"] == str(path) and item["severity"] in {"critical", "error"}
                   for item in findings):
            valid_count += 1
    return {"status": "configured", "file_count": len(paths), "entry_count": len(entries),
            "valid_entry_count": valid_count}


def validate_repository(root: Path, now: datetime | None = None) -> dict:
    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None or current_time.utcoffset() is None:
        raise ValueError("now must be timezone-aware")
    current_time = current_time.astimezone(timezone.utc)
    findings: list[dict] = []
    _, catalog = _validate_catalog(root, current_time, findings)
    schedules = _validate_schedules(root, current_time, catalog["record_statuses"], findings)
    catalog.pop("record_statuses")
    return {
        "catalog": catalog,
        "scheduled_content": schedules,
        "findings": findings,
        "verification_limitations": [
            "Source URL syntax and reachability do not establish historical authenticity, attribution, context, or copyright.",
            "A human name and approval fields are auditable claims, not cryptographic identity proof; the release owner must verify approver authority.",
            "The V0.5 repository has no scheduled-content data model or records; schedule rules are validated against the documented content/scheduled contract.",
        ],
    }
