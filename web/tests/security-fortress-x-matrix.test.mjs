import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// MKA FORTRESS X V1.1 — kontrol matrisinin kullanıcının özgün listesiyle birebir eşleşmesi:
// numaralar ve adlar korunur, durumlar geçerli, özet tutarlı, ek öneriler toplama karışmaz.
const docs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "security", "fortress-x-v11");
const matrix = readFileSync(path.join(docs, "CONTROL-MATRIX.md"), "utf8").replace(/\r\n/g, "\n");
const source = readFileSync(path.join(docs, "SOURCE-CONTROL-LIST.md"), "utf8").replace(/\r\n/g, "\n");
const STATUSES = ["IMPLEMENTED", "PARTIAL", "MISSING", "NOT_APPLICABLE", "REQUIRES_INFRASTRUCTURE"];

const sourceItems = [...source.matchAll(/^(\d+)\. (.+)$/gm)].map((m) => ({ id: Number(m[1]), name: m[2].trim() }));
const rows = [...matrix.matchAll(/^\| (\d+) \| ([^|]+) \| ([A-Z_]+) \| ([^|]+) \|$/gm)].map((m) => ({ id: Number(m[1]), name: m[2].trim(), status: m[3], evidence: m[4].trim() }));
const extras = [...matrix.matchAll(/^\| (E\d+) \| ([^|]+) \| ([A-Z_]+) \| ([^|]+) \|$/gm)].map((m) => ({ id: m[1], status: m[3] }));

test("[FX-01] özgün liste 100 maddedir ve matris 1–100 arası her maddeyi tam bir kez içerir", () => {
  assert.equal(sourceItems.length, 100);
  assert.deepEqual(sourceItems.map((s) => s.id), Array.from({ length: 100 }, (_, i) => i + 1));
  assert.deepEqual(rows.map((r) => r.id), Array.from({ length: 100 }, (_, i) => i + 1));
  for (const r of rows) assert.ok(STATUSES.includes(r.status), `#${r.id} ${r.status}`);
});

test("[FX-02] madde adları özgün listeyle birebir aynıdır (yalnız #100'ün açıklaması gerekçeye taşınır)", () => {
  for (const item of sourceItems) {
    const expected = item.name.split(" — ")[0];
    assert.equal(rows.find((r) => r.id === item.id).name, expected, `#${item.id}`);
  }
});

test("[FX-03] özet tablosu satır sayımlarıyla tutarlıdır; ek öneriler toplama karışmaz", () => {
  let total = 0;
  for (const status of STATUSES) {
    const summary = matrix.match(new RegExp(`^\\| ${status} \\| (\\d+) \\|$`, "m"));
    assert.ok(summary, `özet satırı yok: ${status}`);
    assert.equal(Number(summary[1]), rows.filter((r) => r.status === status).length, status);
    total += Number(summary[1]);
  }
  assert.equal(total, 100);
  assert.ok(extras.length > 0, "ek öneriler ayrı bölümde");
  for (const e of extras) assert.ok(STATUSES.includes(e.status), e.id);
});

test("[FX-04] her satırın gerekçesi var; uygulanmamış kritik kontroller dürüstçe işaretli", () => {
  for (const r of rows) assert.ok(r.evidence.length >= 15, `#${r.id} gerekçesiz`);
  const status = (id) => rows.find((r) => r.id === id).status;
  assert.equal(status(100), "PARTIAL", "BLACKOUT bağlı olmadığı için IMPLEMENTED sayılmaz");
  assert.equal(status(75), "PARTIAL", "CSP report-only riski açık");
  for (const id of [1, 3, 6, 7, 10, 20, 29]) assert.equal(status(id), "REQUIRES_INFRASTRUCTURE", `#${id}`);
  assert.equal(extras.find((e) => e.id === "E8").status, "MISSING", "main dal koruması yok");
  assert.match(rows.find((r) => r.id === 100).evidence, /Veri imhası yok/);
});
