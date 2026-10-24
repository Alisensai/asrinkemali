import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { runProcess, repoRoot } from "../lib/runtime.mjs";

const cliPath = path.join(repoRoot, "tools", "qa-unified", "cli.mjs");

test("CLI help and version are available", async () => {
  const help = await runProcess(process.execPath, [cliPath, "--help"]);
  assert.equal(help.code, 0);
  assert.match(help.stdout, /Available suites/);
  const version = await runProcess(process.execPath, [cliPath, "--version"]);
  assert.equal(version.code, 0);
  assert.match(version.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test("CLI rejects unknown suites, malformed options, and unsafe run ids", async () => {
  const unknown = await runProcess(process.execPath, [cliPath, "run", "--suite=does-not-exist", "--mode=unit"]);
  assert.equal(unknown.code, 2);
  assert.match(unknown.stderr, /Unknown suite/);

  const malformed = await runProcess(process.execPath, [cliPath, "plan", "--target=v06", "--unknown=value"]);
  assert.equal(malformed.code, 2);
  assert.match(malformed.stderr, /Unknown plan option/);

  const unsafe = await runProcess(process.execPath, [cliPath, "run", "--suite=scale", "--mode=unit", "--run-id=..%2F.."]);
  assert.equal(unsafe.code, 2);
  assert.match(unsafe.stderr, /run-id/);
});

test("CLI inventory reports absent modules without claiming their tests passed", async () => {
  const result = await runProcess(process.execPath, [cliPath, "inventory"]);
  assert.equal(result.code, 0);
  const inventory = JSON.parse(result.stdout);
  const atlas = inventory.modules.find(({ moduleId }) => moduleId === "historical-atlas");
  assert.equal(atlas.status, "NOT_INTEGRATED");
  assert.equal(atlas.unitCommand, "NOT_INTEGRATED");
});

test("CLI refuses report paths outside qa/results", async () => {
  const result = await runProcess(process.execPath, [cliPath, "report", "--input=../../package.json"]);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /inside qa[\\/]results/);
});
