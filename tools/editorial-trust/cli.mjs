#!/usr/bin/env node
/**
 * Editoryal güven CLI'ı. Varsayılan olarak tamamen salt-okunurdur; rapor yalnız açık
 * `--output` ile ve yalnız izinli dizine yazılır. Onay veren, yayımlayan veya formları
 * "düzelten" bir komut YOKTUR (--approve-all, --publish-all, --auto-fix-approvals vb.).
 *
 * Çıkış kodları:
 *   0 analiz başarılı (yayına hazır anlamına GELMEZ)
 *   1 teknik doğrulama / iş kuralı engeli (gate-check: release_ready=false)
 *   2 yanlış kullanım / geçersiz parametre
 *   3 gerçek veri okunamıyor veya güvenlik sınırı ihlali
 */
import { execFileSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { legacyRecordHash, snapshotHash } from "../../web/lib/editorial-trust/canonical.ts";
import { classifyLegacyForm } from "../../web/lib/editorial-trust/forms.ts";
import { PR12_COMPATIBILITY } from "../../web/lib/editorial-trust/policy.ts";
import { parseStrictTimestamp } from "../../web/lib/editorial-trust/time.ts";
import { stableJson, toCsv, toMarkdown, writeReports } from "./src/output.mjs";
import { safeReadJson, SecurityBoundaryError } from "./src/repo-reader.mjs";
import { buildTrustReport, gateDecision } from "./src/trust-report.mjs";

export const COMMANDS = ["audit", "review-status", "gate-check", "snapshot-diff", "inspect-form", "compatibility"];
const FLAGS_WITH_VALUE = new Set(["--root", "--output", "--format", "--record-id", "--now", "--technical-tests"]);
const FORBIDDEN = /^--(approve|publish|auto-fix|fix|write-forms|force)/;

export class UsageError extends Error {}

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!COMMANDS.includes(command)) throw new UsageError(`bilinmeyen komut: ${command ?? "(yok)"}`);
  const options = { root: ".", format: "json" };
  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    if (FORBIDDEN.test(flag)) throw new UsageError(`bu araç onay/yayın/düzeltme yapmaz: ${flag}`);
    if (!FLAGS_WITH_VALUE.has(flag)) throw new UsageError(`bilinmeyen seçenek: ${flag}`);
    const value = rest[i + 1];
    if (value === undefined || value.startsWith("--")) throw new UsageError(`${flag} bir değer ister`);
    options[flag.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    i += 1;
  }
  if (!["json", "md", "csv"].includes(options.format)) throw new UsageError("--format json|md|csv olmalı");
  if (options.technicalTests !== undefined && !["passed", "failed", "unknown"].includes(options.technicalTests)) throw new UsageError("--technical-tests passed|failed|unknown");
  if (options.now !== undefined && !parseStrictTimestamp(options.now).ok) throw new UsageError("--now saat dilimli ISO 8601 olmalı");
  if (["snapshot-diff", "inspect-form"].includes(command) && !/^[a-z0-9][a-z0-9-]{1,120}$/.test(options.recordId ?? "")) throw new UsageError("--record-id geçerli bir kayıt kimliği olmalı");
  return { command, options };
}

function gitInfo(root) {
  const read = (args) => {
    try {
      return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 10_000 }).trim();
    } catch {
      return "unknown";
    }
  };
  return { branch: read(["rev-parse", "--abbrev-ref", "HEAD"]), commit: read(["rev-parse", "HEAD"]) };
}

function render(format, value, report, gate) {
  if (format === "csv" && report) return toCsv(report);
  if (format === "md" && report) return toMarkdown(report, gate);
  return stableJson(value);
}

