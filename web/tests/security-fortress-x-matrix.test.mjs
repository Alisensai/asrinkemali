import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// MKA FORTRESS X V1.1 — kontrol matrisinin kullanıcının özgün listesiyle birebir eşleşmesi:
// "Firewall" numarasız başlıktır; 99 madde numara ve adlarıyla korunur, durumlar geçerli,
// özet tutarlı, ek öneriler toplama karışmaz.
const docs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "security", "fortress-x-v11");
const matrix = readFileSync(path.join(docs, "CONTROL-MATRIX.md"), "utf8").replace(/\r\n/g, "\n");
const source = readFileSync(path.join(docs, "SOURCE-CONTROL-LIST.md"), "utf8").replace(/\r\n/g, "\n");
const STATUSES = ["IMPLEMENTED", "PARTIAL", "MISSING", "NOT_APPLICABLE", "REQUIRES_INFRASTRUCTURE"];
const COUNT = 99;

const sourceItems = [...source.matchAll(/^(\d+)\. (.+)$/gm)].map((m) => ({ id: Number(m[1]), name: m[2].trim() }));
const rows = [...matrix.matchAll(/^\| (\d+) \| ([^|]+) \| ([A-Z_]+) \| ([^|]+) \|$/gm)].map((m) => ({ id: Number(m[1]), name: m[2].trim(), status: m[3], evidence: m[4].trim() }));
const extras = [...matrix.matchAll(/^\| (E\d+) \| ([^|]+) \| ([A-Z_]+) \| ([^|]+) \|$/gm)].map((m) => ({ id: m[1], name: m[2].trim(), status: m[3] }));
const range = Array.from({ length: COUNT }, (_, i) => i + 1);

test("[FX-01] özgün liste 99 maddedir; 'Firewall' numarasız başlıktır ve madde sayılmaz", () => {
  assert.equal(sourceItems.length, COUNT);
  assert.deepEqual(sourceItems.map((s) => s.id), range);
  assert.match(source, /^Firewall$/m, "Firewall numarasız başlık olarak korunur");
  assert.ok(!sourceItems.some((s) => s.name === "Firewall"), "Firewall numaralı madde değildir");
  assert.equal(sourceItems[0].name, "Next-Generation Firewall (NGFW)");
  assert.match(sourceItems[COUNT - 1].name, /^PROJECT BLACKOUT/);
});

test("[FX-02] matris 1–99 arası her maddeyi tam bir kez ve özgün adıyla içerir (yalnız #99'un açıklaması gerekçeye taşınır)", () => {
  assert.deepEqual(rows.map((r) => r.id), range);
  for (const r of rows) assert.ok(STATUSES.includes(r.status), `#${r.id} ${r.status}`);
  for (const item of sourceItems) assert.equal(rows.find((r) => r.id === item.id).name, item.name.split(" — ")[0], `#${item.id}`);
});

test("[FX-03] özet tablosu satır sayımlarıyla tutarlıdır; ek öneriler toplama karışmaz", () => {
  let total = 0;
  for (const status of STATUSES) {
    const summary = matrix.match(new RegExp(`^\\| ${status} \\| (\\d+) \\|$`, "m"));
    assert.ok(summary, `özet satırı yok: ${status}`);
    assert.equal(Number(summary[1]), rows.filter((r) => r.status === status).length, status);
    total += Number(summary[1]);
  }
  assert.equal(total, COUNT);
  assert.match(matrix, new RegExp(`^\\| \\*\\*Toplam\\*\\* \\| \\*\\*${COUNT}\\*\\* \\|$`, "m"));
  for (const e of extras) assert.ok(STATUSES.includes(e.status), e.id);
});

test("[FX-04] her satırın gerekçesi var; uygulanmamış kritik kontroller dürüstçe işaretli; eski Firewall kanıtı korunur", () => {
  for (const r of rows) assert.ok(r.evidence.length >= 15, `#${r.id} gerekçesiz`);
  const status = (id) => rows.find((r) => r.id === id).status;
  assert.equal(status(99), "PARTIAL", "BLACKOUT bağlı olmadığı için IMPLEMENTED sayılmaz");
  assert.equal(status(74), "PARTIAL", "CSP report-only riski açık");
  // NGFW, WAF, Anti-DDoS, SIEM, SOC, IAM, Global CDN / Anycast
  for (const id of [1, 2, 5, 6, 9, 19, 28]) assert.equal(status(id), "REQUIRES_INFRASTRUCTURE", `#${id}`);
  assert.match(rows.find((r) => r.id === 99).evidence, /Veri imhası yok/);
  assert.equal(extras.find((e) => e.id === "E8").status, "MISSING", "main dal koruması yok");
  assert.match(extras.find((e) => e.id === "E13").name, /^Firewall/);
});
