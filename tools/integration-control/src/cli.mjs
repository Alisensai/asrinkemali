#!/usr/bin/env node
// MKA entegrasyon kontrol düzlemi CLI. Varsayılan olarak hiçbir dosyaya veya uzak depoya YAZMAZ.
//   collect   [--out=F]                 canlı GitHub verisini (salt-okunur) anlık görüntüye toplar
//   inventory [--snapshot=F] [--format=json|md|csv] [--out=F] [--target=REF]
//   graph     [--snapshot=F]            dal tabanlı DAG, topolojik sıra, Mermaid
//   conflicts [--snapshot=F]            ortak dosya matrisi, metin çakışması (merge-tree), semantik riskler
//   gates     --report=release-quality.json
//   plan      --prs=25,23 [--snapshot=F] / rehearse --prs=... --execute-rehearsal [--commands=unit,typecheck,build]
//   tasks     [--validate]
//   report    --snapshot=F              tüm raporları docs/integration-control/reports altına üretir
import { readFileSync } from "node:fs";
import path from "node:path";
import { createGitAdapter, createGithubAdapter } from "./adapters.mjs";
import { ancestorsOf, buildGraph, classifyInclusion, layerOf, manifestEntry, mermaid, referencedPrs, summarizeChecks, topologicalOrder, validateOrder } from "./analysis.mjs";
import { collisionMatrix, crossPrSemanticConflicts, rateRisk, semanticRisks } from "./conflicts.mjs";
import { ciMatrix, classifyReleaseReport } from "./gates.mjs";
import { csv, inventoryMarkdown, REPO_ROOT, REPORT_DIR, stableStringify, writeOutput } from "./output.mjs";
import { executeRehearsal, planRehearsal } from "./rehearsal.mjs";
import { assertExpectedRepo, assertPrNumber, assertRef, run } from "./safety.mjs";
import { seedTasks, validateTasks } from "./tasks.mjs";

export const DEFAULT_TARGET = "origin/integration/asrinkemali-v06-release-candidate";
const SNAPSHOT_TTL_HOURS = 24;
const arg = (argv, name, fallback = null) => { const found = argv.find((value) => value === `--${name}` || value.startsWith(`--${name}=`)); if (!found) return fallback; return found.includes("=") ? found.slice(found.indexOf("=") + 1) : true; };

/** Canlı toplama: PR listesi (sayfalı), ayrıntı, değişen dosyalar, son baş SHA kontrol koşuları. */
export function collect(github, { now = new Date().toISOString() } = {}) {
  const list = github.listPullRequests();
  const prs = list.map((raw) => {
    const detail = github.getPullRequest(raw.number);
    const files = github.listFiles(raw.number).map((file) => file.filename);
    const checkRuns = raw.head?.sha ? github.listCheckRuns(raw.head.sha) : [];
    return { raw: { number: raw.number, title: raw.title, state: raw.state, draft: raw.draft, merged_at: raw.merged_at, user: { login: raw.user?.login }, created_at: raw.created_at, updated_at: raw.updated_at, base: { ref: raw.base?.ref, sha: raw.base?.sha }, head: { ref: raw.head?.ref, sha: raw.head?.sha }, body: (raw.body ?? "").slice(0, 4000) }, detail: { mergeable: detail.mergeable, mergeable_state: detail.mergeable_state, commits: detail.commits, changed_files: detail.changed_files, additions: detail.additions, deletions: detail.deletions, requested_reviewers: detail.requested_reviewers ?? [] }, files, filesTruncated: (detail.changed_files ?? 0) > files.length, checkRuns: checkRuns.map((runItem) => ({ name: runItem.name, status: runItem.status, conclusion: runItem.conclusion, head_sha: runItem.head_sha, completed_at: runItem.completed_at })) };
  });
  return { schema: "mka-integration/snapshot@1", sourceMode: "live", lastFetchedAt: now, prs: prs.sort((a, b) => a.raw.number - b.raw.number) };
}

