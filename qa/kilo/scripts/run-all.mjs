import { spawnSync } from "node:child_process";

const target = process.argv.find((value) => value.startsWith("--target="))?.split("=")[1] ?? "next";
for (const script of ["responsive-regression.mjs", "a11y-smoke.mjs"]) {
  const result = spawnSync(process.execPath, [`qa/kilo/scripts/${script}`, `--target=${target}`], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
