import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const manifestPath = path.join(repoRoot, "tools", "qa-unified", "manifest.json");
export const resultsRoot = path.join(repoRoot, "qa", "results");
export const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
export const resultStatuses = new Set([
  "PASS", "FAIL_APP", "FAIL_TEST", "FAIL_INFRA", "BLOCKED_EDITORIAL", "WARN_DATA",
  "SKIPPED_CONDITIONAL", "NOT_APPLICABLE", "NOT_INTEGRATED", "NOT_RUN", "FLAKY",
]);

export function inside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export function resolveResultPath(value) {
  const candidate = path.resolve(repoRoot, value);
  if (!inside(resultsRoot, candidate)) {
    throw new Error(`Path must stay inside ${path.relative(repoRoot, resultsRoot)}.`);
  }
  return candidate;
}

export function safeRunId(value) {
  const runId = value ?? `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(runId) || runId === "." || runId === "..") {
    throw new Error("run-id must contain only letters, numbers, dots, underscores, and hyphens.");
  }
  return runId;
}

export function redact(text) {
  return text
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[REDACTED]")
    .replace(
      /((?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*[:=]\s*)(?:Bearer\s+)?([^\s,;"']+)/gi,
      (_match, prefix, value) => `${prefix}${/^(?:\*+|\[REDACTED\])$/i.test(value) ? value : "[REDACTED]"}`,
    );
}

export function runProcess(command, args, options = {}) {
  const { cwd = repoRoot, env = process.env, timeoutMs = 120_000, maxOutput = 1_000_000 } = options;
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let spawnError;
    const append = (current, chunk) => {
      const next = current + chunk.toString();
      return next.length > maxOutput ? `${next.slice(0, maxOutput)}\n[output truncated]` : next;
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk); });
    child.on("error", (error) => { spawnError = error; });
    const timeout = setTimeout(() => {
      timedOut = true;
      terminateProcessTree(child, { force: true });
    }, timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      resolve({
        code: timedOut ? 124 : (code ?? 1),
        signal,
        timedOut,
        spawnError: spawnError?.message ?? null,
        stdout: redact(stdout),
        stderr: redact(stderr),
      });
    });
  });
}

export async function terminateProcessTree(child, { force = false } = {}) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    if (!force) {
      child.kill("SIGTERM");
      return;
    }
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        shell: false,
        windowsHide: true,
        stdio: "ignore",
      });
      killer.on("error", resolve);
      killer.on("close", resolve);
    });
    return;
  }
  try {
    process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

export function makeResult({ id, suite, status, message, command = null, durationMs = null, owner = "Copilot", exitCode = null, artifacts = [], classificationReason = null, details = null }) {
  return {
    id,
    suite,
    status,
    message,
    command,
    durationMs,
    owner,
    exitCode,
    artifacts,
    classificationReason,
    details,
  };
}

export function summarizeResults(results) {
  const counts = {
    passed: 0,
    failed: 0,
    skipped: 0,
    notRun: 0,
    notApplicable: 0,
    blockedEditorial: 0,
    warnData: 0,
  };
  for (const { status } of results) {
    if (status === "PASS") counts.passed += 1;
    else if (status.startsWith("FAIL_") || status === "FLAKY") counts.failed += 1;
    else if (status === "SKIPPED_CONDITIONAL") counts.skipped += 1;
    else if (status === "NOT_RUN") counts.notRun += 1;
    else if (status === "NOT_APPLICABLE" || status === "NOT_INTEGRATED") counts.notApplicable += 1;
    else if (status === "BLOCKED_EDITORIAL") counts.blockedEditorial += 1;
    else if (status === "WARN_DATA") counts.warnData += 1;
    else throw new Error(`Unknown result status: ${status}`);
  }
  return counts;
}

export function createReport({ runId, suite, mode, results, commit, branch, dirtyFiles = [], browsers = [] }) {
  return {
    schemaVersion: manifest.reportSchemaVersion,
    repository: "Alisensai/asrinkemali",
    runId,
    branch,
    commit,
    dirtyFiles,
    generatedAt: new Date().toISOString(),
    environment: {
      os: `${os.platform()} ${os.release()}`,
      node: process.version,
      mode,
      browsers,
    },
    suite,
    counts: summarizeResults(results),
    classification: {
      app: results.filter((result) => result.status === "FAIL_APP").length,
      test: results.filter((result) => result.status === "FAIL_TEST").length,
      infra: results.filter((result) => result.status === "FAIL_INFRA" || result.status === "NOT_RUN").length,
      editorial: results.filter((result) => result.status === "BLOCKED_EDITORIAL").length,
      dataWarning: results.filter((result) => result.status === "WARN_DATA").length,
    },
    results,
    artifacts: [],
    exitCode: results.some((result) => result.status.startsWith("FAIL_") || result.status === "FLAKY" || result.status === "NOT_RUN") ? 1 : 0,
  };
}

export function assertReport(report) {
  if (report.schemaVersion !== manifest.reportSchemaVersion || !Array.isArray(report.results) || !Array.isArray(report.artifacts)) {
    throw new Error("Invalid QA report shape or unsupported schema version.");
  }
  for (const result of report.results) {
    if (!result.id || !result.suite || !result.message || !resultStatuses.has(result.status) || !Array.isArray(result.artifacts)) {
      throw new Error("QA report contains an incomplete result or unknown status.");
    }
  }
  const counts = summarizeResults(report.results);
  if (JSON.stringify(counts) !== JSON.stringify(report.counts)) {
    throw new Error("QA report counts do not match detailed results.");
  }
}

export function reportMarkdown(report) {
  assertReport(report);
  const lines = [
    `# QA run ${report.runId}`,
    "",
    `- **Suite:** ${report.suite}`,
    `- **Mode:** ${report.environment.mode}`,
    `- **Branch / commit:** ${report.branch} / \`${report.commit}\``,
    `- **Generated:** ${report.generatedAt}`,
    `- **Environment:** ${report.environment.os}; Node ${report.environment.node}`,
    `- **Browsers:** ${report.environment.browsers.join(", ") || "not applicable"}`,
    `- **Exit code:** ${report.exitCode}`,
    "",
    "| Test | Suite | Status | Details |",
    "|---|---|---|---|",
  ];
  for (const result of report.results) {
    const detail = (result.message ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
    lines.push(`| ${result.id} | ${result.suite} | ${result.status} | ${detail} |`);
  }
  lines.push("", "## Counts", "", "| Passed | Failed | Skipped | Not run | Not applicable | Editorial blocked | Data warnings |",
    "|---:|---:|---:|---:|---:|---:|---:|",
    `| ${report.counts.passed} | ${report.counts.failed} | ${report.counts.skipped} | ${report.counts.notRun} | ${report.counts.notApplicable} | ${report.counts.blockedEditorial} | ${report.counts.warnData} |`,
    "", "## Artifacts", "");
  if (report.artifacts.length === 0) lines.push("- None.");
  else for (const artifact of report.artifacts) lines.push(`- \`${artifact}\``);
  return `${lines.join("\n")}\n`;
}

