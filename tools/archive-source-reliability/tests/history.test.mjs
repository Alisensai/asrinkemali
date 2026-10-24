import test from "node:test";
import assert from "node:assert/strict";

import {
  acceptHistoryChanges,
  createSeedChange,
  reconcileSourceHistory,
  seedSourceHistory,
} from "../src/history.mjs";
import { makeRecord } from "./fixtures.mjs";

function record(id, url, institution = "Türkiye Büyük Millet Meclisi") {
  return makeRecord({
    id,
    source: { url, institution, archiveIdentifier: `${id}-ID` },
    provenance: [
      {
        institution,
        collection: "Test",
        identifier: `${id}-ID`,
        url,
        accessedAt: "2026-10-23",
        note: "Test.",
      },
    ],
  });
}

function entry(recordId, originalUrl, currentUrl, changes = []) {
  return {
    recordId,
    institution: "Türkiye Büyük Millet Meclisi",
    originalUrl,
    currentUrl,
    changes,
    lastSeenAt: "2026-10-23",
  };
}

test("izlenen, sapan, izlenmeyen ve yetim kayıtları ayırır", () => {
  const records = [
    record("tracked", "https://www.tbmm.gov.tr/a"),
    record("drift", "https://www.tbmm.gov.tr/c"),
    record("untracked", "https://www.tbmm.gov.tr/d"),
  ];
  const history = {
    schemaVersion: "1.0.0",
    sources: [
      entry("tracked", "https://www.tbmm.gov.tr/a", "https://www.tbmm.gov.tr/a"),
      entry("drift", "https://www.tbmm.gov.tr/b", "https://www.tbmm.gov.tr/b"),
      entry("orphan", "https://www.tbmm.gov.tr/x", "https://www.tbmm.gov.tr/x"),
    ],
  };
  const result = reconcileSourceHistory(records, history, { changedAt: "2026-10-23" });
  assert.equal(result.summary.totalRecords, 3);
  assert.equal(result.summary.trackedRecords, 2);
  assert.equal(result.summary.untrackedRecords, 1);
  assert.equal(result.summary.driftRecords, 1);
  assert.equal(result.summary.orphanedEntries, 1);
  assert.equal(result.drift[0].recordId, "drift");
  assert.equal(result.drift[0].ledgerCurrentUrl, "https://www.tbmm.gov.tr/b");
  assert.equal(result.drift[0].currentUrl, "https://www.tbmm.gov.tr/c");
  assert.equal(result.drift[0].proposedChange.from, "https://www.tbmm.gov.tr/b");
  assert.equal(result.drift[0].proposedChange.to, "https://www.tbmm.gov.tr/c");
  assert.equal(result.untracked[0].recordId, "untracked");
  assert.equal(result.orphaned[0].recordId, "orphan");
});

test("defter tohumlama yalnızca eksik kayıtları ekler", () => {
  const records = [record("a", "https://www.tbmm.gov.tr/a"), record("b", "https://www.tbmm.gov.tr/b")];
  const history = {
    schemaVersion: "1.0.0",
    sources: [entry("a", "https://www.tbmm.gov.tr/eski", "https://www.tbmm.gov.tr/eski", [
      { changedAt: "2026-01-01", from: "https://www.tbmm.gov.tr/eski", to: "https://www.tbmm.gov.tr/a", reason: "Eski değişiklik", evidence: "Test", author: "Test" },
    ])],
  };
  const result = seedSourceHistory(history, records, { changedAt: "2026-10-23", author: "Test" });
  assert.equal(result.added, 1);
  assert.equal(result.existing, 1);
  assert.equal(result.history.sources.length, 2);
  const a = result.history.sources.find((item) => item.recordId === "a");
  assert.equal(a.originalUrl, "https://www.tbmm.gov.tr/eski");
  assert.equal(a.changes.length, 1);
  const b = result.history.sources.find((item) => item.recordId === "b");
  assert.equal(b.originalUrl, "https://www.tbmm.gov.tr/b");
  assert.equal(b.changes.length, 0);
});

test("değişiklik kabulü özgün URL'yi korur ve değişiklik ekler", () => {
  const records = [record("a", "https://www.tbmm.gov.tr/a"), record("b", "https://www.tbmm.gov.tr/c"), record("c", "https://www.tbmm.gov.tr/d")];
  const history = {
    schemaVersion: "1.0.0",
    sources: [
      entry("a", "https://www.tbmm.gov.tr/a", "https://www.tbmm.gov.tr/a"),
      entry("b", "https://www.tbmm.gov.tr/b", "https://www.tbmm.gov.tr/b"),
    ],
  };
  const before = JSON.parse(JSON.stringify(history));
  const reconciliation = reconcileSourceHistory(records, history, { changedAt: "2026-10-23" });
  const result = acceptHistoryChanges(history, reconciliation, {
    changedAt: "2026-10-23",
    author: "Uzman",
    reason: "Kaynak taşındı.",
    evidence: "Yeni URL doğrulandı.",
  });
  const b = result.history.sources.find((item) => item.recordId === "b");
  assert.equal(b.originalUrl, "https://www.tbmm.gov.tr/b");
  assert.equal(b.currentUrl, "https://www.tbmm.gov.tr/c");
  assert.equal(b.changes.length, 1);
  assert.equal(b.changes[0].from, "https://www.tbmm.gov.tr/b");
  assert.equal(b.changes[0].to, "https://www.tbmm.gov.tr/c");
  assert.equal(b.changes[0].author, "Uzman");
  assert.equal(b.changes[0].reason, "Kaynak taşındı.");
  const c = result.history.sources.find((item) => item.recordId === "c");
  assert.ok(c);
  assert.equal(c.originalUrl, "https://www.tbmm.gov.tr/d");
  assert.equal(result.acceptedDrift, 1);
  assert.equal(result.seededMissing, 1);
  assert.deepEqual(history, before, "girdi defteri değiştirilmemeli");
});

test("createSeedChange özgün ve güncel URL'yi birlikte kaydeder", () => {
  const change = createSeedChange({
    recordId: "x",
    institution: "TBMM",
    from: "https://www.tbmm.gov.tr/eski",
    to: "https://www.tbmm.gov.tr/yeni",
    changedAt: "2026-10-23",
    reason: "Taşındı.",
    evidence: "Kontrol edildi.",
    author: "Test",
  });
  assert.equal(change.originalUrl, "https://www.tbmm.gov.tr/eski");
  assert.equal(change.currentUrl, "https://www.tbmm.gov.tr/yeni");
  assert.equal(change.changes.length, 1);
  assert.equal(change.changes[0].from, change.originalUrl);
  assert.equal(change.changes[0].to, change.currentUrl);
});

test("boş defterde tüm kayıtlar izlenmeyen olarak raporlanır", () => {
  const records = [record("a", "https://www.tbmm.gov.tr/a")];
  const result = reconcileSourceHistory(records, { schemaVersion: "1.0.0", sources: [] });
  assert.equal(result.summary.untrackedRecords, 1);
  assert.equal(result.summary.trackedRecords, 0);
  assert.equal(result.untracked[0].status, "untracked");
  assert.equal(result.untracked[0].proposedChange, null);
});