export function loadSnapshot(file, { now = Date.now() } = {}) {
  const snapshot = JSON.parse(readFileSync(file, "utf8"));
  if (snapshot.schema !== "mka-integration/snapshot@1" || !Array.isArray(snapshot.prs)) throw new Error("Tanınmayan anlık görüntü şeması.");
  const ageHours = (now - Date.parse(snapshot.lastFetchedAt)) / 3_600_000;
  return { ...snapshot, sourceMode: snapshot.sourceMode === "live" ? "offline-snapshot" : snapshot.sourceMode, stale: !(ageHours <= SNAPSHOT_TTL_HOURS) };
}

/** Envanter: anlık görüntü + yerel git ile V0.6'ya içerilme. Anlık görüntüdeki baş SHA yerel ref'ten farklıysa stale. */
export function buildInventory(snapshot, git, { target = DEFAULT_TARGET } = {}) {
  const targetSha = git.resolve(assertRef(target));
  const staleHeads = [];
  const prs = snapshot.prs.map(({ raw, detail, files, filesTruncated, checkRuns }) => {
    const localHead = git.resolve(`origin/pr/${raw.number}`);
    if (localHead && raw.head?.sha && localHead !== raw.head.sha) staleHeads.push({ pr: raw.number, snapshot: raw.head.sha, local: localHead });
    const haveObject = raw.head?.sha ? git.resolve(raw.head.sha) : null;
    const inclusion = haveObject && targetSha ? classifyInclusion(git, raw.head.sha, targetSha) : { status: "unknown", reason: "baş commit yerelde yok (git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*')" };
    const entry = manifestEntry(raw, detail, { inclusion, checks: summarizeChecks(checkRuns ?? [], raw.head?.sha), explicitDependencies: referencedPrs(raw.body, raw.number), lastCheckedAt: snapshot.lastFetchedAt });
    entry.layer = layerOf(entry); entry.filesTruncated = Boolean(filesTruncated); entry.fileCount = files?.length ?? null;
    return entry;
  });
  const graph = buildGraph(prs);
  for (const pr of prs) {
    pr.discoveredDependencies = ancestorsOf(graph, pr.number).sort((a, b) => a - b);
    const editorialBlocked = pr.checks?.checks && Object.entries(pr.checks.checks).some(([name, state]) => /release-quality/i.test(name) && state === "failure");
    const technicalFailed = pr.checks?.checks && Object.entries(pr.checks.checks).some(([name, state]) => !/release-quality/i.test(name) && state === "failure");
    pr.blockers = [...(pr.ancestryStatus === "ancestor_included" ? ["Kod zaten V0.6 geçmişinde: ikinci kez birleştirme/cherry-pick yapılmamalı"] : []), ...(technicalFailed ? ["Teknik CI başarısız (son baş SHA)"] : []), ...(editorialBlocked ? ["release-quality başarısız: teknik/editoryal ayrımı için rapor artefaktı incelenmeli (gates komutu)"] : [])];
    pr.recommendedAction = pr.ancestryStatus === "ancestor_included" ? "kapat-veya-arşivle önerisi (kullanıcı kararı); yeniden entegre etme" : pr.discoveredDependencies.length ? `önce bağımlılık zinciri: ${pr.discoveredDependencies.map((number) => `#${number}`).join(" → ")}` : "izole prova + teknik doğrulama";
  }
  return { schema: "mka-integration/inventory@1", sourceMode: snapshot.sourceMode, lastFetchedAt: snapshot.lastFetchedAt, stale: Boolean(snapshot.stale) || staleHeads.length > 0, staleHeads, target: { ref: target, sha: targetSha }, prs, graph };
}

export function buildConflicts(snapshot, inventory, git, { textualFor = "open-not-included" } = {}) {
  const candidates = inventory.prs.filter((pr) => pr.state === "open" && (textualFor === "all" || pr.ancestryStatus !== "ancestor_included"));
  const filesByPr = Object.fromEntries(candidates.map((pr) => [pr.number, snapshot.prs.find((item) => item.raw.number === pr.number)?.files ?? []]));
  const pairs = collisionMatrix(filesByPr).map((pair) => {
    const a = inventory.prs.find((pr) => pr.number === pair.a); const b = inventory.prs.find((pr) => pr.number === pair.b);
    const textual = pair.sharedCodeFiles.length || pair.sharedScreenshots.length ? git.mergeTree(a.headSha, b.headSha) : null;
    return { ...pair, textual, risk: rateRisk(pair, textual) };
  });
  const risksByPr = candidates.map((pr) => semanticRisks(pr.number, filesByPr[pr.number]));
  return { schema: "mka-integration/conflicts@1", basedOn: { lastFetchedAt: inventory.lastFetchedAt, target: inventory.target }, analyzedPrs: candidates.map((pr) => pr.number), pairs: pairs.sort((x, y) => ["critical", "high", "medium", "low"].indexOf(x.risk.level) - ["critical", "high", "medium", "low"].indexOf(y.risk.level) || x.a - y.a || x.b - y.b), semantic: risksByPr.flat(), crossPrSemantic: crossPrSemanticConflicts(risksByPr) };
}

