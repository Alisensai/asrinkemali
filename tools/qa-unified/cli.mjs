#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { isPortFree, startIsolatedServer, stopIsolatedServer } from "./lib/server.mjs";
import { generateSyntheticRecords, runSyntheticScale } from "./lib/synthetic.mjs";
import {
  assertReport,
  compareReports,
  createReport,
  discoverTestFiles,
  gitValue,
  makeResult,
  manifest,
  manifestPath,
  reportMarkdown,
  repoRoot,
  resolveResultPath,
  resultsRoot,
  runProcess,
  safeRunId,
  writeJsonExclusive,
} from "./lib/runtime.mjs";

const webRoot = path.join(repoRoot, "web");
const playwrightCli = path.join(webRoot, "node_modules", "@playwright", "test", "cli.js");

function help() {
  console.log(`Asrın Kemali unified QA ${manifest.schemaVersion}

Usage:
  node tools/qa-unified/cli.mjs doctor [--port=49173]
  node tools/qa-unified/cli.mjs inventory
  node tools/qa-unified/cli.mjs plan [--suite=smoke] [--target=v06|v07] [--mode=dev|production|unit]
  node tools/qa-unified/cli.mjs run --suite=<id> --mode=<dev|production|unit> [--run-id=<id>] [--timeout-ms=<ms>]
  node tools/qa-unified/cli.mjs report --input=qa/results/<run-id>/report.json [--format=json|md]
  node tools/qa-unified/cli.mjs compare --baseline=<report.json> --current=<report.json>

Available suites: ${manifest.suites.map((suite) => suite.id).join(", ")}
No command string is accepted from CLI input; all subprocess argv are defined by this tool.`);
}

function parseOptions(args) {
  const options = {};
  for (const argument of args) {
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const [key, ...parts] = argument.slice(2).split("=");
    if (!key || parts.length === 0 || Object.hasOwn(options, key)) throw new Error(`Invalid or duplicate option: ${argument}`);
    options[key] = parts.join("=");
  }
  return options;
}

function assertAllowed(options, allowed, command) {
  const unknown = Object.keys(options).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`Unknown ${command} option(s): ${unknown.map((key) => `--${key}`).join(", ")}`);
}

