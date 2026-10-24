#!/usr/bin/env node
/**
 * Kaynak geçmişi defterini tohumlar.
 *
 * Varsayılan olarak tüm arşiv kayıtlarını güncel URL'leriyle deftere ekler ve
 * `data/source-history-seed.json` içindeki bilinen v06 URL değişikliklerini
 * uygular. Yalnızca araç veri dosyasını yazar; arşiv kayıtlarına dokunmaz.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_PATHS, REPO_ROOT, loadArchiveContext } from "../src/archive-context.mjs";
import { createSeedChange, seedSourceHistory } from "../src/history.mjs";
import { readJson, writeJson } from "../src/io.mjs";

const SCRIPT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(SCRIPT_ROOT, "..", "data", "source-history-seed.json");

const seed = await readJson(SEED_FILE);
if (!seed) throw new Error(`Tohum dosyası bulunamadı: ${SEED_FILE}`);
const context = await loadArchiveContext({ root: REPO_ROOT });
const byId = new Map(context.records.map((record) => [record.id, record]));

const seeded = seedSourceHistory(
  { schemaVersion: "1.0.0", policy: seed.reason, sources: [] },
  context.records,
  { changedAt: seed.changedAt, author: seed.author }
);
const entries = new Map(seeded.history.sources.map((entry) => [entry.recordId, entry]));
let applied = 0;
for (const change of seed.changes ?? []) {
  const record = byId.get(change.recordId);
  if (!record) throw new Error(`Tohum değişikliğindeki kayıt arşivde yok: ${change.recordId}`);
  if (record.source?.url !== change.to) {
    throw new Error(
      `Kayıt ${change.recordId} için arşivdeki güncel URL tohumla eşleşmiyor.\n` +
        `  arşiv: ${record.source?.url}\n  tohum: ${change.to}`
    );
  }
  entries.set(
    change.recordId,
    createSeedChange({
      recordId: change.recordId,
      institution: change.institution ?? record.source?.institution,
      from: change.from,
      to: change.to,
      changedAt: seed.changedAt,
      reason: change.reason ?? seed.reason,
      evidence: change.evidence ?? seed.evidence,
      author: seed.author,
    })
  );
  applied += 1;
}

const history = {
  schemaVersion: "1.0.0",
  description:
    "Kaynak URL değişiklik defteri. Özgün URL'ler korunur; değişiklikler açık kabul komutuyla eklenir. Rapor varsayılan olarak bu dosyayı yazmaz.",
  policy:
    "Kaynak URL'si değiştiğinde eski URL silinmez; değişiklik kaydı bu dosyada tutulur. Arşiv kaydındaki URL, bu defterdeki currentUrl ile karşılaştırılır.",
  updatedAt: seed.changedAt,
  seededAt: seed.changedAt,
  seededBy: seed.author,
  seedFile: "data/source-history-seed.json",
  sources: [...entries.values()].sort((a, b) => a.recordId.localeCompare(b.recordId, "tr")),
};

await writeJson(DEFAULT_PATHS.sourceHistory, history);
console.log(
  `Kaynak geçmişi defteri yazıldı: ${DEFAULT_PATHS.sourceHistory}\n` +
    `  Kayıt: ${history.sources.length}\n` +
    `  Bilinen değişiklik uygulanan kayıt: ${applied}\n` +
    `  Özgün URL'si farklı kayıt: ${history.sources.filter((entry) => entry.originalUrl !== entry.currentUrl).length}`
);
