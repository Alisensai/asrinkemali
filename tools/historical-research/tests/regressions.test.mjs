import test from "node:test";
import assert from "node:assert/strict";
import { importCandidatesFromJson, importCandidatesFromCsv, parseCsv } from "../lib/importers.mjs";
import { evaluateClaim } from "../lib/provenance.mjs";
import { convertAndValidate, convertCandidateToDraft } from "../lib/convert-dryrun.mjs";
import { validateExternalUrl } from "../lib/url-security.mjs";
import { loadArchive, REPO_ROOT } from "../lib/archive-reader.mjs";
import { makeCandidate, makeArchiveRecord } from "./helpers.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

/**
 * Rev.3 regresyon testleri — danışmanın ikinci tur bulguları.
 */

test("içe aktarma: dışarıdan gelen onay bayrakları SIFIRLANIR", () => {
  const sneaky = makeCandidate({
    state: "import_ready",
    verification: { urlReachable: true, citationComplete: true, rightsKnown: true, duplicateChecked: true, aiReviewed: true, humanReviewed: true, notes: "sahte onay" },
  });
  const result = importCandidatesFromJson(JSON.stringify({ candidates: [sneaky] }));
  assert.equal(result.candidates.length, 1);
  const imported = result.candidates[0];
  assert.equal(imported.state, "new", "dışarıdan gelen state korunamaz");
  assert.equal(imported.verification.humanReviewed, false, "humanReviewed sıfırlanmalı");
  assert.equal(imported.verification.urlReachable, false, "urlReachable sıfırlanmalı");
});

test("içe aktarma: JSON null güvenli şekilde reddedilir (exception yok)", () => {
  const result = importCandidatesFromJson("null");
  assert.equal(result.candidates.length, 0);
  assert.ok(result.issues.some((issue) => issue.code === "NO_CANDIDATES"));
  const result2 = importCandidatesFromJson(JSON.stringify({ meta: {} }));
  assert.ok(result2.issues.some((issue) => issue.code === "NO_CANDIDATES"));
});

test("CSV: kapanmamış son tırnak reddedilir", () => {
  const header = "id,title,institution,institutionType,institutionUrl,url,authors,publishedAt,eventYear,periodStart,periodEnd,documentType,sourceNature,researchThemes,accessedAt,archiveIdentifier,citation,synthetic";
  const csv = header + "\n" + 'src-2026-0001,"Kapanmayan tırnak,Kurum,institutional,https://k.gov.tr,https://k.gov.tr/a,,2020,,,,article,secondary,,2026-10-23,,künye,false';
  const result = importCandidatesFromCsv(csv);
  assert.equal(result.candidates.length, 0);
  assert.ok(result.issues.some((issue) => issue.message.includes("Kapanmamış tırnak")), JSON.stringify(result.issues));
});

test("CSV: geçersiz yıl değeri satırı reddeder (sessizce null'e düşmez)", () => {
  const header = "id,title,institution,institutionType,institutionUrl,url,authors,publishedAt,eventYear,periodStart,periodEnd,documentType,sourceNature,researchThemes,accessedAt,archiveIdentifier,citation,synthetic";
  const csv = header + "\n" + "src-2026-0001,Başlık,Kurum,institutional,https://k.gov.tr,https://k.gov.tr/a,,2020,19ab,,,article,secondary,,2026-10-23,,künye,false";
  const result = importCandidatesFromCsv(csv);
  assert.equal(result.candidates.length, 0);
  assert.ok(result.issues.some((issue) => issue.code === "INVALID_ROW" && issue.message.includes("Geçersiz yıl")));
});

test("kanıt: 'partial' destek tek başına corroborated üretmez", () => {
  const candidates = [
    makeCandidate({ id: "src-2026-0001", institution: "Kurum A", archiveIdentifier: "A-1", title: "Kaynak A" }),
    makeCandidate({ id: "src-2026-0002", institution: "Kurum B", archiveIdentifier: "B-1", title: "Kaynak B", url: "https://b.gov.tr/x" }),
  ];
  const claim = {
    id: "claim-x",
    text: "Kısmi destek testi",
    date: { start: "1912", end: null, precision: "year", certainty: "estimated", display: "1912" },
    evidence: [
      { candidateId: "src-2026-0001", relation: "supports" },
      { candidateId: "src-2026-0002", relation: "partial" },
    ],
  };
  const evaluation = evaluateClaim(claim, candidates);
  assert.equal(evaluation.status, "unverified", "1 tam destek + 1 kısmi destek doğrulanmış iddia üretmez");
});

test("URL: IPv4-eşlenmiş onaltılık IPv6 özel adresi reddedilir", () => {
  const result = validateExternalUrl("http://[::ffff:7f00:1]/panel");
  assert.equal(result.ok, false, "::ffff:7f00:1 = 127.0.0.1 olarak reddedilmeli");
  assert.ok(result.errors.some((error) => error.code === "PRIVATE_IP" || error.code === "META_HOST"));
  const dotted = validateExternalUrl("http://[::ffff:10.0.0.1]/dahili");
  assert.equal(dotted.ok, false, "::ffff:10.0.0.1 reddedilmeli");
});