function statusLine(name, status, detail = "") {
  console.log(`${status.padEnd(14)} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function hasPython() {
  const result = await runProcess("python", ["--version"], { timeoutMs: 5_000 });
  return result.code === 0 ? result.stdout.trim() || result.stderr.trim() : null;
}

async function browserStatus() {
  if (!fs.existsSync(path.join(webRoot, "node_modules", "@playwright", "test"))) {
    return { status: "NOT_INSTALLED", browsers: [] };
  }
  try {
    const { chromium, firefox, webkit } = await import(pathToFileURL(path.join(webRoot, "node_modules", "@playwright", "test", "index.mjs")).href);
    const browsers = [
      ["chromium", chromium],
      ["firefox", firefox],
      ["webkit", webkit],
    ].map(([name, type]) => ({
      name,
      status: fs.existsSync(type.executablePath()) ? "PASS" : "NOT_INSTALLED",
    }));
    return { status: "PASS", browsers };
  } catch (error) {
    return { status: "WARN", browsers: [], reason: error.message };
  }
}

async function doctor(options) {
  const checks = [];
  const add = (name, status, detail) => checks.push({ name, status, detail });
  const remote = await gitValue(["remote", "get-url", "origin"]);
  add("repository identity", /github\.com[:/]Alisensai\/asrinkemali(?:\.git)?$/i.test(remote) ? "PASS" : "FAIL", remote || "origin remote unavailable");
  const dirty = await gitValue(["status", "--porcelain=v1"]);
  add("git working tree", dirty ? "WARN" : "PASS", dirty ? `${dirty.split(/\r?\n/).filter(Boolean).length} changed/untracked paths` : "clean");
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  add("Node.js", nodeMajor >= 20 ? "PASS" : "FAIL", process.version);
  add("root npm lockfile", fs.existsSync(path.join(repoRoot, "package-lock.json")) ? "PASS" : "FAIL", "package-lock.json");
  add("web npm lockfile", fs.existsSync(path.join(webRoot, "package-lock.json")) ? "PASS" : "FAIL", "web/package-lock.json");
  add("web dependencies", fs.existsSync(path.join(webRoot, "node_modules", "next")) ? "PASS" : "NOT_INSTALLED", "Next.js workspace");
  add("QA output path", (() => { try { resolveResultPath("qa/results/doctor"); return "PASS"; } catch { return "FAIL"; } })(), "qa/results/<run-id>");
  const python = await hasPython();
  add("Python tests", python ? "PASS" : "NOT_INSTALLED", python ?? "python executable not found");
  const packageJson = JSON.parse(fs.readFileSync(path.join(webRoot, "package.json"), "utf8"));
  for (const scriptName of ["lint", "typecheck", "test", "build"]) {
    add(`npm script ${scriptName}`, Object.hasOwn(packageJson.scripts ?? {}, scriptName) ? "PASS" : "FAIL", `web/package.json`);
  }
  add("Playwright config", fs.existsSync(path.join(webRoot, "playwright.qa-unified.config.ts")) ? "PASS" : "FAIL", "web/playwright.qa-unified.config.ts");
  const browsers = await browserStatus();
  add("Playwright package", browsers.status, browsers.reason ?? "web workspace");
  for (const browser of browsers.browsers) add(`browser ${browser.name}`, browser.status, browser.status === "PASS" ? "binary found" : "binary missing");
  const port = options.port === undefined ? null : Number(options.port);
  if (port !== null) {
    if (!Number.isInteger(port) || port < 1 || port > 65_535) add("selected port", "FAIL", "port must be an integer from 1 to 65535");
    else {
      try {
        const free = await isPortFree(port);
        add("selected port", free ? "PASS" : "WARN", free ? `${port} currently free` : `${port} is occupied; runner will choose a distinct port`);
      } catch (error) { add("selected port", "FAIL", error.message); }
    }
  } else add("selected port", "NOT_APPLICABLE", "runner selects an ephemeral loopback port");
  const secretNames = Object.keys(process.env).filter((name) => /(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD)/i.test(name));
  add("sensitive environment", secretNames.length ? "WARN" : "PASS", secretNames.length ? `${secretNames.length} variable name(s) present; values are not inspected or printed` : "no likely secret variable names");
  console.log("QA doctor — values of environment variables are never displayed.");
  for (const check of checks) statusLine(check.name, check.status, check.detail);
  const failed = checks.some(({ status }) => status === "FAIL");
  process.exitCode = failed ? 1 : 0;
}

function checkModule(module) {
  const missingRoutes = module.routes.filter((route) => {
    const pattern = route.replace(/\[.+?\]/g, "");
    return !manifest.routes.some((entry) => entry.path === route) && !fs.existsSync(path.join(repoRoot, "web", "app", pattern));
  });
  const presentSpecs = module.e2eSpecPaths.filter((item) => fs.existsSync(path.join(repoRoot, item)));
  const source = module.routes.some((route) => manifest.routes.some((entry) => entry.path === route));
  return {
    ...module,
    status: source ? "INTEGRATED" : "NOT_INTEGRATED",
    missingRoutes,
    presentSpecs,
    unitCommand: source ? module.unitCommand : "NOT_INTEGRATED",
  };
}

function inventory() {
  const suites = manifest.suites.map((suite) => {
    const specExists = suite.execution?.startsWith("playwright") ? fs.existsSync(path.join(webRoot, "e2e", "qa-unified", "smoke.spec.ts")) : true;
    return { ...suite, executable: Boolean(suite.execution) && suite.status === "available" && specExists };
  });
  const result = {
    schemaVersion: manifest.schemaVersion,
    repository: manifest.repository,
    manifest: path.relative(repoRoot, manifestPath),
    routes: manifest.routes.filter((route) => fs.existsSync(path.join(repoRoot, route.source))),
    suites,
    modules: manifest.modules.map(checkModule),
    scenarioCoverage: manifest.scenarioCoverage,
  };
  console.log(JSON.stringify(result, null, 2));
}

function plan(options) {
  const target = options.target ?? "v06";
  if (!["v06", "v07"].includes(target)) throw new Error("--target must be v06 or v07.");
  const mode = options.mode ?? "unit";
  if (!["dev", "production", "unit"].includes(mode)) throw new Error("--mode must be dev, production, or unit.");
  const selected = options.suite ? manifest.suites.filter(({ id }) => id === options.suite) : manifest.suites;
  if (options.suite && selected.length === 0) throw new Error(`Unknown suite: ${options.suite}`);
  console.log(JSON.stringify({
    target,
    mode,
    repositoryRoot: repoRoot,
    suites: selected.map((suite) => ({
      ...suite,
      selected: suite.id === "all" || suite.modes.includes(mode),
      routes: suite.execution?.startsWith("playwright") ? manifest.routes.filter((route) => fs.existsSync(path.join(repoRoot, route.source))).map(({ path: routePath }) => routePath) : [],
    })),
  }, null, 2));
}

function createRunDirectory(runId) {
  const runDir = resolveResultPath(path.join("qa", "results", runId));
  fs.mkdirSync(resultsRoot, { recursive: true });
  fs.mkdirSync(runDir, { recursive: false });
  for (const folder of ["screenshots", "traces", "raw-logs", "structured-report", "playwright"]) {
    fs.mkdirSync(path.join(runDir, folder));
  }
  return runDir;
}

function findSuite(suiteId) {
  const suite = manifest.suites.find(({ id }) => id === suiteId);
  if (!suite) throw new Error(`Unknown suite '${suiteId}'. Available suites: ${manifest.suites.map(({ id }) => id).join(", ")}`);
  return suite;
}

async function runNodeTests(testFiles, id, suite, timeoutMs) {
  if (!testFiles.length) return makeResult({ id, suite, status: "NOT_APPLICABLE", message: "No matching test files are integrated." });
  const relative = testFiles.map((file) => path.relative(repoRoot, file));
  const started = Date.now();
  const processResult = await runProcess(process.execPath, ["--test", ...relative], { timeoutMs });
  return makeResult({
    id, suite,
    status: processResult.code === 0 ? "PASS" : (processResult.timedOut || processResult.spawnError ? "FAIL_INFRA" : "FAIL_TEST"),
    message: processResult.code === 0 ? `${testFiles.length} test file(s) passed.` : `exit=${processResult.code}${processResult.timedOut ? " timeout" : ""}; ${processResult.stderr || processResult.stdout}`.slice(0, 2_000),
    command: `node --test ${relative.join(" ")}`,
    durationMs: Date.now() - started,
    exitCode: processResult.code,
  });
}

async function runPythonTests(testDir, id, suite, timeoutMs) {
  if (!fs.existsSync(path.join(repoRoot, testDir))) return makeResult({ id, suite, status: "NOT_APPLICABLE", message: `${testDir} is not integrated.` });
  const started = Date.now();
  const result = await runProcess("python", ["-m", "unittest", "discover", "-s", testDir, "-p", "test*.py"], { timeoutMs });
  return makeResult({
    id, suite,
    status: result.code === 0 ? "PASS" : (result.spawnError || result.timedOut ? "FAIL_INFRA" : "FAIL_TEST"),
    message: result.code === 0 ? result.stdout.trim().split(/\r?\n/).at(-1) || "Python tests passed." : `exit=${result.code}; ${result.stderr || result.stdout}`.slice(0, 2_000),
    command: `python -m unittest discover -s ${testDir} -p test*.py`,
    durationMs: Date.now() - started,
    exitCode: result.code,
  });
}

async function checkBrowser(browserName) {
  if (!fs.existsSync(playwrightCli)) return { installed: false, message: "web @playwright/test package is missing." };
  try {
    const types = await import(pathToFileURL(path.join(webRoot, "node_modules", "@playwright", "test", "index.mjs")).href);
    const browserType = types[browserName];
    if (!browserType) return { installed: false, message: `Unknown browser engine: ${browserName}` };
    const executable = browserType.executablePath();
    return { installed: fs.existsSync(executable), message: fs.existsSync(executable) ? executable : `${browserName} browser binary is not installed.` };
  } catch (error) {
    return { installed: false, message: `Could not inspect ${browserName}: ${error.message}` };
  }
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : entry.isFile() ? [fullPath] : [];
  });
}

function collectPlaywrightResults(playwrightReport, suite, browser, command) {
  const results = [];
  function visit(suites = []) {
    for (const item of suites) {
      for (const spec of item.specs ?? []) {
        for (const testCase of spec.tests ?? []) {
          const attempts = testCase.results ?? [];
          const finalAttempt = attempts.at(-1);
          const statuses = attempts.map(({ status }) => status);
          const flaky = statuses.includes("passed") && statuses.some((status) => status !== "passed" && status !== "skipped");
          const status = flaky
            ? "FLAKY"
            : (finalAttempt?.status === "passed" ? "PASS"
              : finalAttempt?.status === "skipped" ? "SKIPPED_CONDITIONAL"
                : finalAttempt?.status === "timedOut" || finalAttempt?.status === "interrupted" ? "FAIL_INFRA"
                  : (/route .* returns a public response|responsive overflow|performance sample/i.test(spec.title) ? "FAIL_APP" : "FAIL_TEST"));
          const file = path.posix.join("e2e", "qa-unified", path.basename(spec.file ?? "unknown"));
          const id = `${file}:${spec.line ?? 0}:${browser}:${spec.title}`;
          const errorMessage = finalAttempt?.error?.message ?? testCase.annotations?.map(({ description }) => description).filter(Boolean).join("; ") ?? "";
          results.push(makeResult({
            id,
            suite,
            status,
            message: status === "PASS" ? "Playwright test passed." : errorMessage || `Playwright status: ${finalAttempt?.status ?? "unknown"}`,
            command,
            durationMs: Number.isFinite(finalAttempt?.duration) ? finalAttempt.duration : null,
            exitCode: status === "PASS" || status === "SKIPPED_CONDITIONAL" ? 0 : 1,
            classificationReason: status === "FAIL_APP" ? "Known route/viewport assertion failed." : status === "FAIL_TEST" ? "Test assertion or selector failed; application attribution is unconfirmed." : status === "FAIL_INFRA" ? "Browser execution timed out or was interrupted." : null,
            details: { browser, expectedStatus: testCase.expectedStatus, attempts: attempts.length },
          }));
        }
      }
      visit(item.suites);
    }
  }
  visit(playwrightReport.suites);
  return results;
}

async function runPlaywright({ suite, id, mode, runDir, timeoutMs, grep, browser = "chromium" }) {
  if (mode === "production" && !fs.existsSync(path.join(webRoot, ".next", "BUILD_ID"))) {
    return [makeResult({ id, suite, status: "NOT_RUN", message: "Production build is missing; run npm run build --prefix web before production QA.", command: "npm run build --prefix web" })];
  }
  const browserInstall = await checkBrowser(browser);
  if (!browserInstall.installed) return [makeResult({ id, suite, status: "NOT_RUN", message: browserInstall.message, command: `Playwright ${browser} preflight` })];
  if (!["dev", "production"].includes(mode)) return [makeResult({ id, suite, status: "NOT_APPLICABLE", message: "Browser suites require --mode=dev or --mode=production." })];
  let server;
  const started = Date.now();
  try {
    server = await startIsolatedServer({ mode });
    const outputDir = path.join(runDir, "playwright", id);
    fs.mkdirSync(outputDir, { recursive: true });
    const structuredPath = path.join(runDir, "structured-report", `playwright-${id}.json`);
    const spec = path.join(webRoot, "e2e", "qa-unified", id === "performance-measurement" ? "performance.spec.ts" : "smoke.spec.ts");
    const args = [
      playwrightCli, "test",
      "--config", path.join(webRoot, "playwright.qa-unified.config.ts"),
      `--project=${browser}`,
    ];
    if (grep) args.push("--grep", grep);
    const result = await runProcess(process.execPath, args, {
      cwd: webRoot,
      timeoutMs,
      env: {
        ...process.env,
        ASRIN_QA_BASE_URL: server.url,
        ASRIN_QA_OUTPUT: outputDir,
        ASRIN_QA_RUN_ID: path.basename(runDir),
        ASRIN_QA_MODE: mode,
        ASRIN_QA_BROWSER: browser,
        ASRIN_QA_EXECUTION_ID: id,
        ASRIN_QA_TEST_FILE: `**/${path.basename(spec)}`,
        ASRIN_QA_SCREENSHOTS: path.join(runDir, "screenshots"),
        ASRIN_QA_JSON_REPORT: structuredPath,
        ...(id === "performance-measurement" ? { ASRIN_QA_PERF_OUTPUT: path.join(runDir, "structured-report", "performance-measurement.json") } : {}),
      },
    });
    const command = `node ${path.relative(repoRoot, playwrightCli)} test --config playwright.qa-unified.config.ts --project=${browser} (ASRIN_QA_TEST_FILE=${path.basename(spec)})`;
    const logPath = path.join(runDir, "raw-logs", `${id}.log`);
    fs.writeFileSync(logPath, `${result.stdout}\n${result.stderr}`, { flag: "wx" });
    const artifacts = [path.relative(repoRoot, outputDir), path.relative(repoRoot, structuredPath), path.relative(repoRoot, logPath)];
    let testResults = [];
    if (fs.existsSync(structuredPath)) {
      const playwrightReport = JSON.parse(fs.readFileSync(structuredPath, "utf8"));
      testResults = collectPlaywrightResults(playwrightReport, suite, browser, command);
    }
    if (testResults.length === 0) {
      testResults.push(makeResult({
        id,
        suite,
        status: result.code === 0 ? "FAIL_TEST" : result.timedOut || result.spawnError ? "FAIL_INFRA" : "FAIL_TEST",
        message: result.code === 0 ? "Playwright returned without structured test results." : `exit=${result.code}; ${result.stderr || result.stdout}`.slice(0, 2_000),
        command,
        durationMs: Date.now() - started,
        exitCode: result.code,
      }));
    }
    const serverMetadata = { mode, url: server.url, port: server.port, pid: server.child.pid, buildId: mode === "production" ? fs.readFileSync(path.join(webRoot, ".next", "BUILD_ID"), "utf8").trim() : null };
    for (const testResult of testResults) testResult.server = serverMetadata;
    for (const file of walkFiles(outputDir).filter((item) => [".zip", ".png"].includes(path.extname(item).toLowerCase()))) {
      const isTrace = path.extname(file).toLowerCase() === ".zip";
      const targetDir = path.join(runDir, isTrace ? "traces" : "screenshots");
      const targetPath = path.join(targetDir, `${id}-${artifacts.length}-${path.basename(file)}`);
      fs.copyFileSync(file, targetPath, fs.constants.COPYFILE_EXCL);
      artifacts.push(path.relative(repoRoot, targetPath));
    }
    for (const file of walkFiles(path.join(runDir, "screenshots")).filter((item) => path.basename(item).startsWith("home-"))) {
      artifacts.push(path.relative(repoRoot, file));
    }
    if (id === "performance-measurement" && fs.existsSync(path.join(runDir, "structured-report", "performance-measurement.json"))) {
      artifacts.push(path.relative(repoRoot, path.join(runDir, "structured-report", "performance-measurement.json")));
    }
    for (const testResult of testResults) testResult.artifacts = artifacts;
    if (result.code !== 0 && testResults.every(({ status }) => status === "PASS")) {
      testResults.push(makeResult({ id: `${id}:process-exit`, suite, status: "FAIL_INFRA", message: `Playwright process exited ${result.code}.`, command, exitCode: result.code, artifacts }));
    }
    return testResults;
  } catch (error) {
    return [makeResult({ id, suite, status: "FAIL_INFRA", message: error.message, durationMs: Date.now() - started })];
  } finally {
    if (server) await stopIsolatedServer(server.child);
  }
}

async function executeSuite(suite, mode, runDir, timeoutMs, browser = "chromium") {
  if (suite.status === "not-integrated") {
    return [makeResult({ id: suite.id, suite: suite.id, status: "NOT_INTEGRATED", message: suite.reason })];
  }
  if (suite.status === "not-run" || !suite.execution) {
    return [makeResult({ id: suite.id, suite: suite.id, status: "NOT_RUN", message: suite.reason ?? "No execution is registered." })];
  }
  if (suite.execution === "synthetic-scale") {
    const started = Date.now();
    const experiment = await runSyntheticScale();
    const out = path.join(runDir, "structured-report", "synthetic-scale.json");
    writeJsonExclusive(out, experiment);
    return [makeResult({
      id: "synthetic-scale-500-2000-10000",
      suite: suite.id,
      status: "PASS",
      message: `${experiment.measurements.length} deterministic sizes measured in system temporary storage.`,
      command: "node tools/qa-unified/cli.mjs run --suite=scale --mode=unit",
      durationMs: Date.now() - started,
      artifacts: [path.relative(repoRoot, out)],
    })];
  }
  if (suite.execution === "playwright-smoke") {
    return await runPlaywright({ suite: suite.id, id: "route-smoke", mode, runDir, timeoutMs, browser });
  }
  if (suite.execution === "playwright-responsive") {
    return await runPlaywright({ suite: suite.id, id: "responsive-matrix", mode, runDir, timeoutMs, grep: "responsive overflow", browser });
  }
  if (suite.execution === "performance") {
    return await runPlaywright({ suite: suite.id, id: "performance-measurement", mode, runDir, timeoutMs, grep: "performance sample", browser });
  }
  if (suite.execution === "cross-browser") {
    const engines = browser === "all" ? ["chromium", "firefox", "webkit"] : [browser];
    const results = [];
    for (const engine of engines) {
      results.push(...await runPlaywright({ suite: suite.id, id: `routes-${engine}`, mode, runDir, timeoutMs, browser: engine }));
    }
    return results;
  }

  const webTests = discoverTestFiles(path.join(webRoot, "tests"));
  const archiveTests = discoverTestFiles(path.join(repoRoot, "scripts", "archive", "tests"));
  const qaTests = discoverTestFiles(path.join(repoRoot, "tools", "qa-unified", "tests"));
  if (suite.execution === "publishing") {
    return [await runNodeTests(webTests.filter((file) => /publishing/i.test(path.basename(file))), "publishing-unit", suite.id, timeoutMs)];
  }
  if (suite.execution === "archive") {
    return [await runNodeTests(archiveTests, "archive-unit", suite.id, timeoutMs)];
  }
  if (suite.execution === "editorial") {
    return [await runPythonTests("tools/editorial-review/tests", "editorial-review-unit", suite.id, timeoutMs)];
  }
  if (suite.execution === "repository-unit") {
    return [
      await runNodeTests(webTests, "web-unit", suite.id, timeoutMs),
      await runNodeTests(archiveTests, "archive-unit", suite.id, timeoutMs),
      await runNodeTests(qaTests, "qa-platform-unit", suite.id, timeoutMs),
      await runPythonTests("tools/release-check/tests", "release-check-unit", suite.id, timeoutMs),
      await runPythonTests("tools/editorial-review/tests", "editorial-review-unit", suite.id, timeoutMs),
    ];
  }
  if (suite.execution === "aggregate") {
    const selected = manifest.suites.filter(({ id }) => !["all", "accessibility", "cross-browser", "network", "security"].includes(id));
    const results = [];
    for (const childSuite of selected) {
      if (childSuite.execution === "performance" && mode !== "production") {
        results.push(makeResult({ id: "performance-measurement", suite: childSuite.id, status: "NOT_APPLICABLE", message: "Performance suite requires production mode." }));
        continue;
      }
      const childMode = childSuite.execution?.startsWith("playwright") || childSuite.execution === "performance" ? mode : "unit";
      results.push(...await executeSuite(childSuite, childMode, runDir, timeoutMs, browser));
    }
    return results;
  }
  return [makeResult({ id: suite.id, suite: suite.id, status: "NOT_APPLICABLE", message: `Unknown execution type '${suite.execution}'.` })];
}

function loadReport(input) {
  const filePath = resolveResultPath(input);
  const report = JSON.parse(fs.readFileSync(filePath, "utf8"));
  assertReport(report);
  return report;
}

async function runCommand(options) {
  const suite = findSuite(options.suite);
  const mode = options.mode ?? "unit";
  const browser = options.browser ?? (suite.id === "cross-browser" ? "all" : "chromium");
  if (!["chromium", "firefox", "webkit", "all"].includes(browser)) throw new Error("--browser must be chromium, firefox, webkit, or all.");
  if (!suite.modes.includes(mode)) throw new Error(`Suite '${suite.id}' does not support mode '${mode}'. Supported: ${suite.modes.join(", ") || "none"}`);
  const timeoutMs = Number(options["timeout-ms"] ?? 120_000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 900_000) throw new Error("--timeout-ms must be between 1000 and 900000.");
  const runId = safeRunId(options["run-id"] ?? `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`);
  const runDir = createRunDirectory(runId);
  const started = Date.now();
  let results;
  try {
    results = await executeSuite(suite, mode, runDir, timeoutMs, browser);
  } catch (error) {
    results = [makeResult({ id: suite.id, suite: suite.id, status: "FAIL_INFRA", message: error.message, durationMs: Date.now() - started })];
  }
  const report = createReport({
    runId,
    suite: suite.id,
    mode,
    results,
    commit: await gitValue(["rev-parse", "HEAD"]) || "unknown",
    branch: await gitValue(["branch", "--show-current"]) || "detached",
    dirtyFiles: (await gitValue(["status", "--porcelain=v1"])).split(/\r?\n/).filter(Boolean),
    browsers: mode === "dev" || mode === "production" ? (browser === "all" ? ["chromium", "firefox", "webkit"] : [browser]) : [],
  });
  report.artifacts = [...new Set([
    path.relative(repoRoot, path.join(runDir, "structured-report", "report.json")),
    path.relative(repoRoot, path.join(runDir, "structured-report", "report.md")),
    ...results.flatMap((result) => result.artifacts ?? []),
  ])];
  report.exitCode = results.some((result) => result.status.startsWith("FAIL_") || result.status === "FLAKY" || result.status === "NOT_RUN") ? 1 : 0;
  const jsonPath = path.join(runDir, "structured-report", "report.json");
  const mdPath = path.join(runDir, "structured-report", "report.md");
  assertReport(report);
  writeJsonExclusive(jsonPath, report);
  fs.writeFileSync(mdPath, reportMarkdown(report), { flag: "wx" });
  console.log(JSON.stringify({ runId, report: path.relative(repoRoot, jsonPath), markdown: path.relative(repoRoot, mdPath), counts: report.counts, results }, null, 2));
  if (report.exitCode !== 0) process.exitCode = results.find((result) => result.status.startsWith("FAIL_") || result.status === "NOT_RUN")?.exitCode ?? 1;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") return help();
  if (command === "--version" || command === "version") return console.log(manifest.schemaVersion);
  const options = parseOptions(args);
  if (command === "doctor") {
    assertAllowed(options, ["port"], command);
    return doctor(options);
  }
  if (command === "inventory") return inventory();
  if (command === "plan") {
    assertAllowed(options, ["suite", "target", "mode"], command);
    return plan(options);
  }
  if (command === "run") {
    assertAllowed(options, ["suite", "mode", "browser", "run-id", "timeout-ms"], command);
    return runCommand(options);
  }
  if (command === "report") {
    assertAllowed(options, ["input", "format", "output"], command);
    if (!options.input) throw new Error("report requires --input=qa/results/<run-id>/structured-report/report.json");
    const report = loadReport(options.input);
    const format = options.format ?? "md";
    if (!["json", "md"].includes(format)) throw new Error("--format must be json or md.");
    const output = format === "json" ? `${JSON.stringify(report, null, 2)}\n` : reportMarkdown(report);
    if (options.output) {
      const outputPath = resolveResultPath(options.output);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, output, { flag: "wx" });
    } else process.stdout.write(output);
    return;
  }
  if (command === "compare") {
    assertAllowed(options, ["baseline", "current"], command);
    if (!options.baseline || !options.current) throw new Error("compare requires --baseline and --current report paths.");
    console.log(JSON.stringify(compareReports(loadReport(options.baseline), loadReport(options.current)), null, 2));
    return;
  }
  if (command === "synthetic") {
    assertAllowed(options, ["count", "seed"], command);
    const count = Number(options.count ?? "1000");
    const seed = Number(options.seed ?? "42");
    console.log(JSON.stringify({ count, seed, records: generateSyntheticRecords(count, seed).slice(0, 3), deterministic: true, storedInArchive: false }, null, 2));
    return;
  }
  throw new Error(`Unknown command '${command}'. Use --help.`);
}

main().catch((error) => {
  console.error(`QA CLI error: ${error.message}`);
  process.exitCode = 2;
});
