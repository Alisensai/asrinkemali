import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertReport,
  compareReports,
  createReport,
  inside,
  makeResult,
  redact,
  reportMarkdown,
  repoRoot,
  resolveResultPath,
  runProcess,
  safeRunId,
  writeJsonExclusive,
} from "../lib/runtime.mjs";
import { isPortFree } from "../lib/server.mjs";
import { runLegacyScripts } from "../../../qa/kilo/scripts/run-all.mjs";

test("resolves the repository root and recognizes in-scope result paths", () => {
  assert.ok(fs.existsSync(path.join(repoRoot, "web", "package.json")));
  assert.ok(fs.existsSync(path.join(repoRoot, "AGENTS.md")));
  assert.ok(inside(path.join(repoRoot, "qa", "results"), path.join(repoRoot, "qa", "results", "run")));
  assert.throws(() => resolveResultPath("qa/results/../../content/archive/records"), /inside qa[\\/]results/);
});

test("run ids reject traversal and platform path separators", () => {
  assert.equal(safeRunId("run-01.test"), "run-01.test");
  assert.throws(() => safeRunId("../outside"), /run-id/);
  assert.throws(() => safeRunId("run/../../outside"), /run-id/);
});

test("child process failure exit codes propagate and timeouts do not terminate a sibling", async () => {
  const failure = await runProcess(process.execPath, ["-e", "process.exit(7)"], { timeoutMs: 5_000 });
  assert.equal(failure.code, 7);
  assert.equal(failure.timedOut, false);

  const sibling = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    shell: false,
    windowsHide: true,
    stdio: "ignore",
  });
  await new Promise((resolve, reject) => {
    sibling.once("spawn", resolve);
    sibling.once("error", reject);
  });
  try {
    const timedOut = await runProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { timeoutMs: 250 });
    assert.equal(timedOut.code, 124);
    assert.equal(timedOut.timedOut, true);
    assert.equal(sibling.exitCode, null);
    assert.doesNotThrow(() => process.kill(sibling.pid, 0));
  } finally {
    sibling.kill();
    await new Promise((resolve) => sibling.once("close", resolve));
  }
});

test("secret values are redacted without exposing environment values", () => {
  assert.equal(redact("api_key=supersecret"), "api_key=[REDACTED]");
  assert.equal(redact("Authorization: Bearer abc.def"), "Authorization: [REDACTED]");
});

test("report schema, counts, and markdown all derive from the same results", () => {
  const results = [
    makeResult({ id: "test-a", suite: "smoke", status: "PASS", message: "ok", details: { browser: "chromium" } }),
    makeResult({ id: "test-b", suite: "smoke", status: "BLOCKED_EDITORIAL", message: "human approval missing" }),
    makeResult({ id: "test-c", suite: "smoke", status: "NOT_APPLICABLE", message: "module absent" }),
  ];
  const report = createReport({
    runId: "unit-run",
    suite: "smoke",
    mode: "production",
    results,
    commit: "abc123",
    branch: "test-branch",
    browsers: ["chromium"],
  });
  report.exitCode = 0;
  assertReport(report);
  assert.deepEqual(report.counts, {
    passed: 1, failed: 0, skipped: 0, notRun: 0, notApplicable: 1, blockedEditorial: 1, warnData: 0,
  });
  assert.equal(reportMarkdown(report), reportMarkdown(report));
  assert.deepEqual(report.results[0].details, { browser: "chromium" });
  assert.match(reportMarkdown(report), /\*\*Browsers:\*\* chromium/);
  assert.match(reportMarkdown(report), /BLOCKED_EDITORIAL/);
  assert.throws(() => assertReport({ ...report, counts: { ...report.counts, passed: 0 } }), /counts do not match/);
});

test("report writers never overwrite snapshots", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mka-qa-test-"));
  const target = path.join(directory, "baseline.json");
  try {
    writeJsonExclusive(target, { value: 1 });
    assert.throws(() => writeJsonExclusive(target, { value: 2 }), /EEXIST/);
    assert.deepEqual(JSON.parse(fs.readFileSync(target, "utf8")), { value: 1 });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("comparison reports stable-id regressions and environment mismatches", () => {
  const base = createReport({
    runId: "base",
    suite: "smoke",
    mode: "production",
    results: [makeResult({ id: "stable", suite: "smoke", status: "PASS", message: "ok" })],
    commit: "abc",
    branch: "base",
  });
  const next = createReport({
    runId: "next",
    suite: "smoke",
    mode: "dev",
    results: [
      makeResult({ id: "stable", suite: "smoke", status: "FAIL_APP", message: "regression" }),
      makeResult({ id: "new", suite: "smoke", status: "PASS", message: "added" }),
    ],
    commit: "def",
    branch: "head",
  });
  const comparison = compareReports(base, next);
  assert.equal(comparison.environmentComparable, false);
  assert.deepEqual(comparison.changes.map(({ id, change }) => [id, change]), [["new", "added"], ["stable", "regressed"]]);
});

test("doctor port probe reports a bound loopback port as occupied", async () => {
  const net = await import("node:net");
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    assert.equal(await isPortFree(port), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("legacy run-all preserves child exit code and stops after the first failure", () => {
  let calls = 0;
  const exitCode = runLegacyScripts({
    logError: () => {},
    runner: () => {
      calls += 1;
      return { status: 9, error: null };
    },
  });
  assert.equal(exitCode, 9);
  assert.equal(calls, 1);
});
