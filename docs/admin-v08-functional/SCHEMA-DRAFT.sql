-- Offline PostgreSQL-compatible contract proposal only.
-- Not executed and not wired into the web runtime.
-- Replace UUID generation, migration tooling, retention, backups, and access policy
-- only after a database/provider decision and security review.

CREATE TABLE actor_identity (
  actor_id UUID PRIMARY KEY,
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  admin_role TEXT NOT NULL CHECK (admin_role IN (
    'system_admin', 'chief_editor', 'historian',
    'content_editor', 'researcher', 'readonly_auditor'
  )),
  created_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  UNIQUE (issuer, subject)
);

CREATE TABLE archive_snapshot (
  record_id TEXT NOT NULL,
  record_sha256 CHAR(64) NOT NULL CHECK (record_sha256 ~ '^[0-9a-f]{64}$'),
  captured_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (record_id, record_sha256)
);

CREATE TABLE expert_review (
  review_id UUID PRIMARY KEY,
  record_id TEXT NOT NULL,
  record_sha256 CHAR(64) NOT NULL,
  expert_actor_id UUID NOT NULL REFERENCES actor_identity(actor_id),
  outcome TEXT NOT NULL CHECK (outcome IN ('approved', 'correction_required', 'rejected')),
  evidence JSONB NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (record_id, record_sha256)
    REFERENCES archive_snapshot(record_id, record_sha256),
  UNIQUE (review_id, record_id, record_sha256),
  CHECK (jsonb_typeof(evidence) = 'object')
);

CREATE TABLE editor_approval (
  approval_id UUID PRIMARY KEY,
  record_id TEXT NOT NULL,
  record_sha256 CHAR(64) NOT NULL,
  expert_review_id UUID NOT NULL,
  editor_actor_id UUID NOT NULL REFERENCES actor_identity(actor_id),
  decided_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (expert_review_id, record_id, record_sha256)
    REFERENCES expert_review(review_id, record_id, record_sha256),
  FOREIGN KEY (record_id, record_sha256)
    REFERENCES archive_snapshot(record_id, record_sha256),
  UNIQUE (record_id, record_sha256),
  CHECK (expert_review_id IS NOT NULL)
);

CREATE TABLE draft_revision (
  revision_id UUID PRIMARY KEY,
  record_id TEXT NOT NULL,
  base_record_sha256 CHAR(64) NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  author_actor_id UUID NOT NULL REFERENCES actor_identity(actor_id),
  changes JSONB NOT NULL,
  reason TEXT NOT NULL CHECK (length(trim(reason)) >= 8),
  status TEXT NOT NULL CHECK (status IN ('review_required', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (record_id, base_record_sha256)
    REFERENCES archive_snapshot(record_id, record_sha256),
  UNIQUE (record_id, revision),
  CHECK (jsonb_typeof(changes) = 'object')
);

CREATE TABLE audit_event (
  event_id UUID PRIMARY KEY,
  actor_id UUID REFERENCES actor_identity(actor_id),
  record_id TEXT,
  record_sha256 CHAR(64) CHECK (record_sha256 IS NULL OR record_sha256 ~ '^[0-9a-f]{64}$'),
  action TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'denied', 'failed', 'dry_run')),
  safe_details JSONB NOT NULL,
  previous_event_hash CHAR(64) NOT NULL CHECK (previous_event_hash ~ '^[0-9a-f]{64}$'),
  event_hash CHAR(64) NOT NULL UNIQUE CHECK (event_hash ~ '^[0-9a-f]{64}$'),
  occurred_at TIMESTAMPTZ NOT NULL,
  CHECK (jsonb_typeof(safe_details) = 'object')
);

CREATE TABLE idempotency_ledger (
  idempotency_key TEXT PRIMARY KEY,
  actor_id UUID NOT NULL REFERENCES actor_identity(actor_id),
  request_sha256 CHAR(64) NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  result_reference UUID,
  created_at TIMESTAMPTZ NOT NULL
);

-- Required transaction semantics, intentionally not encoded as an executable
-- procedure until an actual DB and migration owner are selected:
-- 1) Lock the current archive_snapshot and compare record_sha256 to the submitted SHA.
-- 2) Require an expert_review at the same SHA with a different trusted actor.
-- 3) Require current MFA claims for both high-risk decisions.
-- 4) Insert approval and audit_event in one transaction; roll back on any failure.
-- 5) Enforce append-only audit with DB role/trigger and backup/restore verification.
-- 6) Never update the source archive JSON from this administrative database.
