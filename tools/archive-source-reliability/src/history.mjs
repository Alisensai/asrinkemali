/**
 * Kaynak URL değişiklik defteri.
 *
 * Amaç: bir kaydın kaynak URL'si değiştiğinde özgün URL'yi silmemek, yeni URL'yi
 * ve değişiklik gerekçesini ayrı bir araç veri dosyasında tutmak. Varsayılan
 * raporlama hiçbir zaman bu defteri veya arşiv kaydını yazmaz. Defteri
 * güncellemek için açıkça `history --seed-history --write` / `history --accept-history --write`
 * komutları gerekir.
 */

import { normalizeWhitespace, sortBy } from "./util.mjs";

const DEFAULT_AUTHOR = "OpenCode v07 kaynak geçmişi aracı";
const DEFAULT_REASON =
  "Arşiv kaydındaki kaynak URL'si değişti; eski URL korunur, yeni URL uzman incelemesi sonrası kabul edilir.";

function cloneHistory(history) {
  return JSON.parse(JSON.stringify(history ?? {}));
}

function normalizeEntry(entry) {
  return {
    recordId: entry.recordId,
    institution: entry.institution ?? null,
    originalUrl: entry.originalUrl ?? null,
    currentUrl: entry.currentUrl ?? null,
    changes: Array.isArray(entry.changes) ? entry.changes.map((change) => ({ ...change })) : [],
    lastSeenAt: entry.lastSeenAt ?? null,
  };
}

export function indexHistory(history) {
  const map = new Map();
  for (const raw of history?.sources ?? []) {
    if (!raw?.recordId) continue;
    map.set(raw.recordId, normalizeEntry(raw));
  }
  return map;
}

function proposedChange(entry, record, changedAt, reason, evidence) {
  return {
    changedAt,
    from: entry.currentUrl,
    to: record.source?.url ?? null,
    reason: reason ?? DEFAULT_REASON,
    evidence:
      evidence ??
      "Araç, arşiv kaydındaki source.url ile kaynak geçmişi defterindeki currentUrl alanını karşılaştırdı.",
    author: DEFAULT_AUTHOR,
  };
}

export function reconcileSourceHistory(records, history, { changedAt = null } = {}) {
  const entries = indexHistory(history);
  const recordIds = new Set(records.map((record) => record.id));
  const rows = [];

  for (const record of sortBy(records, (a, b) => String(a.id).localeCompare(String(b.id), "tr"))) {
    const currentUrl = record.source?.url ?? null;
    const entry = entries.get(record.id) ?? null;
    if (!entry) {
      rows.push({
        recordId: record.id,
        title: record.title ?? null,
        institution: record.source?.institution ?? null,
        tracked: false,
        originalUrl: currentUrl,
        ledgerCurrentUrl: null,
        currentUrl,
        status: "untracked",
        changes: [],
        proposedChange: null,
      });
      continue;
    }
    const status = entry.currentUrl === currentUrl ? "tracked" : "drift";
    rows.push({
      recordId: record.id,
      title: record.title ?? null,
      institution: record.source?.institution ?? null,
      tracked: true,
      originalUrl: entry.originalUrl ?? entry.currentUrl,
      ledgerCurrentUrl: entry.currentUrl,
      currentUrl,
      status,
      changes: entry.changes,
      proposedChange:
        status === "drift" ? proposedChange(entry, record, changedAt, DEFAULT_REASON, null) : null,
    });
  }

  const orphaned = [...entries.values()]
    .filter((entry) => !recordIds.has(entry.recordId))
    .map((entry) => ({
      recordId: entry.recordId,
      institution: entry.institution,
      originalUrl: entry.originalUrl,
      currentUrl: entry.currentUrl,
      changeCount: entry.changes.length,
    }));

  const drift = rows.filter((row) => row.status === "drift");
  const untracked = rows.filter((row) => row.status === "untracked");
  const withChanges = rows.filter((row) => row.changes.length > 0);

  return {
    schemaVersion: "1.0.0",
    generatedAt: changedAt,
    policy: {
      originalUrl: "İlk kaydedilen URL; değişikliklerden sonra da korunur.",
      currentUrl: "Arşiv kaydında şu anda kullanılan URL.",
      writePolicy: "Rapor varsayılan olarak defteri yazmaz; değişiklik kabulü açık komut gerektirir.",
    },
    summary: {
      totalRecords: rows.length,
      trackedRecords: rows.filter((row) => row.tracked).length,
      untrackedRecords: untracked.length,
      driftRecords: drift.length,
      orphanedEntries: orphaned.length,
      changedSourceRecords: withChanges.length,
      totalAcceptedChanges: withChanges.reduce((total, row) => total + row.changes.length, 0),
      originalPreservedRecords: withChanges.filter((row) => row.originalUrl && row.originalUrl !== row.currentUrl).length,
    },
    entries: rows,
    drift,
    untracked,
    orphaned,
    changedSources: withChanges,
  };
}

