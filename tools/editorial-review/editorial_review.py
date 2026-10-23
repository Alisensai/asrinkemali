#!/usr/bin/env python3
"""Read-only inventory and human review workflow tools for the archive."""

from __future__ import annotations

import argparse
import csv
from datetime import date, datetime, timezone
import hashlib
import json
import re
from pathlib import Path
import sys
from urllib.parse import urlsplit

from source_links import check_links, normalize_https_url
from audit_ledger import verify_ledger


ARCHIVE_DIRS = (Path("content/archive/records"), Path("data/archive/catalog"))
FORM_SCHEMA_VERSION = "1.0.0"
AI_ACTOR = re.compile(
    r"\b(?:ai|yapay zek[aâ]|openai|opencode|copilot|claude|agent|bot|automation|automated)\b",
    re.IGNORECASE,
)
FORM_CHECKS = (
    "historical_facts",
    "source_authenticity",
    "source_record_consistency",
    "quotation",
    "copyright_and_reuse",
)
FORM_FIELDS = {
    "schema_version", "record_id", "record_path", "record_snapshot_sha256", "record_snapshot",
    "review_status", "reviewer", "review_date", "checks", "outcome", "evidence", "explanation",
    "publicationApproval",
}
CHECK_VALUES = {"not_reviewed", "pass", "fail", "not_applicable"}
OUTCOMES = {"pending", "approved", "correction_required", "rejected"}
RIGHTS_UNCLEAR = {"unknown", "permission_required", "ai_representative", ""}


