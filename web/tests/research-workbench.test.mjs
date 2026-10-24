import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export default {};" };
    }
    return next(specifier, context);
  },
});

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const {
  loadWorkbench,
  workbenchEnabled,
  formatCsvCell,
  readStagingJson,
  CLAIM_STATUS_LABELS,
  VERIFICATION_LEVEL_LABELS,
} = await import("../lib/research-evidence/workbench.ts");

const {
  loadResearchPool,
  researchLabEnabled,
  candidateStateLabel,
} = await import("../lib/research-evidence/candidates.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..");

describe("Task 28: Perplexity Evidence Workbench 2.0 — Birim Testleri", () => {
  test("1. Production fail-closed kapısı (NODE_ENV=production durumunda daima kapalı)", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalFlag = process.env.MKA_RESEARCH_LAB;

    try {
      process.env.NODE_ENV = "production";
      process.env.MKA_RESEARCH_LAB = "1";

      assert.equal(
        researchLabEnabled(),
        false,
        "Production ortamında bayrak set edilse bile researchLabEnabled false dönmelidir."
      );
      assert.equal(
        workbenchEnabled(),
        false,
        "Production ortamında bayrak set edilse bile workbenchEnabled false dönmelidir."
      );

      // Staging JSON okuması da production modunda fail-closed davranmalıdır
      const prodClaims = readStagingJson(repoRoot, "claims-v2.json", (p) => p.claims);
      assert.deepEqual(prodClaims, [], "Production modunda staging verisi sızmamalı, boş dizi dönmelidir.");
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.MKA_RESEARCH_LAB = originalFlag;
    }
  });

  test("2. Geliştirme ortamında MKA_RESEARCH_LAB=1 bayrağı ile açılabilirlik", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalFlag = process.env.MKA_RESEARCH_LAB;

    try {
      process.env.NODE_ENV = "development";
      process.env.MKA_RESEARCH_LAB = "1";
      assert.equal(researchLabEnabled(), true);
      assert.equal(workbenchEnabled(), true);

      process.env.MKA_RESEARCH_LAB = "0";
      assert.equal(researchLabEnabled(), false);

      delete process.env.MKA_RESEARCH_LAB;
      assert.equal(researchLabEnabled(), false);
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.MKA_RESEARCH_LAB = originalFlag;
    }
  });

  test("3. Staging JSON okuma güvenliği (Path traversal ve var olmayan dosya koruması)", () => {
    // Path traversal atağı
    const traversal = readStagingJson(repoRoot, "../../package.json", (p) => [p]);
    assert.deepEqual(traversal, [], "Staging dizini dışına çıkışlar (path traversal) engellenmelidir.");

    // Var olmayan dosya
    const nonExistent = readStagingJson(repoRoot, "non-existent-file.json", (p) => [p]);
    assert.deepEqual(nonExistent, [], "Var olmayan dosya güvenle boş dizi dönmelidir.");
  });

  test("4. Staging verisi eksiksiz yüklenir ve şema sözleşmesine uyar", () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "development";
      const workbench = loadWorkbench();

      assert.ok(Array.isArray(workbench.claims), "claims dizi olmalıdır");
      assert.equal(workbench.claims.length, 10, "10 ClaimRecord v2 yüklenmelidir");

      assert.ok(Array.isArray(workbench.evidence), "evidence dizi olmalıdır");
      assert.ok(workbench.evidence.length >= 10, "Kanıt kayıtları yüklenmelidir");

      assert.ok(Array.isArray(workbench.audits), "audits dizi olmalıdır");
      assert.ok(workbench.audits.length >= 10, "Aday denetimleri yüklenmelidir");

      assert.ok(Array.isArray(workbench.notes), "notes dizi olmalıdır");
      assert.equal(workbench.notes.length, 4, "4 Araştırma notu yüklenmelidir");

      assert.ok(Array.isArray(workbench.contradictions), "contradictions dizi olmalıdır");
      assert.equal(workbench.contradictions.length, 2, "2 Çelişki adayı yüklenmelidir");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test("5. Aday havuzu (candidates pool) doğruluğu", () => {
    const { candidates } = loadResearchPool();
    assert.ok(Array.isArray(candidates));
    assert.equal(candidates.length, 32, "32 aday kaydı bulunmalıdır");

    // Tüm adayların başlık ve kurum bilgisi bulunmalıdır
    for (const c of candidates) {
      assert.ok(c.id, "Aday id içermelidir");
      assert.ok(c.title, "Aday title içermelidir");
      assert.ok(c.institution, "Aday institution içermelidir");
      assert.ok(["primary", "secondary", "unknown"].includes(c.sourceNature));
    }
  });

  test("6. İddia revizyon sürüm kontrolü (supersededAt ve stale kanıtlar)", () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "development";
      const workbench = loadWorkbench();
      const multiRevClaim = workbench.claims.find((c) => c.revisions.length > 1);

      assert.ok(multiRevClaim, "En az bir çoklu revizyonlu iddia bulunmalıdır");
      assert.equal(multiRevClaim.currentVersion, 2, "Güncel sürüm 2 olmalıdır");
      assert.equal(multiRevClaim.revisions[0].version, 1);
      assert.ok(multiRevClaim.revisions[0].supersededAt, "Eski sürüm supersededAt taşımalıdır");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test("7. CSV Formül Enjeksiyonu Koruması (formatCsvCell)", () => {
    // = + - @ ve boşluk ile başlayan hücreler ' ile öneklenmelidir
    assert.equal(formatCsvCell("=HYPERLINK('malicious')"), "'=HYPERLINK('malicious')");
    assert.equal(formatCsvCell("+SUM(1,2)"), "'+SUM(1,2)");
    assert.equal(formatCsvCell("-100"), "'-100");
    assert.equal(formatCsvCell("@cmd"), "'@cmd");
    assert.equal(formatCsvCell(" =test"), "' =test");

    // Normal metinler tek tırnak öneki almaz, çift tırnak içine alınır
    assert.equal(formatCsvCell("Normal Metin"), '"Normal Metin"');
    assert.equal(formatCsvCell('Tırnaklı "Metin"'), '"Tırnaklı ""Metin"""');
  });

  test("8. Kanıt desteği değerlendirmesi (direct_passage vs metadata_only)", () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "development";
      const workbench = loadWorkbench();

      const directPassageEvidence = workbench.evidence.filter(
        (e) => e.supportAssessment.method === "direct_passage"
      );
      assert.ok(directPassageEvidence.length > 0, "Doğrudan pasaj temelli kanıt bulunmalıdır");

      // Her kanıtın kısa alıntısı telif kuralı gereği 300 karakter civarında olmalıdır
      for (const e of workbench.evidence) {
        if (e.shortQuote) {
          assert.ok(
            e.shortQuote.length <= 350,
            `Kanıt ${e.id} kısa alıntısı telif limitine uymalıdır (${e.shortQuote.length} krk)`
          );
        }
      }
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test("9. 9-Boyutlu Veri Kalitesi Denetimleri (Telif izni 0 ve readyForImport varsayılan false)", () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "development";
      const workbench = loadWorkbench();

      for (const audit of workbench.audits) {
        assert.ok(audit.candidateId, "Denetim adayı tanımlı olmalıdır");
        assert.ok(typeof audit.scores === "object", "Skorlar nesne olmalıdır");
        // Telif izni netleşmemiş adaylarda copyrightClarity 0 olmalıdır
        assert.equal(audit.scores.copyrightClarity, 0, "Telif netliği 0 olmalıdır");
        // Hiçbir aday otomatik olarak insan incelemesiz içe aktarıma hazır olamaz
        assert.equal(audit.readyForImport, false, "readyForImport kesinlikle false kalmalıdır");
      }
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test("10. Durum ve Doğrulama Etiketleri sözleşmesi", () => {
    assert.equal(CLAIM_STATUS_LABELS.new, "Yeni");
    assert.equal(CLAIM_STATUS_LABELS.awaiting_human_review, "İnsan incelemesi bekliyor");
    assert.equal(VERIFICATION_LEVEL_LABELS.human_verified, "İnsan onaylı");
    assert.equal(VERIFICATION_LEVEL_LABELS.unverified, "Doğrulanmamış");
    assert.equal(candidateStateLabel("awaiting_human_review"), "İnsan incelemesi bekliyor");
    assert.equal(candidateStateLabel("new"), "Yeni aday");
  });
});
