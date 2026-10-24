import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatPublishingReport, planPublicationDryRun } from "../../web/lib/publishing-integrations/index.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const option = (name) => args.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
const format = option("--format") ?? "json";
const now = option("--now") ?? new Date().toISOString();
if (!["json", "markdown"].includes(format)) throw new Error("--format=json veya --format=markdown olmalıdır.");
if (Number.isNaN(Date.parse(now))) throw new Error("--now geçerli bir ISO zaman olmalıdır.");

function jsonFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).filter((name) => name.endsWith(".json")).sort((a, b) => a.localeCompare(b, "tr")).flatMap((name) => {
    try { return [JSON.parse(readFileSync(path.join(directory, name), "utf8"))]; }
    catch { return []; }
  });
}

const records = jsonFiles(path.join(root, "content", "publications", "records"));
const archiveRecords = ["content/archive/records", "data/archive/catalog"].flatMap((directory) => jsonFiles(path.join(root, directory)));
const ledgerPath = path.join(root, "content", "publications", "publication-ledger.json");
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, "utf8")) : [];
const report = { generatedAt: now, mode: "read_only_dry_run", ...planPublicationDryRun({ records, ledger, archiveRecords, now }) };
const output = formatPublishingReport(report, format);
const out = option("--out");
if (out) {
  const resolved = path.resolve(root, out);
  const reportRoot = path.resolve(root, "reports", "publishing-integration");
  if (!resolved.startsWith(`${reportRoot}${path.sep}`)) throw new Error("--out yalnız reports/publishing-integration/ altında olabilir; içerik ve ledger yazılamaz.");
  if (existsSync(resolved)) throw new Error("--out hedefi mevcut; salt-okunur araç dosya üzerine yazmaz.");
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, output, { encoding: "utf8", flag: "wx" });
} else process.stdout.write(output);
