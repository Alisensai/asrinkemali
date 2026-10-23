"""Read-only verifier for a hash-chained editorial audit ledger."""

from __future__ import annotations

from datetime import datetime
import hashlib
import json
from pathlib import Path
import re


GENESIS_HASH = "0" * 64
HEX_HASH = re.compile(r"^[0-9a-f]{64}$")
AI_ACTOR = re.compile(
    r"\b(?:ai|yapay zek[aâ]|openai|opencode|copilot|claude|agent|bot|automation|automated)\b",
    re.IGNORECASE,
)
EVENT_TYPES = {
    "review_submitted",
    "correction_requested",
    "review_rejected",
    "editor_approval_recorded",
}
ACTOR_ROLES = {"human_expert", "human_editor"}


def event_hash(event: dict) -> str:
    payload = {key: value for key, value in event.items() if key != "event_hash"}
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _event_errors(event: object, expected_sequence: int, previous_hash: str) -> list[str]:
    errors = []
    if not isinstance(event, dict):
        return ["event_must_be_object"]
    required = {
        "sequence", "timestamp", "record_id", "event_type", "actor", "actor_role",
        "form_sha256", "evidence_refs", "previous_event_hash", "event_hash",
    }
    if not required.issubset(event):
        errors.append("missing_required_event_fields")
        return errors
    if set(event) != required:
        errors.append("unexpected_event_fields")
    if event["sequence"] != expected_sequence:
        errors.append("invalid_sequence")
    if not isinstance(event["record_id"], str) or not event["record_id"].strip():
        errors.append("invalid_record_id")
    if not isinstance(event["event_type"], str) or event["event_type"] not in EVENT_TYPES:
        errors.append("invalid_event_type")
    actor = event["actor"]
    if not isinstance(actor, str) or not actor.strip():
        errors.append("invalid_actor")
    elif AI_ACTOR.search(actor):
        errors.append("ai_actor_forbidden")
    if not isinstance(event["actor_role"], str) or event["actor_role"] not in ACTOR_ROLES:
        errors.append("invalid_actor_role")
    timestamp = event["timestamp"]
    parsed_timestamp = None
    if isinstance(timestamp, str) and re.search(r"(?:Z|[+-]\d{2}:\d{2})$", timestamp):
        try:
            parsed_timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        except ValueError:
            parsed_timestamp = None
    if parsed_timestamp is None or parsed_timestamp.tzinfo is None:
        errors.append("timestamp_requires_timezone")
    if not isinstance(event["form_sha256"], str) or not HEX_HASH.fullmatch(event["form_sha256"]):
        errors.append("invalid_form_hash")
    if not isinstance(event["evidence_refs"], list) or not event["evidence_refs"] or any(
        not isinstance(ref, str) or not ref.strip() for ref in event["evidence_refs"]
    ):
        errors.append("invalid_evidence_references")
    expected_role = "human_editor" if event["event_type"] == "editor_approval_recorded" else "human_expert"
    if event["actor_role"] in ACTOR_ROLES and event["actor_role"] != expected_role:
        errors.append("actor_role_mismatches_event_type")
    if event["previous_event_hash"] != previous_hash:
        errors.append("broken_previous_hash")
    if not isinstance(event["event_hash"], str) or not HEX_HASH.fullmatch(event["event_hash"]):
        errors.append("invalid_event_hash")
    elif event["event_hash"] != event_hash(event):
        errors.append("event_hash_mismatch")
    return errors


def verify_ledger(path: Path) -> dict:
    findings = []
    previous_hash = GENESIS_HASH
    valid_events = 0
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeError) as exc:
        return {
            "event_count": 0,
            "valid_event_count": 0,
            "findings": [{"line": 0, "code": "ledger_unreadable", "message": str(exc)}],
            "identity_authenticity_proven": False,
        }
    for line_number, line in enumerate(lines, start=1):
        if not line.strip():
            findings.append({"line": line_number, "code": "blank_ledger_line"})
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError as exc:
            findings.append({"line": line_number, "code": "invalid_jsonl", "message": str(exc)})
            continue
        errors = _event_errors(event, valid_events + 1, previous_hash)
        if errors:
            findings.extend({"line": line_number, "code": code} for code in errors)
            continue
        valid_events += 1
        previous_hash = event["event_hash"]
    return {
        "event_count": len(lines),
        "valid_event_count": valid_events,
        "findings": findings,
        "identity_authenticity_proven": False,
        "integrity_scope": "Hash-chain consistency only; repository access controls and human identity are external.",
    }
