import path from "node:path";
import { fileURLToPath } from "node:url";
import { runLab } from "./engine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const baseUrl = process.env.MKA_SECURITY_LAB_BASE_URL ?? "http://127.0.0.1:49499";
const outputFile = process.env.MKA_SECURITY_LAB_REPORT ?? path.join(root, "docs", "security", "security-lab", "reports", "latest.json");
const report = await runLab({ baseUrl, outputFile });
console.log(JSON.stringify({ target: report.target, ...report.summary, report: outputFile }));
process.exitCode = report.summary.failed === 0 ? 0 : 1;
