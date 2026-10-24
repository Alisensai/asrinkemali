import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { assertSafeOutput, escapeCsvCell, readCandidates, stageRows } from "./core.mjs";

const root = path.resolve(new URL("../../../", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const args = process.argv.slice(2);
const command = args[0];
const get = (name) => args.find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
const fail = (code, message, exitCode = 2) => {
  process.stderr.write(`${JSON.stringify({ code, message })}\n`);
  process.exitCode = exitCode;
};
const help = () => process.stdout.write([
  "Kullanım: node src/cli.mjs preview|validate|stage --input=YOL --profile=generic-catalog-v1",
  "Varsayılan çevrimdışıdır ve katalog/yayın mutasyonu yapmaz.",
  "Yalnız stage --write-staging --out=data/ingest-staging/RUN yazabilir; --commit/--publish yasaktır.",
].join("\n") + "\n");

function ensureSafeDirectory(target) {
  const stagingRoot = path.resolve(root, "data", "ingest-staging");
  const relative = path.relative(stagingRoot, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("STAGING_OUTPUT_FORBIDDEN");
  let current = stagingRoot;
  for (const part of relative.split(path.sep)) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("STAGING_SYMLINK_FORBIDDEN");
    current = path.join(current, part);
  }
  if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("STAGING_SYMLINK_FORBIDDEN");
}

function reportMarkdown(manifest) {
  return [
    "# Arşiv içe aktarma — staging raporu", "",
    `- Mod: ${manifest.mode}`, `- Durum: ${manifest.status}`,
    `- İşlenen satır: ${manifest.recordCounts.seen}`,
    `- Staging adayı: ${manifest.recordCounts.staged}`,
    `- Engellenen: ${manifest.recordCounts.blocked}`,
    "- Yayın uygunluğu: hayır (insan incelemesi gerekir)", "", "## Engeller", "",
    ...(manifest.findings.length ? manifest.findings.map((finding) => `- Satır ${finding.row}: ${finding.codes.join(", ")}`) : ["- Yok"]), "",
  ].join("\n");
}

function issuesCsv(manifest) {
  const header = ["row", "id", "severity", "codes"];
  const body = manifest.findings.map((finding) => [finding.row, finding.id ?? "", finding.severity, finding.codes.join("|")]);
  return [header, ...body].map((line) => line.map(escapeCsvCell).join(",")).join("\n") + "\n";
}

function atomicWrite(file, content) {
  const temp = `${file}.tmp-${process.pid}`;
  writeFileSync(temp, content, { flag: "wx", encoding: "utf8" });
  renameSync(temp, file);
}

function writeStaging(target, manifest) {
  ensureSafeDirectory(target);
  const artifacts = new Map([
    ["ingest-run.json", `${JSON.stringify(manifest, null, 2)}\n`],
    ["ingest-run.md", reportMarkdown(manifest)],
    ["ingest-issues.csv", issuesCsv(manifest)],
  ]);
  if (existsSync(target)) {
    const identical = [...artifacts].every(([name, content]) => existsSync(path.join(target, name)) && readFileSync(path.join(target, name), "utf8") === content);
    if (identical) return { written: false, reason: "IDEMPOTENT_NOOP" };
    throw new Error("STAGING_CONFLICT");
  }
  mkdirSync(target, { recursive: true });
  for (const [name, content] of artifacts) atomicWrite(path.join(target, name), content);
  return { written: true, reason: "STAGED" };
}

try {
  if (args.includes("--help") || args.includes("-h")) help();
  else if (args.includes("--commit") || args.includes("--publish") || args.includes("--approve") || args.includes("--approved") || args.includes("--human-reviewed")) fail("SIDE_EFFECTING_FLAGS_FORBIDDEN", "Bu araç gerçek katalog/yayın mutasyonu yapmaz.", 3);
  else if (!['preview', 'validate', 'stage'].includes(command)) fail("COMMAND_INVALID", "preview, validate veya stage kullanın.");
  else if (get("--profile") !== "generic-catalog-v1") fail("PROFILE_REQUIRED", "Bu sürüm yalnız --profile=generic-catalog-v1 kabul eder.");
  else {
    const input = get("--input");
    if (!input) throw new Error("INPUT_REQUIRED");
    const { rows, inputSha256 } = readCandidates(path.resolve(input));
    const result = stageRows(rows, { inputSha256, root, generatedAt: get("--generated-at") ?? new Date().toISOString() });
    if (command === "stage") {
      if (!args.includes("--write-staging")) throw new Error("WRITE_STAGING_REQUIRED");
      const out = get("--out");
      if (!out) throw new Error("STAGING_OUTPUT_REQUIRED");
      const rootRelativeOut = path.relative(root, path.resolve(out));
      result.manifest.stagingWrite = writeStaging(assertSafeOutput(root, rootRelativeOut), result.manifest);
    }
    process.stdout.write(`${JSON.stringify(result.manifest, null, 2)}\n`);
  }
} catch (error) {
  const code = error instanceof Error ? error.message : "UNEXPECTED_ERROR";
  fail(code, "İçe aktarma tamamlanamadı; ayrıntı güvenlik nedeniyle redakte edildi.", /FORBIDDEN|SECURITY|PROTOTYPE/.test(code) ? 3 : /CONFLICT/.test(code) ? 4 : 2);
}
