import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptRoot, "..", "..", "..");

export function runLegacyScripts({ target = "next", baseUrl, runner = spawnSync, logError = console.error, root = repoRoot, scriptsDirectory = scriptRoot } = {}) {
  const scripts = ["responsive-regression.mjs", "a11y-smoke.mjs", "perf-measure.mjs"];
  for (const script of scripts) {
    const scriptPath = path.join(scriptsDirectory, script);
    if (!fs.existsSync(scriptPath)) {
      logError(`Required QA script is missing: ${path.relative(root, scriptPath)}`);
      return 1;
    }
    const args = [`--target=${target}`];
    if (baseUrl) args.push(`--baseUrl=${baseUrl}`);
    const result = runner(process.execPath, [scriptPath, ...args], { cwd: root, shell: false, stdio: "inherit" });
    if (result.error || result.status !== 0) {
      logError(`Script failed: ${script} with status ${result.status ?? "spawn error"}`);
      return result.status ?? 1;
    }
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv.find((value) => value.startsWith("--target="))?.split("=")[1] ?? "next";
  const baseUrl = process.argv.find((value) => value.startsWith("--baseUrl="))?.split("=")[1];
  process.exitCode = runLegacyScripts({ target, baseUrl });
}