const COMMANDS = { unit: { name: "web unit", command: "npm", args: ["test"], cwd: "web" }, typecheck: { name: "typecheck", command: "npx", args: ["tsc", "--noEmit"], cwd: "web" }, lint: { name: "lint", command: "npm", args: ["run", "lint"], cwd: "web" }, build: { name: "build", command: "npm", args: ["run", "build"], cwd: "web", kind: "build" }, install: { name: "npm ci", command: "npm", args: ["ci", "--no-audit", "--no-fund"], cwd: "web", timeoutMs: 900_000 }, archive: { name: "archive tests", command: "node", args: ["--test", "scripts/archive/tests/*.test.mjs"], cwd: "." } };

/** Prova komutu: önceden tanımlı ad veya doğrulanmış `e2e:<spec>` (kabuk yok, yol deseni denetimli). */
export function resolveCommand(name) {
  if (COMMANDS[name]) return COMMANDS[name];
  const spec = name.startsWith("e2e:") ? name.slice(4) : null;
  // Prova e2e'si her zaman kendi rastgele portunu kullanır; başka ajanın sunucusuna bağlanmaz.
  if (spec && /^e2e\/[A-Za-z0-9._/-]+\.spec\.ts$/.test(spec) && !spec.includes("..")) return { name: `e2e ${spec}`, command: "npx", args: ["playwright", "test", spec, "--project=desktop-1536x1024", "--reporter=line"], cwd: "web", timeoutMs: 900_000, env: { ASRIN_E2E_PORT: String(50000 + Math.floor(Math.random() * 9000)) } };
  throw new Error(`Bilinmeyen veya güvensiz prova komutu: ${name.slice(0, 60)}`);
}

