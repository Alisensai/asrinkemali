import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planScheduledPublications } from "../../web/lib/publishing/scheduler.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const recordsDirectory = path.join(root, "content", "publications", "records");
const ledgerPath = path.join(root, "content", "publications", "publication-ledger.json");
const records = existsSync(recordsDirectory) ? readdirSync(recordsDirectory).filter((name) => name.endsWith(".json")).map((name) => JSON.parse(readFileSync(path.join(recordsDirectory, name), "utf8"))) : [];
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, "utf8")) : [];
const nowArgument = process.argv.find((value) => value.startsWith("--now="));
const now = nowArgument?.slice(6) ?? new Date().toISOString();
const plan = planScheduledPublications(records, ledger, now);
process.stdout.write(`${JSON.stringify({ mode: "dry-run", now, ...plan }, null, 2)}\n`);