export function compareReports(baseline, current) {
  assertReport(baseline);
  assertReport(current);
  const before = new Map(baseline.results.map((result) => [result.id, result]));
  const after = new Map(current.results.map((result) => [result.id, result]));
  const testIds = [...new Set([...before.keys(), ...after.keys()])].sort();
  const changes = testIds.flatMap((id) => {
    const oldResult = before.get(id);
    const newResult = after.get(id);
    if (!oldResult) return [{ id, change: "added", before: null, after: newResult.status }];
    if (!newResult) return [{ id, change: "removed", before: oldResult.status, after: null }];
    if (oldResult.status === newResult.status) return [];
    return [{ id, change: oldResult.status === "PASS" && newResult.status !== "PASS" ? "regressed" : "status-changed", before: oldResult.status, after: newResult.status }];
  });
  return {
    schemaVersion: "1.0.0",
    baseline: baseline.runId,
    current: current.runId,
    environmentComparable: JSON.stringify(baseline.environment) === JSON.stringify(current.environment),
    changes,
  };
}

export function writeJsonExclusive(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const descriptor = fs.openSync(filePath, "wx");
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(content, null, 2)}\n`);
  } finally {
    fs.closeSync(descriptor);
  }
}

export async function gitValue(args) {
  const result = await runProcess("git", args, { timeoutMs: 10_000 });
  return result.code === 0 ? result.stdout.trim() : "";
}

export function discoverTestFiles(directory, pattern = /\.test\.mjs$/) {
  if (!fs.existsSync(directory)) return [];
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...discoverTestFiles(fullPath, pattern));
    else if (entry.isFile() && pattern.test(entry.name)) found.push(fullPath);
  }
  return found.sort();
}
