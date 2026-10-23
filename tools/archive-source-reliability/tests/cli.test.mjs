import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { REPO_ROOT, TOOL_ROOT } from "../src/archive-context.mjs";

const execFileAsync = promisify(execFile);
const ARCHIVE_DIRS = [
  path.join(REPO_ROOT, "data", "archive"),
  path.join(REPO_ROOT, "content", "archive"),
];

async function runCliRaw(args) {
  try {
    const result = await execFileAsync(process.execPath, ["src/cli.mjs", ...args], {
      cwd: TOOL_ROOT,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      timeout: 120_000,
      windowsHide: true,
    });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      code: typeof error.code === "number" ? error.code : 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
      error,
    };
  }
}

async function runCliJson(args) {
  const result = await runCliRaw(args);
  assert.equal(result.code, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

async function hashTree(directory) {
  const hashes = {};
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const data = await fs.readFile(full);
        hashes[path.relative(directory, full)] = crypto.createHash("sha256").update(data).digest("hex");
      }
    }
  }
  await walk(directory);
  return hashes;
}

async function hashArchive() {
  const result = {};
  for (const directory of ARCHIVE_DIRS) {
    result[directory] = await hashTree(directory);
  }
  return result;
}

test("CLI --help güvenlik sınırını belgeler", async () => {
  const result = await runCliRaw(["--help"]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Güvenlik:/);
  assert.match(result.stdout, /data\/archive/);
  assert.match(result.stdout, /ingest=false/);
});

test("CLI report --json gerçek arşiv özetini üretir", async () => {
  const report = await runCliJson(["report", "--json", "--generated-at", "2026-10-23"]);
  assert.equal(report.archiveSummary.records, 168);
  assert.equal(report.archiveSummary.files, 168);
  assert.equal(report.inventory.summary.recordsWithSourceUrl, 168);
  assert.equal(report.coverage.summary.directBiographicalRecords, 0);
  assert.equal(report.coverage.summary.earlyLifeReferenceOutsideDate, 2);
  assert.equal(report.coverage.summary.outOfPeriodRecords, 161);
  assert.equal(report.coverage.summary.undatedRecords, 1);
  assert.equal(report.coverage.summary.phaseCount, 7);
  assert.equal(report.coverage.summary.phasesWithoutAnyEvidence, 2);
  assert.equal(report.coverage.summary.phasesWithReferenceOnly, 1);
  assert.equal(report.candidates.summary.eligibleCandidates, 13);
  assert.equal(report.candidates.summary.policyViolations, 0);
  assert.ok(report.candidates.candidates.every((candidate) => candidate.ingest === false));
  assert.ok(report.candidates.candidates.every((candidate) => candidate.status === "unverified"));
  assert.equal(report.sourceHistory.summary.trackedRecords, 168);
  assert.equal(report.sourceHistory.summary.totalAcceptedChanges, 4);
  assert.equal(report.sourceHistory.summary.driftRecords, 0);
  assert.equal(report.sourceHistory.summary.orphanedEntries, 0);
  assert.equal(report.linkCheck.mode, "not_run");
  assert.equal(report.quality.score, 54);
  assert.equal(report.duplicateSources.summary.sharedOfficialSourceGroups, 1);
  assert.equal(report.sourceSufficiency.summary.citationMissing, 18);
  assert.equal(report.humanReview.summary.humanApproved, 0);
  assert.equal(report.tool.readOnlyArchive, true);
});

test("CLI report aynı generatedAt ile deterministik JSON üretir", async () => {
  const first = await runCliRaw(["report", "--json", "--generated-at", "2026-10-23"]);
  const second = await runCliRaw(["report", "--json", "--generated-at", "2026-10-23"]);
  assert.equal(first.code, 0);
  assert.equal(second.code, 0);
  assert.equal(first.stdout, second.stdout);
});

test("CLI salt okunur komutlar arşiv dosyalarını değiştirmez", async () => {
  const before = await hashArchive();
  const report = await runCliRaw(["report", "--json", "--generated-at", "2026-10-23"]);
  assert.equal(report.code, 0);
  const history = await runCliJson(["history", "--json", "--generated-at", "2026-10-23"]);
  assert.equal(history.summary.trackedRecords, 168);
  assert.equal(history.summary.totalAcceptedChanges, 4);
  const candidates = await runCliJson(["candidates", "--json", "--generated-at", "2026-10-23"]);
  assert.equal(candidates.summary.eligibleCandidates, 13);
  assert.ok(candidates.candidates.every((candidate) => candidate.ingest === false));
  const after = await hashArchive();
  assert.deepEqual(after, before, "arşiv dosyaları değişmemeli");
});

test("CLI check kritik hata yoksa PASS döner ve arşivi değiştirmez", async () => {
  const before = await hashArchive();
  const result = await runCliRaw(["check", "--generated-at", "2026-10-23"]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Kontrol: PASS/);
  const after = await hashArchive();
  assert.deepEqual(after, before);
});

test("CLI raporu güvenli çıktı dizinine yazar", async () => {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "asrin-kemali-v07-cli-"));
  try {
    const before = await hashArchive();
    const result = await runCliRaw([
      "report",
      "--write",
      "--out",
      outDir,
      "--generated-at",
      "2026-10-23",
    ]);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Raporlar yazıldı/);
    const files = await fs.readdir(outDir);
    assert.equal(files.length, 16);
    assert.ok(files.includes("catalog-quality.json"));
    assert.ok(files.includes("catalog-quality.md"));
    assert.ok(files.includes("README.md"));
    const json = JSON.parse(await fs.readFile(path.join(outDir, "catalog-quality.json"), "utf8"));
    assert.equal(json.archiveSummary.records, 168);
    const after = await hashArchive();
    assert.deepEqual(after, before);
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
});

test("CLI arşiv dizinine yazmayı reddeder", async () => {
  const before = await hashArchive();
  const forbidden = path.join(REPO_ROOT, "data", "archive", "catalog");
  const result = await runCliRaw([
    "report",
    "--write",
    "--out",
    forbidden,
    "--generated-at",
    "2026-10-23",
  ]);
  assert.equal(result.code, 3);
  assert.match(result.stderr, /Güvenlik: rapor çıktısı/);
  const after = await hashArchive();
  assert.deepEqual(after, before);
});