def canonical_json(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256_value(value: object) -> str:
    return hashlib.sha256(canonical_json(value)).hexdigest()


def is_ai_actor(value: object) -> bool:
    return isinstance(value, str) and bool(AI_ACTOR.search(value))


def _normalized(value: object) -> str:
    return re.sub(r"\s+", " ", value.strip()).casefold() if isinstance(value, str) else ""


def _text(value: object) -> str:
    return value.strip() if isinstance(value, str) else ""


def _date_value(record: dict) -> dict:
    value = record.get("date")
    return value if isinstance(value, dict) else {}


def _date_is_valid(value: dict) -> bool:
    precision = value.get("precision")
    certainty = value.get("certainty")
    start = value.get("start")
    end = value.get("end")
    if precision == "unknown":
        return start is None and end is None and certainty == "unknown"
    if not isinstance(precision, str) or precision not in {"day", "month", "year", "range"}:
        return False
    if not isinstance(certainty, str) or certainty not in {"exact", "estimated"}:
        return False
    if not isinstance(start, str):
        return False
    try:
        start_date = date.fromisoformat(start)
    except ValueError:
        return False
    if start_date.isoformat() != start:
        return False
    if not 1800 <= start_date.year <= 2100:
        return False
    end_date = None
    if end is not None:
        if not isinstance(end, str):
            return False
        try:
            end_date = date.fromisoformat(end)
        except ValueError:
            return False
        if end_date.isoformat() != end or end_date < start_date or not 1800 <= end_date.year <= 2100:
            return False
    if precision == "range" and end_date is None:
        return False
    if precision == "day" and end_date is not None and end_date != start_date:
        return False
    if precision == "year" and (start_date.month != 1 or start_date.day != 1):
        return False
    if precision == "year" and end_date is not None and end_date.year != start_date.year:
        return False
    if precision == "month" and start_date.day != 1:
        return False
    if precision == "month" and end_date is not None and (end_date.year, end_date.month) != (
        start_date.year, start_date.month
    ):
        return False
    return True


def _source_url_is_well_formed(value: object) -> bool:
    if not isinstance(value, str) or any(char.isspace() for char in value):
        return False
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError:
        return False
    return (
        parsed.scheme == "https"
        and bool(parsed.hostname)
        and port in {None, 443}
        and parsed.username is None
        and parsed.password is None
    )


def _human_approval_status(approval: object, now: datetime | None = None) -> str:
    if not isinstance(approval, dict):
        return "pending"
    approved_at = approval.get("approvedAt")
    approved_by = approval.get("approvedBy")
    current = now or datetime.now(timezone.utc)
    approved_timestamp = _timezone_timestamp(approved_at)
    if (
        approval.get("status") == "approved"
        and approval.get("authority") == "human"
        and approval.get("role") == "human_editor"
        and isinstance(approved_by, str)
        and approved_by.strip()
        and not is_ai_actor(approved_by)
        and isinstance(approved_at, str)
        and approved_timestamp is not None
        and approved_timestamp <= current
    ):
        return "approval_claim_present_identity_unverified"
    return "pending_or_invalid"


def _timezone_timestamp(value: object) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        return None
    return parsed.astimezone(timezone.utc)


def _reviewer_status(verification: dict, today: date | None = None) -> str:
    reviewer = verification.get("reviewedBy")
    reviewed_at = verification.get("reviewedAt")
    if is_ai_actor(reviewer):
        return "ai_review_only"
    if not isinstance(reviewer, str) or not reviewer.strip():
        return "missing"
    try:
        parsed_date = date.fromisoformat(reviewed_at) if isinstance(reviewed_at, str) else None
    except ValueError:
        parsed_date = None
    today = today or datetime.now(timezone.utc).date()
    if parsed_date is None or parsed_date.isoformat() != reviewed_at or parsed_date > today:
        return "claimed_human_review_incomplete"
    return "claimed_human_review_identity_unverified"


def _record_issues(record: dict, source: dict, date_info: dict, reviewer_status: str) -> list[str]:
    issues = []
    if not isinstance(record.get("id"), str) or not record["id"].strip():
        issues.append("missing_id")
    if not isinstance(record.get("title"), str) or not record["title"].strip():
        issues.append("missing_title")
    if not isinstance(record.get("type"), str) or not record["type"].strip():
        issues.append("missing_type")
    if not _text(source.get("institution")):
        issues.append("missing_source_institution")
    if not source.get("url"):
        issues.append("missing_source_url")
    elif not _source_url_is_well_formed(source.get("url")):
        issues.append("invalid_source_url")
    if not any(_text(source.get(field)) for field in ("citation", "title", "note")):
        issues.append("missing_citation")
    if not date_info:
        issues.append("missing_date")
    elif not _date_is_valid(date_info):
        issues.append("invalid_date_metadata")
    rights = record.get("rights") if isinstance(record.get("rights"), dict) else {}
    if _text(rights.get("status")) in RIGHTS_UNCLEAR:
        issues.append("rights_unclear")
    if reviewer_status in {"missing", "ai_review_only", "claimed_human_review_incomplete"}:
        issues.append("human_expert_review_pending")
    if _human_approval_status(record.get("publicationApproval")) != "approval_claim_present_identity_unverified":
        issues.append("human_editor_publication_approval_pending")
    return issues


def _record_row(path: Path, root: Path, record: dict) -> dict:
    source = record.get("source") if isinstance(record.get("source"), dict) else {}
    date_info = _date_value(record)
    verification = record.get("verification") if isinstance(record.get("verification"), dict) else {}
    checks = verification.get("checks") if isinstance(verification.get("checks"), dict) else {}
    reviewer_status = _reviewer_status(verification)
    citation_parts = [source.get("citation"), source.get("title"), source.get("note")]
    citation = " — ".join(part.strip() for part in citation_parts if isinstance(part, str) and part.strip())
    issues = _record_issues(record, source, date_info, reviewer_status)
    recorded_reachability = checks.get("sourceReachable")
    return {
        "record_id": _text(record.get("id")),
        "record_slug": _text(record.get("slug")),
        "title": _text(record.get("title")),
        "type": _text(record.get("type")),
        "date_start": _text(date_info.get("start")),
        "date_end": _text(date_info.get("end")),
        "date_precision": _text(date_info.get("precision")),
        "date_certainty": _text(date_info.get("certainty")),
        "source_institution": _text(source.get("institution")),
        "source_url": _text(source.get("url")),
        "citation": citation,
        "recorded_source_access_claim": (
            "previously_reported_reachable_not_rechecked"
            if recorded_reachability is True
            else "previously_reported_unreachable"
            if recorded_reachability is False
            else "not_recorded"
        ),
        "source_access_status": "not_checked",
        "rights_status": (record.get("rights", {}).get("status", "")
                          if isinstance(record.get("rights"), dict) else ""),
        "ai_review_status": "ai_review_only" if reviewer_status == "ai_review_only" else "not_detected",
        "human_expert_review_status": reviewer_status,
        "human_publication_approval_status": _human_approval_status(record.get("publicationApproval")),
        "verification_status": verification.get("status") or "",
        "quotation_present": isinstance(record.get("quotation"), dict) and bool(record.get("quotation")),
        "issues": issues,
        "risk_flags": _risk_flags(record, reviewer_status, issues),
        "record_path": path.relative_to(root).as_posix(),
        "record_snapshot_sha256": sha256_value(record),
        "_record": record,
    }


def _risk_flags(record: dict, reviewer_status: str, issues: list[str]) -> list[str]:
    flags = []
    date_info = _date_value(record)
    if date_info.get("certainty") == "estimated":
        flags.append("estimated_date_requires_context_review")
    if date_info.get("precision") == "unknown":
        flags.append("unknown_date")
    rights = record.get("rights") if isinstance(record.get("rights"), dict) else {}
    if _text(rights.get("status")) in RIGHTS_UNCLEAR:
        flags.append("reuse_or_copyright_status_unclear")
    if reviewer_status == "ai_review_only":
        flags.append("ai_review_is_not_human_expert_review")
    if reviewer_status in {"missing", "claimed_human_review_incomplete"}:
        flags.append("human_expert_review_required")
    if "human_editor_publication_approval_pending" in issues:
        flags.append("human_editor_publication_approval_required")
    if any(issue in issues for issue in ("missing_source_institution", "missing_source_url",
                                         "invalid_source_url", "missing_citation")):
        flags.append("source_or_citation_gap")
    if isinstance(record.get("quotation"), dict) and record["quotation"]:
        quote = record["quotation"]
        if not quote.get("source") and not quote.get("sourceUrl"):
            flags.append("quotation_source_metadata_needs_review")
    image = record.get("image") if isinstance(record.get("image"), dict) else {}
    if image.get("kind") == "ai_representative":
        flags.append("ai_representation_must_not_be_classified_as_historical_photo")
    if "invalid_date_metadata" in issues:
        flags.append("date_metadata_conflict")
    return flags


def load_records(root: Path) -> tuple[list[tuple[Path, dict]], list[dict]]:
    loaded = []
    findings = []
    for directory in ARCHIVE_DIRS:
        target = root / directory
        if not target.is_dir():
            findings.append({"severity": "error", "code": "missing_archive_directory", "path": directory.as_posix()})
            continue
        for path in sorted(target.rglob("*.json")):
            try:
                value = json.loads(path.read_text(encoding="utf-8-sig"))
            except (OSError, UnicodeError, json.JSONDecodeError) as exc:
                findings.append({
                    "severity": "error",
                    "code": "invalid_archive_json",
                    "path": path.relative_to(root).as_posix(),
                    "message": str(exc),
                })
                continue
            if not isinstance(value, dict):
                findings.append({
                    "severity": "error",
                    "code": "invalid_archive_shape",
                    "path": path.relative_to(root).as_posix(),
                    "message": "Her dosya tek bir kayıt nesnesi olmalı.",
                })
                continue
            loaded.append((path, value))
    return loaded, findings


def _pairwise_groups(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    groups: dict[tuple[str, str], list[dict]] = {}
    for row in rows:
        title = _normalized(row["title"])
        day = row["date_start"]
        if title and day:
            groups.setdefault((title, day), []).append(row)
    duplicate_candidates = []
    source_conflicts = []
    for (_title, _day), group in sorted(groups.items()):
        if len(group) < 2:
            continue
        ids = sorted(row["record_id"] for row in group)
        source_keys = {
            (row["source_institution"].casefold(), row["source_url"].casefold())
            for row in group
        }
        item = {
            "record_ids": ids,
            "paths": sorted(row["record_path"] for row in group),
            "title": group[0]["title"],
            "date": group[0]["date_start"],
        }
        duplicate_candidates.append(item)
        if len(source_keys) > 1:
            source_conflicts.append({
                **item,
                "source_claims": sorted(
                    {
                        f"{row['source_institution']}: {row['source_url']}"
                        for row in group
                    }
                ),
            })
    return duplicate_candidates, source_conflicts


def _identifier_collision_groups(rows: list[dict]) -> list[dict]:
    collisions = []
    for field in ("record_id", "record_slug"):
        grouped: dict[str, list[dict]] = {}
        for row in rows:
            value = _normalized(row.get(field))
            if value:
                grouped.setdefault(value, []).append(row)
        for value, group in sorted(grouped.items()):
            if len(group) > 1:
                collisions.append({
                    "field": field,
                    "value": value,
                    "record_ids": sorted(row["record_id"] for row in group),
                    "paths": sorted(row["record_path"] for row in group),
                })
    return collisions


def _load_review_state(forms_dir: Path | None, row: dict, record: dict, today: date) -> tuple[str, list[str]]:
    if forms_dir is None or not row["record_id"]:
        return "form_missing", ["review_form_missing"]
    form_path = forms_dir / f"{row['record_id']}.json"
    if not form_path.is_file():
        return "form_missing", ["review_form_missing"]
    try:
        form = json.loads(form_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        return "form_invalid", ["review_form_invalid"]
    errors = validate_review_form(form, record, today=today)
    if errors:
        return "form_invalid", errors
    return form["review_status"], []


def build_inventory(
    root: Path,
    forms_dir: Path | None = None,
    link_results: dict[str, dict] | None = None,
    today: date | None = None,
) -> dict:
    today = today or datetime.now(timezone.utc).date()
    loaded, findings = load_records(root)
    rows = []
    for path, record in loaded:
        row = _record_row(path, root, record)
        form_status, form_errors = _load_review_state(forms_dir, row, record, today)
        row["human_form_status"] = form_status
        row["issues"].extend(form_errors)
        url_key = normalize_https_url(row["source_url"])
        link_result = (link_results or {}).get(url_key, {"status": "not_checked"})
        row["source_access_status"] = link_result.get("status", "not_checked")
        row["source_access_detail"] = link_result
        rows.append(row)
    duplicate_candidates, source_conflicts = _pairwise_groups(rows)
    identifier_collisions = _identifier_collision_groups(rows)
    duplicate_ids = {
        record_id for group in duplicate_candidates for record_id in group["record_ids"]
    }
    conflict_ids = {
        record_id for group in source_conflicts for record_id in group["record_ids"]
    }
    for row in rows:
        if row["record_id"] in duplicate_ids:
            row["risk_flags"].append("probable_duplicate_candidate")
        if row["record_id"] in conflict_ids:
            row["risk_flags"].append("conflicting_source_claim_candidate")
    for group in identifier_collisions:
        findings.append({
            "severity": "warning",
            "code": "duplicate_record_identifier",
            "field": group["field"],
            "value": group["value"],
            "paths": group["paths"],
        })
    for row in rows:
        row.pop("_record", None)
    type_counts = _counts(rows, "type")
    institution_counts = _counts(rows, "source_institution")
    missing_review = [
        row["record_id"] for row in rows
        if row["human_expert_review_status"] != "claimed_human_review_identity_unverified"
        or row["human_form_status"] != "submitted"
    ]
    missing_source = [
        row["record_id"] for row in rows
        if any(issue in row["issues"] for issue in (
            "missing_source_institution", "missing_source_url", "invalid_source_url", "missing_citation",
        ))
    ]
    unclear_rights = [row["record_id"] for row in rows if "rights_unclear" in row["issues"]]
    estimated_dates = [row["record_id"] for row in rows if row["date_certainty"] == "estimated"]
    ai_review_only = [row["record_id"] for row in rows if row["ai_review_status"] == "ai_review_only"]
    missing_reviewer = [
        row["record_id"] for row in rows if row["human_expert_review_status"] == "missing"
    ]
    pending_publications = [
        row["record_id"] for row in rows
        if row["human_publication_approval_status"] != "approval_claim_present_identity_unverified"
    ]
    summary = {
        "record_count": len(rows),
        "invalid_record_count": len(findings),
        "type_counts": type_counts,
        "source_institution_counts": institution_counts,
        "human_review_missing_count": len(missing_review),
        "human_review_missing_ids": missing_review,
        "ai_review_only_count": len(ai_review_only),
        "ai_review_only_ids": ai_review_only,
        "missing_reviewer_count": len(missing_reviewer),
        "missing_reviewer_ids": missing_reviewer,
        "source_missing_count": len(missing_source),
        "source_missing_ids": missing_source,
        "rights_unclear_count": len(unclear_rights),
        "rights_unclear_ids": unclear_rights,
        "estimated_date_count": len(estimated_dates),
        "estimated_date_ids": estimated_dates,
        "source_access_status_counts": _counts(rows, "source_access_status"),
        "probable_duplicate_group_count": len(duplicate_candidates),
        "record_identifier_collision_group_count": len(identifier_collisions),
        "conflicting_source_group_count": len(source_conflicts),
        "publication_approval_pending_count": len(pending_publications),
        "publication_approval_pending_ids": pending_publications,
    }
    return {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_directories": [path.as_posix() for path in ARCHIVE_DIRS],
        "summary": summary,
        "records": rows,
        "probable_duplicate_groups": duplicate_candidates,
        "identifier_collision_groups": identifier_collisions,
        "conflicting_source_groups": source_conflicts,
        "findings": findings,
        "historical_truth_limitation": (
            "URL syntax, prior sourceReachable claims, HTTP status, and a human-entered form do not independently "
            "prove document authenticity, historical correctness, attribution, rights, or reviewer identity."
        ),
    }


def _counts(rows: list[dict], field: str) -> dict[str, int]:
    result: dict[str, int] = {}
    for row in rows:
        value = row.get(field) or "(eksik)"
        result[value] = result.get(value, 0) + 1
    return dict(sorted(result.items(), key=lambda item: item[0].casefold()))


def create_review_form(record_path: Path, root: Path, record: dict) -> dict:
    source = record.get("source") if isinstance(record.get("source"), dict) else {}
    date_info = _date_value(record)
    return {
        "schema_version": FORM_SCHEMA_VERSION,
        "record_id": record.get("id") or "",
        "record_path": record_path.relative_to(root).as_posix(),
        "record_snapshot_sha256": sha256_value(record),
        "record_snapshot": {
            "title": record.get("title") or "",
            "type": record.get("type") or "",
            "date": date_info,
            "source_institution": source.get("institution") or "",
            "source_url": source.get("url") or "",
            "citation": source.get("citation") or source.get("title") or "",
            "rights_status": (record.get("rights", {}).get("status", "")
                              if isinstance(record.get("rights"), dict) else ""),
        },
        "review_status": "pending",
        "reviewer": None,
        "review_date": None,
        "checks": {key: "not_reviewed" for key in FORM_CHECKS},
        "outcome": "pending",
        "evidence": [],
        "explanation": "",
        "publicationApproval": None,
    }


def _valid_iso_date(value: object, today: date) -> bool:
    if not isinstance(value, str):
        return False
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        return False
    return parsed.isoformat() == value and parsed <= today


def validate_review_form(form: object, record: dict | None = None, today: date | None = None) -> list[str]:
    today = today or datetime.now(timezone.utc).date()
    errors = []
    if not isinstance(form, dict):
        return ["form_root_must_be_object"]
    if set(form) != FORM_FIELDS:
        errors.append("form_fields_do_not_match_schema")
    if form.get("schema_version") != FORM_SCHEMA_VERSION:
        errors.append("unsupported_schema_version")
    if not isinstance(form.get("record_id"), str) or not form["record_id"].strip():
        errors.append("missing_record_id")
    if record is not None:
        if form.get("record_id") != record.get("id"):
            errors.append("record_id_mismatch")
        if form.get("record_snapshot_sha256") != sha256_value(record):
            errors.append("stale_record_snapshot")
    snapshot = form.get("record_snapshot")
    snapshot_fields = {
        "title", "type", "date", "source_institution", "source_url", "citation", "rights_status"
    }
    if not isinstance(snapshot, dict) or set(snapshot) != snapshot_fields:
        errors.append("invalid_record_snapshot_shape")
    elif any(not isinstance(snapshot.get(key), str) for key in snapshot_fields - {"date"}) or not isinstance(
        snapshot.get("date"), dict
    ):
        errors.append("invalid_record_snapshot_types")
    digest = form.get("record_snapshot_sha256")
    if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
        errors.append("invalid_record_snapshot_hash")
    if not isinstance(form.get("record_path"), str) or not form["record_path"]:
        errors.append("invalid_record_path")
    status = form.get("review_status")
    outcome = form.get("outcome")
    if not isinstance(status, str) or status not in {"pending", "submitted"}:
        errors.append("invalid_review_status")
    if not isinstance(outcome, str) or outcome not in OUTCOMES:
        errors.append("invalid_outcome")
    checks = form.get("checks")
    if not isinstance(checks, dict) or set(checks) != set(FORM_CHECKS):
        errors.append("invalid_check_fields")
        checks = {}
    for key in FORM_CHECKS:
        value = checks.get(key)
        if not isinstance(value, str) or value not in CHECK_VALUES:
            errors.append(f"invalid_check_value:{key}")
    reviewer = form.get("reviewer")
    reviewer_name = reviewer.get("name") if isinstance(reviewer, dict) else None
    review_date = form.get("review_date")
    evidence = form.get("evidence")
    explanation = form.get("explanation")
    publication_approval = form.get("publicationApproval")
    if not isinstance(form.get("explanation"), str):
        errors.append("invalid_explanation_type")
    if not isinstance(review_date, (str, type(None))):
        errors.append("invalid_review_date_type")
    if reviewer is not None and (
        not isinstance(reviewer, dict)
        or not {"name", "role"}.issubset(reviewer)
        or not set(reviewer).issubset({"name", "role", "institution"})
        or not isinstance(reviewer.get("name"), str)
        or not isinstance(reviewer.get("role"), str)
        or "institution" in reviewer and not isinstance(reviewer["institution"], str)
    ):
        errors.append("invalid_reviewer_shape")
    if not isinstance(evidence, list) or any(
        not isinstance(item, dict)
        or not set(item).issubset({"description", "url", "reference"})
        or "description" not in item
        or not ({"url", "reference"} & set(item))
        or not isinstance(item.get("description"), str)
        or "url" in item and not isinstance(item["url"], str)
        or "reference" in item and not isinstance(item["reference"], str)
        for item in evidence
    ):
        errors.append("invalid_evidence_shape")
    if isinstance(publication_approval, dict):
        approval_fields = {"status", "authority", "role", "approvedBy", "approvedAt"}
        if (
            set(publication_approval) != approval_fields
            or any(not isinstance(publication_approval.get(key), str) for key in approval_fields)
        ):
            errors.append("invalid_publication_approval_shape")
    if status == "pending":
        if outcome != "pending" or reviewer is not None or review_date is not None:
            errors.append("pending_form_contains_review_decision")
        if isinstance(publication_approval, dict):
            errors.append("pending_form_cannot_contain_publication_approval")
        if any(checks.get(key) != "not_reviewed" for key in FORM_CHECKS):
            errors.append("pending_form_contains_review_checks")
    elif status != "submitted" and isinstance(publication_approval, dict):
        errors.append("publication_approval_without_submitted_review")
    if status == "submitted":
        if not isinstance(reviewer_name, str) or not reviewer_name.strip():
            errors.append("missing_reviewer_name")
        elif is_ai_actor(reviewer_name):
            errors.append("ai_cannot_be_human_reviewer")
        if not isinstance(reviewer, dict) or reviewer.get("role") != "human_expert":
            errors.append("reviewer_must_be_human_expert")
        if not _valid_iso_date(review_date, today):
            errors.append("invalid_review_date")
        if not isinstance(evidence, list) or not evidence or any(
            not isinstance(item, dict) or not isinstance(item.get("description"), str)
            or not item["description"].strip()
            or not (isinstance(item.get("url"), str) and item["url"].strip()
                    or isinstance(item.get("reference"), str) and item["reference"].strip())
            for item in evidence
        ):
            errors.append("review_evidence_required")
        if not isinstance(explanation, str) or not explanation.strip():
            errors.append("review_explanation_required")
        if outcome == "pending":
            errors.append("submitted_form_requires_final_outcome")
        if any(checks.get(key) == "not_reviewed" for key in FORM_CHECKS):
            errors.append("review_check_incomplete")
        if outcome == "approved":
            expected_quote = (
                "not_applicable"
                if record is not None and not (
                    isinstance(record.get("quotation"), dict) and record.get("quotation")
                )
                else "pass"
            )
            required = {
                "historical_facts": "pass",
                "source_authenticity": "pass",
                "source_record_consistency": "pass",
                "quotation": expected_quote,
                "copyright_and_reuse": "pass",
            }
            if any(checks.get(key) != value for key, value in required.items()):
                errors.append("approval_requires_all_applicable_checks_to_pass")
            if record is None:
                errors.append("approval_validation_requires_archive_record")
            if not _publication_approval_valid(publication_approval, reviewer_name, review_date, today):
                errors.append("valid_human_editor_publication_approval_required")
        elif isinstance(publication_approval, dict):
            errors.append("nonapproved_review_cannot_have_publication_approval")
    return errors


def _publication_approval_valid(
    approval: object, reviewer_name: object, review_date: object, today: date
) -> bool:
    if not isinstance(approval, dict):
        return False
    approved_by = approval.get("approvedBy")
    approved_at = _timezone_timestamp(approval.get("approvedAt"))
    review_day = date.fromisoformat(review_date) if isinstance(review_date, str) and _valid_iso_date(
        review_date, today
    ) else None
    return (
        approval.get("status") == "approved"
        and approval.get("authority") == "human"
        and approval.get("role") == "human_editor"
        and isinstance(approved_by, str)
        and bool(approved_by.strip())
        and not is_ai_actor(approved_by)
        and approved_at is not None
        and approved_at.date() <= today
        and review_day is not None
        and approved_at.date() >= review_day
    )


def write_reports(inventory: dict, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    public_inventory = json.dumps(inventory, ensure_ascii=False, indent=2) + "\n"
    (output_dir / "inventory.json").write_text(public_inventory, encoding="utf-8")
    fields = [
        "record_id", "record_slug", "title", "type", "date_start", "date_end", "date_precision", "date_certainty",
        "source_institution", "source_url", "citation", "recorded_source_access_claim", "source_access_status",
        "rights_status", "ai_review_status", "human_expert_review_status", "human_form_status",
        "human_publication_approval_status", "verification_status", "quotation_present", "issues", "risk_flags",
        "record_path", "record_snapshot_sha256",
    ]
    with (output_dir / "inventory.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in inventory["records"]:
            safe_row = dict(row)
            for field in fields:
                value = safe_row.get(field, "")
                if isinstance(value, list):
                    value = "; ".join(str(item) for item in value)
                value = str(value)
                if value.lstrip(" \t\r\n").startswith(("=", "+", "-", "@")):
                    value = "'" + value
                safe_row[field] = value
            writer.writerow(safe_row)
    (output_dir / "inventory.md").write_text(render_markdown(inventory), encoding="utf-8")


def render_markdown(inventory: dict) -> str:
    summary = inventory["summary"]
    lines = [
        "# Tarihî arşiv editörlük envanteri",
        "",
        f"- **Üretim zamanı (UTC):** {inventory['generated_at']}",
        f"- **Toplam kayıt:** {summary['record_count']}",
        f"- **İnsan uzman incelemesi eksik:** {summary['human_review_missing_count']}",
        f"- **Yalnızca AI incelemesi görülen:** {summary['ai_review_only_count']}",
        f"- **Reviewer alanı eksik:** {summary['missing_reviewer_count']}",
        f"- **Kaynak/künye eksiği:** {summary['source_missing_count']}",
        f"- **Bu çalışmada link kontrolü:** {', '.join(f'{key}={value}' for key, value in summary['source_access_status_counts'].items())}",
        f"- **Belirsiz hak durumu:** {summary['rights_unclear_count']}",
        f"- **Tahmini tarih:** {summary['estimated_date_count']}",
        f"- **Muhtemel tekrar grubu:** {summary['probable_duplicate_group_count']}",
        f"- **Yinelenen ID/slug grubu:** {summary['record_identifier_collision_group_count']}",
        f"- **Çelişkili kaynak grubu:** {summary['conflicting_source_group_count']}",
        f"- **Yayın onayı bekleyen:** {summary['publication_approval_pending_count']}",
        "",
        "> Bu envanter otomatik triage aracıdır. URL biçimi/HTTP cevabı tarihsel doğruluk, özgünlük, telif veya "
        "insan kimliği kanıtı değildir. İnsan uzman incelemesi olmadan yayın onayı verilmez.",
        "",
        "## Tür dağılımı",
        "",
        "| Tür | Kayıt |",
        "|---|---:|",
    ]
    lines.extend(f"| {_md_escape(key)} | {value} |" for key, value in summary["type_counts"].items())
    lines.extend(["", "## Kaynak kurumu dağılımı", "", "| Kurum | Kayıt |", "|---|---:|"])
    lines.extend(
        f"| {_md_escape(key)} | {value} |"
        for key, value in summary["source_institution_counts"].items()
    )
    lines.extend(["", "## İnsan incelemesi bekleyen kayıtlar", ""])
    lines.extend(
        f"- `{_md_escape(row['record_id'])}` — {_md_escape(row['title'])} "
        f"({_md_escape(row['record_path'])}; durum: {_md_escape(row['human_expert_review_status'])})"
        for row in inventory["records"]
        if row["record_id"] in summary["human_review_missing_ids"]
    )
    if not summary["human_review_missing_ids"]:
        lines.append("- İnsan incelemesi bekleyen kayıt yok.")
    sections = (
        ("Kaynak veya künye eksikleri", "source_missing_ids"),
        ("Hak durumu belirsiz kayıtlar", "rights_unclear_ids"),
        ("Tahmini tarihli kayıtlar", "estimated_date_ids"),
        ("Yayın onayı bekleyen kayıtlar", "publication_approval_pending_ids"),
    )
    for title, key in sections:
        lines.extend(["", f"## {title}", ""])
        if summary[key]:
            lines.extend(f"- `{_md_escape(record_id)}`" for record_id in summary[key])
        else:
            lines.append("- Bulgu yok.")
    lines.extend(["", "## Muhtemel tekrarlar", ""])
    if inventory["probable_duplicate_groups"]:
        lines.extend(
            f"- `{', '.join(group['record_ids'])}` — {_md_escape(group['title'])}, "
            f"{group['date']} ({'; '.join(group['paths'])})"
            for group in inventory["probable_duplicate_groups"]
        )
    else:
        lines.append("- Aynı başlık/tarih anahtarına göre muhtemel tekrar grubu bulunmadı.")
    lines.extend(["", "## Yinelenen kimlik veya slug", ""])
    if inventory["identifier_collision_groups"]:
        lines.extend(
            f"- `{group['field']}={_md_escape(group['value'])}` — "
            f"{', '.join(group['paths'])}"
            for group in inventory["identifier_collision_groups"]
        )
    else:
        lines.append("- Yinelenen ID/slug bulunmadı.")
    lines.extend(["", "## Çelişkili kaynak iddiaları", ""])
    if inventory["conflicting_source_groups"]:
        for group in inventory["conflicting_source_groups"]:
            lines.append(f"- `{', '.join(group['record_ids'])}` — {_md_escape(group['title'])}:")
            lines.extend(f"  - {_md_escape(claim)}" for claim in group["source_claims"])
    else:
        lines.append("- Aynı başlık/tarih için farklı kaynak iddiası bulunmadı.")
    if inventory["findings"]:
        lines.extend(["", "## Girdi dosyası bulguları", ""])
        lines.extend(
            f"- **{finding['severity']}** `{finding['code']}` — `{finding['path']}` "
            f"{_md_escape(finding.get('message', ''))}"
            for finding in inventory["findings"]
        )
    return "\n".join(lines) + "\n"


def _md_escape(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def create_forms(root: Path, forms_dir: Path) -> dict:
    loaded, findings = load_records(root)
    forms_dir.mkdir(parents=True, exist_ok=True)
    created, preserved, skipped = [], [], []
    seen_ids = set()
    for path, record in loaded:
        record_id = record.get("id")
        if not isinstance(record_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", record_id):
            skipped.append({"path": path.relative_to(root).as_posix(), "reason": "invalid_or_missing_record_id"})
            continue
        target = forms_dir / f"{record_id}.json"
        if record_id in seen_ids:
            findings.append({
                "severity": "error",
                "code": "duplicate_record_id_form_collision",
                "path": path.relative_to(root).as_posix(),
            })
            skipped.append({"path": path.relative_to(root).as_posix(), "reason": "duplicate_record_id"})
            continue
        seen_ids.add(record_id)
        if target.exists():
            preserved.append(record_id)
            continue
        form = create_review_form(path, root, record)
        target.write_text(json.dumps(form, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        created.append(record_id)
    return {"created": created, "preserved": preserved, "skipped": skipped, "findings": findings}


def validate_forms(root: Path, forms_dir: Path, today: date | None = None) -> dict:
    today = today or datetime.now(timezone.utc).date()
    loaded, findings = load_records(root)
    forms_by_id = {}
    for path, record in loaded:
        record_id = record.get("id")
        if not isinstance(record_id, str) or not record_id:
            continue
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", record_id):
            findings.append({
                "severity": "error",
                "code": "unsafe_record_id_for_form_path",
                "path": path.relative_to(root).as_posix(),
            })
            continue
        form_path = forms_dir / f"{record_id}.json"
        if not form_path.is_file():
            findings.append({"severity": "error", "code": "review_form_missing", "path": str(form_path)})
            continue
        try:
            form = json.loads(form_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            findings.append({
                "severity": "error",
                "code": "invalid_review_form_json",
                "path": str(form_path),
                "message": str(exc),
            })
            continue
        errors = validate_review_form(form, record, today)
        forms_by_id[record_id] = form
        findings.extend(
            {"severity": "error", "code": code, "path": str(form_path), "record_id": record_id}
            for code in errors
        )
    return {
        "record_count": len(loaded),
        "form_count": len(forms_by_id),
        "pending_count": sum(form.get("review_status") == "pending" for form in forms_by_id.values()),
        "submitted_count": sum(form.get("review_status") == "submitted" for form in forms_by_id.values()),
        "findings": findings,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Tarihî arşiv editörlük envanteri ve insan inceleme araçları.")
    subparsers = parser.add_subparsers(dest="command", required=True)
    inventory_parser = subparsers.add_parser("inventory", help="JSON, CSV ve Markdown envanter raporlarını üret.")
    inventory_parser.add_argument("--root", type=Path, default=Path("."))
    inventory_parser.add_argument("--output-dir", type=Path, default=Path("docs/editorial/reports"))
    inventory_parser.add_argument("--forms-dir", type=Path, default=Path("docs/editorial/forms"))
    inventory_parser.add_argument("--check-links", action="store_true", help="Açıkça etkinleştirilirse HTTPS HEAD istekleri yap.")
    inventory_parser.add_argument("--cache-file", type=Path, default=Path("docs/editorial/link-cache.json"))
    inventory_parser.add_argument("--timeout", type=float, default=5.0)
    inventory_parser.add_argument("--delay", type=float, default=1.0)
    inventory_parser.add_argument("--max-link-checks", type=int, default=50)
    forms_parser = subparsers.add_parser("create-forms", help="Eksik insan inceleme formlarını pending durumunda oluştur.")
    forms_parser.add_argument("--root", type=Path, default=Path("."))
    forms_parser.add_argument("--forms-dir", type=Path, default=Path("docs/editorial/forms"))
    validate_parser = subparsers.add_parser("validate-forms", help="İnceleme formlarını salt okunur doğrula.")
    validate_parser.add_argument("--root", type=Path, default=Path("."))
    validate_parser.add_argument("--forms-dir", type=Path, default=Path("docs/editorial/forms"))
    ledger_parser = subparsers.add_parser("verify-ledger", help="İnsan onay olay defterinin hash zincirini doğrula.")
    ledger_parser.add_argument("ledger", type=Path)
    args = parser.parse_args(argv)

    if args.command == "create-forms":
        result = create_forms(args.root.resolve(), args.forms_dir.resolve())
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1 if result["findings"] else 0
    if args.command == "validate-forms":
        result = validate_forms(args.root.resolve(), args.forms_dir.resolve())
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1 if result["findings"] else 0
    if args.command == "verify-ledger":
        result = verify_ledger(args.ledger)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1 if result["findings"] else 0

    root = args.root.resolve()
    forms_dir = args.forms_dir.resolve() if args.forms_dir else None
    link_results = {}
    if args.check_links:
        link_results = check_links(
            root,
            timeout=args.timeout,
            delay=max(1.0, args.delay),
            max_checks=args.max_link_checks,
            cache_file=args.cache_file.resolve(),
        )
    report = build_inventory(root, forms_dir=forms_dir, link_results=link_results)
    write_reports(report, args.output_dir.resolve())
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    return 1 if report["findings"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