export function seedSourceHistory(history, records, { changedAt = null, author = DEFAULT_AUTHOR } = {}) {
  const next = cloneHistory(history);
  next.schemaVersion = next.schemaVersion ?? "1.0.0";
  next.policy =
    next.policy ??
    "Kaynak URL'si değiştiğinde eski URL silinmez; değişiklik kaydı bu dosyada tutulur.";
  const byRecordId = new Map((next.sources ?? []).map((entry) => [entry.recordId, normalizeEntry(entry)]));
  let added = 0;
  let existing = 0;
  for (const record of sortBy(records, (a, b) => String(a.id).localeCompare(String(b.id), "tr"))) {
    const currentUrl = record.source?.url ?? null;
    if (byRecordId.has(record.id)) {
      existing += 1;
      continue;
    }
    byRecordId.set(record.id, {
      recordId: record.id,
      institution: record.source?.institution ?? null,
      originalUrl: currentUrl,
      currentUrl,
      changes: [],
      lastSeenAt: changedAt,
    });
    added += 1;
  }
  next.sources = [...byRecordId.values()].sort((a, b) => a.recordId.localeCompare(b.recordId, "tr"));
  next.updatedAt = changedAt;
  next.seededBy = author;
  return { history: next, added, existing, updatedAt: changedAt };
}

export function acceptHistoryChanges(
  history,
  reconciliation,
  { changedAt = null, author = DEFAULT_AUTHOR, reason = null, evidence = null } = {}
) {
  const next = cloneHistory(history);
  next.schemaVersion = next.schemaVersion ?? "1.0.0";
  next.policy =
    next.policy ??
    "Kaynak URL'si değiştiğinde eski URL silinmez; değişiklik kaydı bu dosyada tutulur.";
  const byRecordId = new Map((next.sources ?? []).map((entry) => [entry.recordId, normalizeEntry(entry)]));
  let acceptedDrift = 0;
  let seededMissing = 0;

  for (const row of reconciliation.entries) {
    if (!row.tracked) {
      byRecordId.set(row.recordId, {
        recordId: row.recordId,
        institution: row.institution,
        originalUrl: row.currentUrl,
        currentUrl: row.currentUrl,
        changes: [],
        lastSeenAt: changedAt,
      });
      seededMissing += 1;
      continue;
    }
    if (row.status !== "drift") continue;
    const entry = byRecordId.get(row.recordId);
    if (!entry) continue;
    entry.changes = Array.isArray(entry.changes) ? entry.changes : [];
    entry.changes.push({
      changedAt,
      from: row.ledgerCurrentUrl,
      to: row.currentUrl,
      reason: reason ?? DEFAULT_REASON,
      evidence:
        evidence ??
        "Kaynak geçmişi defteri, arşiv kaydındaki güncel source.url ile açık kabul komutu kullanılarak güncellendi.",
      author,
    });
    entry.currentUrl = row.currentUrl;
    entry.institution = row.institution ?? entry.institution;
    entry.lastSeenAt = changedAt;
    acceptedDrift += 1;
  }

  next.sources = [...byRecordId.values()].sort((a, b) => a.recordId.localeCompare(b.recordId, "tr"));
  next.updatedAt = changedAt;
  next.updatedBy = author;
  return { history: next, acceptedDrift, seededMissing, updatedAt: changedAt };
}

export function createSeedChange({
  recordId,
  institution = null,
  from,
  to,
  changedAt,
  reason,
  evidence,
  author = DEFAULT_AUTHOR,
}) {
  return {
    recordId,
    institution: normalizeWhitespace(institution) || null,
    originalUrl: from,
    currentUrl: to,
    changes: [
      {
        changedAt,
        from,
        to,
        reason,
        evidence,
        author,
      },
    ],
    lastSeenAt: changedAt,
  };
}
