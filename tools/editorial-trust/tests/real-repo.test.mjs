import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { legacyRecordHash } from "../../../web/lib/editorial-trust/canonical.ts";
import { run } from "../cli.mjs";
import { CATALOG_DIRS, FORMS_DIR } from "../src/repo-reader.mjs";
import { buildTrustReport, gateDecision } from "../src/trust-report.mjs";
import { T0 } from "./helpers/fakes.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const jsonFiles = (dir) => readdirSync(path.join(repoRoot, dir)).filter((name) => name.endsWith(".json"));
const report = buildTrustReport(repoRoot, { now: T0 });

function dirDigest(dir) {
  const hash = createHash("sha256");
  for (const name of jsonFiles(dir).sort()) hash.update(name).update(readFileSync(path.join(repoRoot, dir, name)));
  return hash.digest("hex");
}

function python() {
  for (const cmd of ["python3", "python"]) if (spawnSync(cmd, ["--version"]).status === 0) return cmd;
  return null;
}

test("F81/F82 katalog ve form sayıları dinamik hesaplanır", () => {
  const expectedRecords = CATALOG_DIRS.reduce((sum, dir) => sum + jsonFiles(dir).length, 0);
  assert.equal(report.counts.catalog_record_files, expectedRecords);
  assert.equal(report.counts.review_form_files, jsonFiles(FORMS_DIR).length);
  assert.equal(report.meta.partial, false);
});

test("F-hash Node kanonik hash'i PR #15 Python formlarıyla birebir eşleşir", () => {
  const rows = report.rows.filter((row) => row.formFile);
  assert.ok(rows.length > 0);
  for (const row of rows) {
    const form = JSON.parse(readFileSync(path.join(repoRoot, row.formFile), "utf8"));
    const record = JSON.parse(readFileSync(path.join(repoRoot, row.file), "utf8"));
    if (row.reviewState !== "stale") assert.equal(form.record_snapshot_sha256, legacyRecordHash(record), row.recordId);
  }
});

test("F83/F84/F85 yetim form, eksik form ve stale gerçek dosyalardan bulunur (sabit id listesi yok)", (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), "mka-trust-real-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of [...CATALOG_DIRS, FORMS_DIR]) mkdirSync(path.join(root, dir), { recursive: true });
  const rows = report.rows.filter((row) => row.formFile).slice(0, 3);
  for (const row of rows) {
    copyFileSync(path.join(repoRoot, row.file), path.join(root, row.file));
    copyFileSync(path.join(repoRoot, row.formFile), path.join(root, row.formFile));
  }
  // 1: kaydı değiştir → stale; 2: formu sil → eksik; 3: kaydı sil → yetim form.
  const changed = JSON.parse(readFileSync(path.join(root, rows[0].file), "utf8"));
  changed.summary = `${changed.summary} [sentetik değişiklik]`;
  writeFileSync(path.join(root, rows[0].file), JSON.stringify(changed, null, 2));
  rmSync(path.join(root, rows[1].formFile));
  rmSync(path.join(root, rows[2].file));
  const fixture = buildTrustReport(root, { now: T0 });
  assert.equal(fixture.counts.stale, 1);
  assert.equal(fixture.counts.missing_forms, 1);
  assert.equal(fixture.counts.orphan_forms, 1);
  assert.equal(fixture.rows.find((row) => row.recordId === rows[0].recordId).reviewState, "stale");
});

test("F86/F96 teknik published kayıtlar insan onayı olmadan yayına hazır sayılmaz", () => {
  const withTech = buildTrustReport(repoRoot, { now: T0, technicalTestsPassed: true });
  const published = withTech.rows.filter((row) => row.technicalLabel === "published");
  assert.ok(published.length > 0);
  assert.equal(published.filter((row) => row.flags.release_ready).length, 0);
  assert.equal(withTech.counts.identity_verified_real_reviews, 0);
  assert.equal(withTech.counts.editor_approved_real_decisions, 0);
  assert.equal(gateDecision(withTech).release_ready, false);
  assert.equal(gateDecision(withTech).technical_tests_passed, true);
  assert.equal(run(["gate-check", "--root", repoRoot, "--technical-tests", "passed"], { stdout: () => {}, stderr: () => {} }), 1);
});

test("F87 PR #12 kapısı anlamını korur ve uyum eşlemesi çift sayım yapmaz", (t) => {
  const py = python();
  if (!py) return t.skip("python bulunamadı");
  const script = "import json,sys;sys.path.insert(0,'tools/release-check');from pathlib import Path;from publication_guard import validate_repository;r=validate_repository(Path('.'));print(json.dumps({'codes':[f['code'] for f in r['findings']],'paths':[f['path'] for f in r['findings']]}))";
  const result = spawnSync(py, ["-I", "-c", script], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0 && /ModuleNotFoundError/.test(result.stderr)) return t.skip("publication_guard içe aktarılamadı");
  assert.equal(result.status, 0, result.stderr);
  const guard = JSON.parse(result.stdout);
  const count = (code) => guard.codes.filter((c) => c === code).length;
  const ours = report.rows.filter((row) => row.technicalLabel === "published");
  // PR #12: her published kayıt için iki ayrı kritik bulgu. Bizde: aynı kayıtlar için iki ayrı kapı.
  assert.equal(count("published-without-human-review"), ours.filter((row) => row.findings.some((f) => f.code === "missing_historian_review")).length);
  assert.equal(count("unauthorized-published-record"), ours.filter((row) => row.findings.some((f) => f.code === "missing_editor_approval")).length);
  assert.ok(count("published-without-human-review") > 0, "PR #12 engeli kaldırılmamış olmalı");
});

test("F88 araç formları değiştirmez; PR #15 doğrulayıcısı hâlâ geçerli kabul eder", (t) => {
  const before = dirDigest(FORMS_DIR);
  const tmp = mkdtempSync(path.join(os.tmpdir(), "mka-trust-out-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  assert.equal(run(["audit", "--root", repoRoot, "--output", tmp, "--now", "2026-10-24T10:00:00Z"], { stdout: () => {}, stderr: () => {} }), 0);
  assert.equal(dirDigest(FORMS_DIR), before);
  const py = python();
  if (!py) return;
  const result = spawnSync(py, ["tools/editorial-review/editorial_review.py", "validate-forms", "--root", "."], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(dirDigest(FORMS_DIR), before);
});
