import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// MKA FORTRESS X V1.1 — 99 kontrollük matrisin bütünlüğü: numaralar eksiksiz, durumlar geçerli,
// özet tablosu satırlarla tutarlı ve "uygulandı" iddiası kanıtsız değil.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const matrix = readFileSync(path.join(repoRoot, "docs", "security", "fortress-x-v11", "CONTROL-MATRIX.md"), "utf8");
const STATUSES = ["IMPLEMENTED", "PARTIAL", "MISSING", "NOT_APPLICABLE", "REQUIRES_INFRASTRUCTURE"];
const rows = [...matrix.matchAll(/^\| (\d+) \| ([^|]+) \| ([A-Z_]+) \| ([^|]+) \|$/gm)].map((m) => ({ id: Number(m[1]), name: m[2].trim(), status: m[3], evidence: m[4].trim() }));

test("[FX-01] matris 1–99 arası her kontrolü tam bir kez içerir ve durumlar geçerlidir", () => {
  assert.equal(rows.length, 99);
  assert.deepEqual(rows.map((r) => r.id), Array.from({ length: 99 }, (_, i) => i + 1));
  for (const r of rows) assert.ok(STATUSES.includes(r.status), `#${r.id} ${r.status}`);
});

test("[FX-02] özet tablosu satır sayımlarıyla tutarlıdır", () => {
  for (const status of STATUSES) {
    const summary = matrix.match(new RegExp(`^\\| ${status} \\| (\\d+) \\|$`, "m"));
    assert.ok(summary, `özet satırı yok: ${status}`);
    assert.equal(Number(summary[1]), rows.filter((r) => r.status === status).length, status);
  }
});

test("[FX-03] her satırın gerekçesi var; BLACKOUT ve 'main korumasız' bulgusu dürüstçe işaretli", () => {
  for (const r of rows) assert.ok(r.evidence.length >= 10, `#${r.id} gerekçesiz`);
  assert.equal(rows.find((r) => r.id === 99).status, "PARTIAL", "BLACKOUT bağlı olmadığı için IMPLEMENTED sayılmaz");
  assert.equal(rows.find((r) => r.id === 69).status, "MISSING");
  for (const id of [1, 3, 6, 23, 29, 37]) assert.equal(rows.find((r) => r.id === id).status, "REQUIRES_INFRASTRUCTURE", `#${id}`);
});
