#!/usr/bin/env node
// MKA FORTRESS — bağımlılık ve CI tedarik zinciri denetimi (salt-okunur).
//   node tools/mka-fortress/supply-chain.mjs [--compare=git:REF] [--audit]
// --audit: npm audit'i (yalnız kayıt defterinden okuma) çalıştırır.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { argument, REPO_ROOT } from "./lib/common.mjs";

export const PACKAGES = ["package.json", "web/package.json"];
const SHA_PIN = /@[0-9a-f]{40}$/;

/** Kilit dosyası bütünlüğü: her paket https kayıt defterinden, sha512 bütünlük özetiyle, package.json ile uyumlu. */
export function auditLockfile(pkg, lock) {
  const problems = []; const packages = lock.packages ?? {};
  if (lock.lockfileVersion < 2) problems.push({ code: "LOCKFILE_VERSION_OLD", version: lock.lockfileVersion });
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };
  const rootEntry = packages[""] ?? {};
  for (const [name, spec] of Object.entries(declared)) {
    const recorded = { ...rootEntry.dependencies, ...rootEntry.devDependencies }[name];
    if (recorded !== spec) problems.push({ code: "LOCK_SPEC_MISMATCH", name, packageJson: spec, lockfile: recorded ?? null });
    if (!packages[`node_modules/${name}`]) problems.push({ code: "LOCK_MISSING_PACKAGE", name });
  }
  let transitive = 0;
  for (const [location, entry] of Object.entries(packages)) {
    if (!location || entry.link) continue;
    transitive += 1;
    if (entry.resolved && !entry.resolved.startsWith("https://registry.npmjs.org/")) problems.push({ code: "NON_REGISTRY_SOURCE", location, resolved: entry.resolved });
    if (entry.resolved && !/^sha512-/.test(entry.integrity ?? "")) problems.push({ code: "WEAK_OR_MISSING_INTEGRITY", location });
    if (entry.hasInstallScript) problems.push({ code: "INSTALL_SCRIPT", location, severity: "info" });
  }
  const direct = Object.entries(declared).map(([name, spec]) => ({ name, spec, locked: packages[`node_modules/${name}`]?.version ?? null, exactPin: /^\d+\.\d+\.\d+$/.test(spec), dev: Boolean(pkg.devDependencies?.[name]) }));
  return { direct, transitive, problems };
}

/** Kaynak kodunda hiç içe aktarılmayan doğrudan bağımlılıklar (olası kullanılmayan; araç bağımlılıkları elle değerlendirilmeli). */
export function possiblyUnused(direct, sourceText) {
  const toolOnly = new Set(["typescript", "eslint", "eslint-config-next", "@types/node", "@types/react", "@types/react-dom", "@playwright/test", "playwright", "next", "react-dom"]);
  return direct.filter(({ name }) => !toolOnly.has(name) && !sourceText.includes(`"${name}`) && !sourceText.includes(`'${name}`)).map(({ name }) => name);
}