export function run(argv, io = { stdout: (s) => process.stdout.write(s), stderr: (s) => process.stderr.write(s) }) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    io.stderr(`kullanım hatası: ${error.message}\nkomutlar: ${COMMANDS.join(", ")}\n`);
    return 2;
  }
  const { command, options } = parsed;
  try {
    const root = realpathSync(path.resolve(options.root));
    if (!existsSync(path.join(root, "data", "archive", "catalog")) && !existsSync(path.join(root, "content", "archive", "records"))) {
      io.stderr("veri hatası: arşiv kataloğu bulunamadı\n");
      return 3;
    }
    const now = options.now ? parseStrictTimestamp(options.now).epochMs : Date.now();
    const technicalTestsPassed = options.technicalTests === "passed" ? true : options.technicalTests === "failed" ? false : null;
    const report = buildTrustReport(root, { now, git: gitInfo(root), technicalTestsPassed });
    const gate = gateDecision(report);
    if (report.meta.missingDirs.length) {
      io.stderr(`veri hatası: eksik dizin: ${report.meta.missingDirs.join(", ")}\n`);
      return 3;
    }

    if (command === "audit") {
      if (options.output) {
        const written = writeReports(root, options.output, report, gate);
        io.stdout(stableJson({ written: written.map((file) => path.relative(root, file).split(path.sep).join("/")), counts: report.counts, gate }));
      } else io.stdout(render(options.format, { ...report, gate }, report, gate));
      return 0;
    }
    if (command === "review-status") {
      const rows = report.rows.map((row) => ({ subjectType: row.subjectType, recordId: row.recordId, reviewState: row.reviewState, trustClass: row.trustClass, result: row.result }));
      io.stdout(render(options.format, { meta: report.meta, counts: report.counts, rows }, options.format === "json" ? null : report, gate));
      return 0;
    }
    if (command === "gate-check") {
      io.stdout(render(options.format, { meta: report.meta, environment: report.environment, gate, findingCounts: report.findingCounts }, options.format === "json" ? null : report, gate));
      return gate.release_ready ? 0 : 1;
    }
    if (command === "compatibility") {
      io.stdout(stableJson({ pr12ToTrustCodes: PR12_COMPATIBILITY, legacyFormSchema: "urn:asrin-kemali:schema:editorial-review-form:1.0.0", legacySnapshotAlgorithm: "legacy-record-sha256-v1", newSnapshotAlgorithm: "nfc-policy-sha256-v2", formsModified: false, counts: report.counts }));
      return 0;
    }
    const row = report.rows.find((item) => item.subjectType === "archive_record" && item.recordId === options.recordId);
    if (!row) {
      io.stderr(`kayıt bulunamadı: ${options.recordId}\n`);
      return 1;
    }
    if (command === "inspect-form") {
      io.stdout(stableJson({ recordId: row.recordId, formFile: row.formFile, reviewState: row.reviewState, trustClass: row.trustClass, result: row.result, flags: row.flags, findings: row.findings }));
      return 0;
    }
    // snapshot-diff
    const record = safeReadJson(root, row.file);
    const form = row.formFile ? safeReadJson(root, row.formFile) : null;
    if (!record.ok || (form && !form.ok)) {
      io.stderr("veri hatası: kayıt veya form okunamadı\n");
      return 3;
    }
    const formValue = form?.value ?? null;
    const snapshot = formValue?.record_snapshot ?? {};
    const current = record.value;
    const projected = { title: current.title, type: current.type, date: current.date, source_institution: current.source?.institution, source_url: current.source?.url, citation: current.source?.title, rights_status: current.rights?.status };
    const changedFormFields = Object.keys(projected).filter((key) => JSON.stringify(projected[key]) !== JSON.stringify(snapshot[key])).sort();
    io.stdout(
      stableJson({
        recordId: row.recordId,
        formSnapshotHash: formValue?.record_snapshot_sha256 ?? null,
        currentLegacyHash: legacyRecordHash(current),
        currentHashV2: snapshotHash("archive_record", current),
        stale: classifyLegacyForm(formValue, current).stale,
        changedFormSnapshotFields: changedFormFields,
      }),
    );
    return 0;
  } catch (error) {
    if (error instanceof SecurityBoundaryError) {
      io.stderr(`güvenlik sınırı: ${error.code}\n`);
      return 3;
    }
    io.stderr(`veri hatası: ${error instanceof Error ? error.message : "bilinmeyen"}\n`);
    return 3;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = run(process.argv.slice(2));
}