test("convertAndValidate: izin verilmeyen alan adı şema doğrulamasında reddedilir", async () => {
  const archive = await loadArchive(REPO_ROOT);
  const approved = makeCandidate({
    id: "src-2026-9002",
    url: "https://ornek.gov.tr/deneme", // kurumsal beyaz liste DIŞI
    archiveIdentifier: "AYK-9002",
    state: "import_ready",
    verification: { urlReachable: true, citationComplete: true, rightsKnown: true, duplicateChecked: true, aiReviewed: true, humanReviewed: true, notes: "" },
  });
  const context = { taxonomy: archive.taxonomy, recordSchema: archive.recordSchema, taxonomySchema: archive.taxonomySchema, root: REPO_ROOT };
  const result = await convertAndValidate(approved, [], context);
  // Dönüşüm başarılı olsa bile GERÇEK doğrulayıcı reddetmeli
  assert.equal(result.outcome, "invalid", "beyaz liste dışı URL doğrulamayı geçemez");
  assert.ok(result.blockers.some((blocker) => blocker.code.startsWith("VALIDATION_")), JSON.stringify(result.blockers));
});

test("convertAndValidate: yıl-kesinlikli ATAM adayı gerçek şemadan geçer", async () => {
  const archive = await loadArchive(REPO_ROOT);
  const approved = makeCandidate({
    id: "src-2026-9003",
    url: "https://atam.gov.tr/kitaplar/test-kitabi/",
    institution: "Atatürk Araştırma Merkezi (ATAM)",
    archiveIdentifier: null,
    publishedAt: "2008", // yıl-kesinlik (ay/gün yok)
    state: "import_ready",
    verification: { urlReachable: true, citationComplete: true, rightsKnown: true, duplicateChecked: true, aiReviewed: true, humanReviewed: true, notes: "" },
  });
  const context = { taxonomy: archive.taxonomy, recordSchema: archive.recordSchema, taxonomySchema: archive.taxonomySchema, root: REPO_ROOT };
  const result = await convertAndValidate(approved, [], context);
  assert.equal(result.outcome, "ok", `yıl-kesinlikli ATAM adayı geçmeli: ${JSON.stringify(result.blockers)}`);
  assert.equal(result.record.verification.status, "draft");
});

test("gerçek yükleyici sınırı: 500+ kayıt dosyası hata üretir (belgelenmiş sınır)", async () => {
  // Geçici depo kökü: şema + taksonomi + 600 kayıt dosyası
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mka-loader-"));
  try {
    await fs.mkdir(path.join(tempRoot, "schemas"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, "content", "archive", "records"), { recursive: true });
    for (const file of ["archive-record.schema.json", "archive-taxonomy.schema.json"]) {
      await fs.copyFile(path.join(REPO_ROOT, "schemas", file), path.join(tempRoot, "schemas", file));
    }
    await fs.copyFile(path.join(REPO_ROOT, "content", "archive", "taxonomy.json"), path.join(tempRoot, "content", "archive", "taxonomy.json"));
    for (let i = 0; i < 600; i += 1) {
      const record = makeArchiveRecord({
        id: `loader-test-${i}`,
        slug: `loader-test-${i}`,
        source: { ...makeArchiveRecord().source, url: `https://www.ataturkansiklopedisi.gov.tr/detay/${i}/test`, archiveIdentifier: `AYK-${i}` },
      });
      await fs.writeFile(path.join(tempRoot, "content", "archive", "records", `loader-test-${i}.json`), JSON.stringify(record), "utf8");
    }
    const archive = await loadArchive(tempRoot);
    // OpenCode'un güvenlik modülü MAX_RECORDS=500 sınırını uygular: 600 kayıt hata üretir.
    assert.ok(
      archive.errors.some((error) => error.includes("sınırını aşıyor")),
      `500 kayıt sınırı hatası beklenirdi: ${JSON.stringify(archive.errors.slice(0, 3))}`
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("dry-run yürütme yolu (CLI) gerçek doğrulayıcıyı kullanır: senkron çağrı tek başına yeterli değildir", async () => {
  // Bu test, API sözleşmesini belgeler: CLI dry-run komutu convertAndValidate
  // kullanır; doğrudan convertCandidateToDraft çağıranlar şema doğrulamasını
  // atlamış olur. Senkron sürüm yalnızca iç adımdır.
  const approved = makeCandidate({
    id: "src-2026-9004",
    url: "https://ornek.gov.tr/deneme",
    state: "import_ready",
    verification: { urlReachable: true, citationComplete: true, rightsKnown: true, duplicateChecked: true, aiReviewed: true, humanReviewed: true, notes: "" },
  });
  const sync = convertCandidateToDraft(approved, []);
  assert.equal(sync.outcome, "ok", "senkron dönüşüm iç adım olarak üretir");
  // ...ama yürütme yolu (convertAndValidate) bunu doğrulayıcıdan geçirir;
  // bkz. önceki test: beyaz liste dışı URL orada reddedilir.
});