/** İş akışı denetimi: en az yetki, SHA sabitleme, tehlikeli tetikleyiciler, sır kullanımı. */
export function auditWorkflow(name, text) {
  const findings = [];
  if (!/^permissions:/m.test(text)) findings.push({ workflow: name, code: "NO_TOP_LEVEL_PERMISSIONS", severity: "high" });
  for (const match of text.matchAll(/^\s*([a-z-]+):\s*write\b/gm)) findings.push({ workflow: name, code: "WRITE_PERMISSION", scope: match[1], severity: "high" });
  if (/write-all/.test(text)) findings.push({ workflow: name, code: "WRITE_ALL", severity: "critical" });
  if (/pull_request_target/.test(text)) findings.push({ workflow: name, code: "PULL_REQUEST_TARGET", severity: "high" });
  for (const match of text.matchAll(/uses:\s*([^\s#]+)/g)) {
    const action = match[1];
    if (action.startsWith("./")) continue;
    if (!SHA_PIN.test(action)) findings.push({ workflow: name, code: "ACTION_NOT_SHA_PINNED", action, severity: "medium" });
  }
  for (const match of text.matchAll(/\$\{\{\s*secrets\.([A-Z0-9_]+)/g)) findings.push({ workflow: name, code: "USES_SECRET", secret: match[1], severity: "info" });
  if (/\$\{\{\s*github\.event\.(issue|pull_request|comment)\.[a-z_.]*(title|body|head_ref)/.test(text)) findings.push({ workflow: name, code: "UNTRUSTED_INPUT_IN_EXPRESSION", severity: "high" });
  return findings;
}

function readJson(file, ref, root) { return JSON.parse(ref ? execFileSync("git", ["show", `${ref}:${file}`], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }) : readFileSync(path.join(root, file), "utf8")); }

/** Kilit dosyasındaki sürüm değişiklikleri (eklenen/kaldırılan/güncellenen). */
export function lockDiff(before, after) {
  const versions = (lock) => Object.fromEntries(Object.entries(lock.packages ?? {}).filter(([location]) => location).map(([location, entry]) => [location, entry.version]));
  const a = versions(before); const b = versions(after); const changes = [];
  for (const [location, version] of Object.entries(b)) if (!(location in a)) changes.push({ location, change: "added", to: version }); else if (a[location] !== version) changes.push({ location, change: "updated", from: a[location], to: version });
  for (const location of Object.keys(a)) if (!(location in b)) changes.push({ location, change: "removed", from: a[location] });
  return changes;
}

export function main(argv, root = REPO_ROOT) {
  const report = { packages: {}, workflows: [], audit: null, lockChanges: null };
  const sources = execFileSync("git", ["ls-files", "web/app", "web/components", "web/lib", "web/e2e", "web/tests", "scripts", "qa", "tools"], { cwd: root, encoding: "utf8" }).split("\n").filter((file) => /\.(tsx?|mjs|js)$/.test(file)).map((file) => readFileSync(path.join(root, file), "utf8")).join("\n");
  for (const file of PACKAGES) {
    const lockFile = file.replace("package.json", "package-lock.json");
    if (!existsSync(path.join(root, lockFile))) { report.packages[file] = { problems: [{ code: "LOCKFILE_MISSING" }] }; continue; }
    const result = auditLockfile(readJson(file, null, root), readJson(lockFile, null, root));
    report.packages[file] = { ...result, possiblyUnused: possiblyUnused(result.direct, sources + readFileSync(path.join(root, file), "utf8").replace(/"(dependencies|devDependencies)"[\s\S]*?}/g, "")) };
  }
  const workflowDir = path.join(root, ".github", "workflows");
  for (const name of existsSync(workflowDir) ? readdirSync(workflowDir).filter((item) => /\.ya?ml$/.test(item)) : []) report.workflows.push(...auditWorkflow(name, readFileSync(path.join(workflowDir, name), "utf8")));
  const compare = argument(argv, "compare");
  if (typeof compare === "string" && compare.startsWith("git:")) { const ref = compare.slice(4); report.lockChanges = Object.fromEntries(PACKAGES.map((file) => { const lockFile = file.replace("package.json", "package-lock.json"); try { return [lockFile, lockDiff(readJson(lockFile, ref, root), readJson(lockFile, null, root))]; } catch { return [lockFile, "referansta yok"]; } })); }
  if (argument(argv, "audit")) report.audit = Object.fromEntries(["", "web"].map((directory) => { const result = spawnSync("npm audit --json", { cwd: path.join(root, directory), encoding: "utf8", shell: true }); try { const parsed = JSON.parse(result.stdout); return [directory || ".", parsed.metadata?.vulnerabilities ?? parsed]; } catch { return [directory || ".", { error: "npm audit çalıştırılamadı" }]; } }));
  const blocking = Object.values(report.packages).flatMap((item) => item.problems ?? []).filter((problem) => problem.severity !== "info").length + report.workflows.filter((finding) => ["critical", "high"].includes(finding.severity)).length;
  report.ok = blocking === 0;
  console.log(JSON.stringify(report, null, 2));
  return report.ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) process.exitCode = main(process.argv.slice(2));