export async function main(argv, { runner = run, github = null, cwd = REPO_ROOT, log = console.log } = {}) {
  const [command] = argv;
  assertExpectedRepo(cwd, runner);
  const git = createGitAdapter({ runner, cwd });
  const getSnapshot = () => { const file = arg(argv, "snapshot"); return typeof file === "string" ? loadSnapshot(path.resolve(file)) : collect(github ?? createGithubAdapter({ runner, cwd })); };
  const target = String(arg(argv, "target", DEFAULT_TARGET));
  const emit = (content, defaultName) => { const out = arg(argv, "out"); if (typeof out === "string") { log(`yazıldı: ${path.relative(REPO_ROOT, writeOutput(path.resolve(out), content)) || defaultName}`); } else log(content); };

  if (command === "collect") { emit(stableStringify(getSnapshot()), "snapshot.json"); return 0; }
  if (command === "inventory") {
    const inventory = buildInventory(getSnapshot(), git, { target });
    const format = String(arg(argv, "format", "json"));
    if (format === "md") emit(inventoryMarkdown(inventory), "pr-inventory.md");
    else if (format === "csv") emit(csv(["number", "title", "state", "draft", "baseRef", "headRef", "headSha", "inclusion", "mergeable"], inventory.prs.map((pr) => [pr.number, pr.title, pr.state, pr.isDraft, pr.baseRef, pr.headRef, pr.headSha, pr.ancestryStatus, pr.mergeable])), "pr-inventory.csv");
    else emit(stableStringify(inventory), "pr-inventory.json");
    return inventory.stale ? 3 : 0;
  }
  if (command === "graph") { const inventory = buildInventory(getSnapshot(), git, { target }); const order = topologicalOrder(inventory.graph); emit(`${mermaid(inventory.graph, inventory.prs)}\n\n%% topolojik sıra: ${order.map((number) => `#${number}`).join(" ")}\n`, "dependency-graph.mmd"); return 0; }
  if (command === "conflicts") { const snapshot = getSnapshot(); const inventory = buildInventory(snapshot, git, { target }); emit(stableStringify(buildConflicts(snapshot, inventory, git)), "conflicts.json"); return 0; }
  if (command === "gates") { const file = arg(argv, "report"); if (typeof file !== "string") throw new Error("--report=release-quality.json gerekli"); emit(stableStringify(classifyReleaseReport(JSON.parse(readFileSync(path.resolve(file), "utf8")))), "release-gates.json"); return 0; }
  if (command === "tasks") { const tasks = seedTasks(new Date().toISOString()); const validation = validateTasks(tasks); emit(stableStringify({ schema: "mka-integration/tasks@1", validation, tasks }), "task-manifest.json"); return validation.ok ? 0 : 1; }
  if (command === "plan" || command === "rehearse") {
    const numbers = String(arg(argv, "prs", "")).split(",").filter(Boolean).map(assertPrNumber);
    const inventory = buildInventory(getSnapshot(), git, { target });
    const steps = numbers.map((number) => { const pr = inventory.prs.find((item) => item.number === number); if (!pr?.headSha) throw new Error(`PR #${number} envanterde yok`); return { pr: number, sha: pr.headSha }; });
    const baseSha = inventory.target.sha;
    const included = new Set(inventory.prs.filter((pr) => pr.ancestryStatus === "ancestor_included").map((pr) => pr.number));
    const plan = planRehearsal({ baseSha, steps, graph: inventory.graph, validateOrder: (graph, sequence) => validateOrder(graph, sequence, included) });
    if (command === "plan" || arg(argv, "execute-rehearsal") !== true) { emit(stableStringify({ ...plan, note: "Yalnız plan. Gerçekten denemek için: rehearse --execute-rehearsal" }), "rehearsal-plan.json"); return plan.orderValid ? 0 : 1; }
    if (!plan.orderValid) { emit(stableStringify({ ...plan, status: "blocked_on_pr_dependency" }), "rehearsal-result.json"); return 1; }
    const commands = String(arg(argv, "commands", "")).split(",").filter(Boolean).map(resolveCommand);
    const result = executeRehearsal({ repoDir: cwd, baseSha, steps, commands, runner, keep: arg(argv, "keep") === true });
    emit(stableStringify(result), "rehearsal-result.json");
    return ["clean_merge_possible", "validated_in_rehearsal"].includes(result.status) && result.mainRepoUnchanged ? 0 : 1;
  }
  if (command === "report") {
    const snapshot = getSnapshot(); const inventory = buildInventory(snapshot, git, { target });
    writeOutput(path.join(REPORT_DIR, "pr-inventory.json"), stableStringify({ ...inventory, prs: inventory.prs.map((pr) => ({ ...pr, title: pr.title })) }));
    writeOutput(path.join(REPORT_DIR, "pr-inventory.md"), inventoryMarkdown(inventory));
    writeOutput(path.join(REPORT_DIR, "dependency-graph.mmd"), `${mermaid(inventory.graph, inventory.prs)}\n`);
    writeOutput(path.join(REPORT_DIR, "conflicts.json"), stableStringify(buildConflicts(snapshot, inventory, git)));
    writeOutput(path.join(REPORT_DIR, "ci-matrix.json"), stableStringify(inventory.prs.map((pr) => ({ pr: pr.number, headSha: pr.headSha, checks: ciMatrix(pr.checks?.checks) }))));
    writeOutput(path.join(REPORT_DIR, "task-manifest.json"), stableStringify({ schema: "mka-integration/tasks@1", tasks: seedTasks(snapshot.lastFetchedAt), validation: validateTasks(seedTasks()) }));
    log(`raporlar üretildi: ${path.relative(REPO_ROOT, REPORT_DIR)}`);
    return 0;
  }
  log("Kullanım: cli.mjs collect|inventory|graph|conflicts|gates|plan|rehearse|tasks|report  (ayrıntı: tools/integration-control/README.md)");
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) main(process.argv.slice(2)).then((code) => { process.exitCode = code; }).catch((error) => { console.error(`Hata: ${error.message}`); process.exitCode = 1; });
