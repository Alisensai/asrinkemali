import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv.find((value) => value.startsWith("--target="))?.split("=")[1] ?? "next";
const baseUrl = process.argv.find((value) => value.startsWith("--baseUrl="))?.split("=")[1];

const scripts = ["responsive-regression.mjs", "a11y-smoke.mjs", "perf-measure.mjs"];
for (const script of scripts) {
  const args = [`--target=${target}`];
  if (baseUrl) args.push(`--baseUrl=${baseUrl}`);
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`Script failed: ${script} with status ${result.status}`);
  }
}
