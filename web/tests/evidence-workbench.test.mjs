import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webRoot, "..");
const stagingDir = path.join(repoRoot, "data", "research", "evidence-staging");

test("Task 08 Workbench: workbench.ts ve candidates.ts server-only ile korunmalıdır", () => {
  const workbenchSrc = readFileSync(path.join(webRoot, "lib/research-evidence/workbench.ts"), "utf8");
  const candidatesSrc = readFileSync(path.join(webRoot, "lib/research-evidence/candidates.ts"), "utf8");

  assert.match(workbenchSrc, /^import "server-only";/m, "workbench.ts server-only içermelidir");
  assert.match(candidatesSrc, /^import "server-only";/m, "candidates.ts server-only içermelidir");
});

test("Task 08 Workbench: üretim kapısı kuralı NODE_ENV=production iken fail-closed kapalıdır", () => {
  const candidatesSrc = readFileSync(path.join(webRoot, "lib/research-evidence/candidates.ts"), "utf8");
  assert.match(
    candidatesSrc,
    /if \(process\.env\.NODE_ENV === "production"\)\s*return false;/,
    "Production ortamında laboratuvar her zaman 404 / false olmalıdır"
  );
  assert.match(
    candidatesSrc,
    /return process\.env\.MKA_RESEARCH_LAB === "1";/,
    "MKA_RESEARCH_LAB=1 olmadan geliştirme ortamında da açılamaz"
  );
});

test("Task 08 Workbench: staging verileri 10 iddia ve 32 denetimi eksiksiz içerir", () => {
  assert.ok(existsSync(stagingDir), "evidence-staging dizini mevcut olmalıdır");

  const claimsPath = path.join(stagingDir, "claims-v2.json");
  const evidencePath = path.join(stagingDir, "evidence.json");
  const auditsPath = path.join(stagingDir, "candidate-audits.json");
  const contradictionsPath = path.join(stagingDir, "contradictions.json");
  const notesPath = path.join(stagingDir, "notes.json");

  assert.ok(existsSync(claimsPath), "claims-v2.json bulunmalıdır");
  assert.ok(existsSync(evidencePath), "evidence.json bulunmalıdır");
  assert.ok(existsSync(auditsPath), "candidate-audits.json bulunmalıdır");
  assert.ok(existsSync(contradictionsPath), "contradictions.json bulunmalıdır");
  assert.ok(existsSync(notesPath), "notes.json bulunmalıdır");

  const claimsData = JSON.parse(readFileSync(claimsPath, "utf8"));
  const evidenceData = JSON.parse(readFileSync(evidencePath, "utf8"));
  const auditsData = JSON.parse(readFileSync(auditsPath, "utf8"));

  // 10 iddia
  const claims = claimsData.claims || [];
  assert.equal(claims.length, 10, "Tam olarak 10 tarihî iddia bulunmalıdır");

  for (const c of claims) {
    assert.notEqual(c.status, "approved", `İddia ${c.id} otomatik onaylanmış olamaz`);
    assert.ok(c.currentVersion >= 1, `İddia ${c.id} sürüm numarası taşımalıdır`);
    assert.ok(Array.isArray(c.revisions), `İddia ${c.id} revizyon geçmişi taşımalıdır`);
  }

  // 32 denetim
  const audits = auditsData.audits || [];
  assert.equal(audits.length, 32, "Tam olarak 32 aday denetimi bulunmalıdır");

  for (const a of audits) {
    assert.equal(a.readyForImport, false, `Aday ${a.candidateId} otomatik import-ready olamaz`);
  }

  // Kanıtlar ve alıntı sınırı (en fazla 300 karakter)
  const evidence = evidenceData.evidence || [];
  assert.ok(evidence.length >= 10, "En az 10 kanıt nesnesi bulunmalıdır");

  for (const ev of evidence) {
    if (ev.shortQuote) {
      assert.ok(
        ev.shortQuote.length <= 300,
        `Kanıt ${ev.id} alıntısı 300 karakteri aşamaz (uzunluk: ${ev.shortQuote.length})`
      );
    }
  }
});

test("Task 08 Workbench: CSV dışa aktarımı formül enjeksiyonuna karşı korumalıdır", () => {
  const exportRouteSrc = readFileSync(path.join(webRoot, "app/api/arastirma-laboratuvari/export/route.ts"), "utf8");
  // V0.9 güvenlik denetimi: csvCell ortak modüle taşındı (önekli hücre artık tırnaklanıyor).
  assert.match(exportRouteSrc, /import \{ csvCell \} from "@\/lib\/research-evidence\/csv";/);
  const csvSrc = readFileSync(path.join(webRoot, "lib/research-evidence/csv.ts"), "utf8");
  assert.match(csvSrc, /\/\^\[=\+\\-@\\t\\r\\n\]\//, "CSV formül başlatıcıları kontrol edilmelidir");
  assert.match(csvSrc, /text = `'\$\{text\}`/, "Zararlı hücreler tek tırnak önekiyle kaçışlanmalıdır");
});

test("V0.9: önekli CSV hücresi tırnaklanır; gömülü virgül satırı bölmez", async () => {
  const { csvCell } = await import("../lib/research-evidence/csv.ts");
  const row = ["a", "=SUM(1,2)", "b"].map(csvCell).join(",");
  assert.equal(row.match(/"(?:[^"]|"")*"/g).length, 3);
});
