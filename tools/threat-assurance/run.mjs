import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildReport, renderArchitecture, renderMarkdown, validateAssessment, validateReportShape } from "./engine.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = async (file) => JSON.parse(await readFile(resolve(root, file), "utf8"));
const assessment = await readJson("tools/threat-assurance/assessment.json");
const schema = await readJson("tools/threat-assurance/schema.json");
const errors = validateAssessment(assessment, { repoRoot: root });
if (errors.length) {
  console.error(errors.map((item) => `- ${item}`).join("\n"));
  process.exitCode = 1;
} else {
  const report = buildReport(assessment);
  const reportErrors = validateReportShape(report, schema);
  if (reportErrors.length) {
    console.error(reportErrors.map((item) => `- ${item}`).join("\n"));
    process.exitCode = 1;
  } else {
    const outputs = new Map([
      ["docs/security/threat-assurance/REPORT.json", `${JSON.stringify(report, null, 2)}\n`],
      ["docs/security/threat-assurance/REPORT.md", renderMarkdown(report)],
      ["docs/security/threat-assurance/ARCHITECTURE.md", renderArchitecture(report)],
    ]);
    const checkOnly = process.argv.includes("--check");
    if (checkOnly) {
      for (const [file, expected] of outputs) {
        let actual;
        try {
          actual = await readFile(resolve(root, file), "utf8");
        } catch {
          console.error(`Missing generated report: ${file}`);
          process.exitCode = 1;
          continue;
        }
        if (actual !== expected) {
          console.error(`Generated report is stale: ${file}`);
          process.exitCode = 1;
        }
      }
      if (process.exitCode !== 1) console.log("Threat-assurance data and generated reports are valid and current.");
    } else {
      for (const [file, content] of outputs) {
        const target = resolve(root, file);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, content, "utf8");
        console.log(`Wrote ${file}`);
      }
    }
  }
}
