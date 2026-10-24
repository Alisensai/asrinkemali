import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { simulateMigration } from "../src/dry-run-migration.mjs";

test("security - simulateMigration diske asla yazmaz", () => {
  const dummy = [
    {
      id: "sec-rec-1",
      people: [{ name: "Mustafa Kemal Paşa" }],
      locations: [{ name: "Ankara" }],
      source: { institution: "TBMM" },
    },
  ];

  const result = simulateMigration(dummy);
  assert.equal(result.isDryRun, true);
  assert.equal(result.diskWritesAttempted, 0);
  assert.equal(result.totalRecordsAnalyzed, 1);
  assert.equal(result.totalPeopleMapped, 1);
  assert.equal(result.totalLocationsMapped, 1);
  assert.equal(result.totalInstitutionsMapped, 1);
});

test("security - arşiv dizinlerine yazma denemesi engellenir", () => {
  function assertSafePath(targetPath) {
    const resolved = path.resolve(targetPath);
    const forbiddenDirs = [
      path.resolve("data", "archive"),
      path.resolve("content", "archive"),
      path.resolve(".git"),
    ];
    for (const f of forbiddenDirs) {
      if (resolved === f || resolved.startsWith(f + path.sep)) {
        throw new Error(`GÜVENLİK ENGELİ: Bu dizine yazma izni yoktur: ${resolved}`);
      }
    }
    return resolved;
  }

  assert.throws(() => {
    assertSafePath("data/archive/catalog/evil.json");
  }, /GÜVENLİK ENGELİ/);

  assert.throws(() => {
    assertSafePath("content/archive/records/evil.json");
  }, /GÜVENLİK ENGELİ/);

  assert.throws(() => {
    assertSafePath(".git/config");
  }, /GÜVENLİK ENGELİ/);

  // Güvenli dizine izin verilir
  const safe = assertSafePath("tools/archive-authority-registry/data/test.json");
  assert.ok(safe);
});
