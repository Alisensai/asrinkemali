import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createGithubAdapter, GithubError } from "../src/adapters.mjs";
import { buildGraph, layerOf, mermaid, referencedPrs, summarizeChecks, topologicalOrder, validateOrder } from "../src/analysis.mjs";
import { collisionMatrix, crossPrSemanticConflicts, rateRisk, semanticRisks } from "../src/conflicts.mjs";
import { classifyReleaseReport, ciMatrix, interpretLinkStatus } from "../src/gates.mjs";
import { csv, markdownTable, stableStringify, writeOutput } from "../src/output.mjs";
import { assertPrNumber, assertRef, csvCell, mdEscape, redact, run, safeOutputPath, stripUserPaths } from "../src/safety.mjs";
import { canTransition, seedTasks, validateTasks } from "../src/tasks.mjs";
import { loadSnapshot, resolveCommand } from "../src/cli.mjs";

const pr = (number, baseRef, headRef) => ({ number, baseRef, headRef });
const fakeRunner = (responses) => { const calls = []; const runner = (command, args) => { calls.push([command, ...args]); const next = responses.shift(); return typeof next === "function" ? next(args) : next; }; runner.calls = calls; return runner; };

test("A: PR listesi sayfalı toplanır (--paginate --slurp); yalnız GET kullanılır", () => {
  const pages = [Array.from({ length: 100 }, (_, i) => ({ number: i + 1 })), Array.from({ length: 100 }, (_, i) => ({ number: i + 101 })), [{ number: 201 }]];
  const runner = fakeRunner([{ code: 0, stdout: JSON.stringify(pages), stderr: "" }]);
  const list = createGithubAdapter({ runner }).listPullRequests();
  assert.equal(list.length, 201);
  assert.deepEqual(runner.calls[0].slice(0, 4), ["gh", "api", "-X", "GET"]);
  assert.ok(runner.calls[0].includes("--paginate") && runner.calls[0].includes("--slurp"));
});

test("B: 403 ve 429 anlamlı hata türüne dönüşür; token sızmaz", () => {
  const token = ["gh", "p_", "A".repeat(36)].join("");
  const forbidden = createGithubAdapter({ runner: fakeRunner([{ code: 1, stdout: "", stderr: `HTTP 403: Resource not accessible (${token})` }]) });
  assert.throws(() => forbidden.listPullRequests(), (error) => error instanceof GithubError && error.kind === "forbidden" && !error.message.includes(token));
  const limited = createGithubAdapter({ runner: fakeRunner([{ code: 1, stdout: "", stderr: "HTTP 429: API rate limit exceeded" }]) });
  assert.throws(() => limited.listPullRequests(), (error) => error.kind === "rate_limited" && /--offline/.test(error.message));
});

test("D/P: anlık görüntü TTL'yi aşınca stale; çevrimdışı mod canlı veri gibi gösterilmez", async () => {
  const { writeFileSync, mkdtempSync } = await import("node:fs");
  const dir = mkdtempSync(path.join(os.tmpdir(), "mka-ic-")); const file = path.join(dir, "s.json");
  writeFileSync(file, JSON.stringify({ schema: "mka-integration/snapshot@1", sourceMode: "live", lastFetchedAt: "2026-10-20T00:00:00Z", prs: [] }));
  const snapshot = loadSnapshot(file, { now: Date.parse("2026-10-23T00:00:00Z") });
  assert.equal(snapshot.stale, true); assert.equal(snapshot.sourceMode, "offline-snapshot");
  assert.equal(loadSnapshot(file, { now: Date.parse("2026-10-20T01:00:00Z") }).stale, false);
  writeFileSync(file, JSON.stringify({ schema: "baska", prs: [] }));
  assert.throws(() => loadSnapshot(file), /şema/);
});

test("K/L/M/N: DAG, topolojik sıra, yanlış sıra ve döngü tespiti", () => {
  const prs = [pr(14, "v05", "archive"), pr(19, "archive", "engine"), pr(24, "engine", "workbench"), pr(22, "v05", "v06"), pr(23, "v06", "polish"), pr(27, "polish", "museum")];
  const graph = buildGraph(prs);
  assert.deepEqual(graph.edges.map((edge) => `${edge.from}>${edge.to}`), ["14>19", "19>24", "22>23", "23>27"]);
  const order = topologicalOrder(graph);
  assert.ok(order.indexOf(14) < order.indexOf(19) && order.indexOf(19) < order.indexOf(24) && order.indexOf(23) < order.indexOf(27));
  assert.equal(validateOrder(graph, [27, 23]).ok, false, "L: #27, #23'ten önce uygulanamaz");
  assert.equal(validateOrder(graph, [24, 19, 14]).ok, false, "M: #24 → #19 → #14 ters sıra");
  assert.equal(validateOrder(graph, [14, 19, 24]).ok, true);
  assert.match(validateOrder(graph, [27]).problems[0], /ön koşul #23/, "eksik ön koşul: #27, #23 olmadan");
  assert.equal(validateOrder(graph, [27], new Set([22, 23])).ok, true, "ön koşul hedefte zaten varsa geçerli");
  assert.throws(() => topologicalOrder(buildGraph([pr(1, "b", "a"), pr(2, "a", "b")])), /döngü/);
  assert.throws(() => topologicalOrder({ nodes: [1], edges: [{ from: 1, to: 99 }] }), /eksik düğüm/);
  assert.match(mermaid(graph, prs.map((item) => ({ ...item, layer: 'V0"6' }))), /PR14 --> PR19/);
});

test("O/AE: 250 PR'lık grafik hızlı işlenir; yeni PR numaraları dinamik", () => {
  const many = Array.from({ length: 250 }, (_, i) => pr(i + 1, i === 0 ? "main" : `b${i}`, `b${i + 1}`));
  const started = performance.now(); const order = topologicalOrder(buildGraph(many));
  assert.equal(order.length, 250); assert.equal(order[0], 1); assert.ok(performance.now() - started < 2000);
});

test("katman ve yumuşak referans: açıklamadaki #N kesin bağımlılık değildir", () => {
  assert.equal(layerOf(pr(28, "feature/claude-v06-integration-hardening", "feature/claude-v08-fortress-foundation")), "V0.8");
  assert.equal(layerOf(pr(1, "main", "feature/codex-app-foundation")), "main/V0.3");
  assert.deepEqual(referencedPrs("includes PR #11, #12 and fixes #12; color #fff; &#38;", 22), [11, 12]);
});

test("son baş SHA dışındaki CI koşuları sayılmaz; durumlar ayrılır", () => {
  const runs = [{ name: "Next", status: "completed", conclusion: "failure", head_sha: "old", completed_at: "1" }, { name: "Next", status: "completed", conclusion: "success", head_sha: "new", completed_at: "2" }, { name: "RQ", status: "in_progress", conclusion: null, head_sha: "new" }, { name: "X", status: "completed", conclusion: "skipped", head_sha: "new" }];
  const summary = summarizeChecks(runs, "new");
  assert.deepEqual(summary.checks, { Next: "success", RQ: "pending", X: "skipped" });
  assert.equal(summary.counts.success, 1); assert.equal(summary.counts.skipped, 1);
});

test("H/J: aynı dosyayı yazan PR'lar ile yalnız aynı dizindekiler ayrılır; semantik şema riski dosya ortak olmasa da bulunur", () => {
  const pairs = collisionMatrix({ 1: ["web/next.config.ts", "web/app/a/x.tsx"], 2: ["web/next.config.ts"], 3: ["web/app/a/y.tsx"], 4: ["schemas/archive-record.schema.json"] });
  const p12 = pairs.find((pair) => pair.a === 1 && pair.b === 2); const p13 = pairs.find((pair) => pair.a === 1 && pair.b === 3);
  assert.deepEqual(p12.sharedFiles, ["web/next.config.ts"]); assert.equal(p13.sameDirectoryOnly, true);
  assert.equal(rateRisk(p12, { clean: true, conflicts: [] }).level, "high", "kritik alanda ortak dosya");
  assert.equal(rateRisk(p12, { clean: false, conflicts: ["web/next.config.ts"] }).level, "critical");
  assert.equal(rateRisk(p13, null).level, "low");
  assert.ok(semanticRisks(4, ["schemas/archive-record.schema.json"]).some((risk) => risk.rule === "schema-version"));
});

test("yönetim rotası × kapalı-başarısız proxy etkileşimi çapraz çakışma olarak raporlanır", () => {
  const conflicts = crossPrSemanticConflicts([semanticRisks(26, ["web/app/yonetim/page.tsx"]), semanticRisks(28, ["web/proxy.ts"])]);
  assert.deepEqual(conflicts.find((item) => item.rule === "admin-route-intercepted-by-proxy")?.prs, [26, 28]);
  assert.ok(semanticRisks(5, [], `+ if (record.status === "published") isApproved = true`).some((risk) => risk.rule === "published-is-not-approval"));
  assert.ok(semanticRisks(6, [], `+ const r = getPublishedArchiveRecord(item.id)`).some((risk) => risk.rule === "id-vs-slug"));
});

test("W/Y: teknik CI yeşil olsa da insan onayı yoksa EDITORIAL_BLOCKED; RELEASE_READY verilmez", () => {
  const report = { release_ready: false, checks: [{ name: "web-e2e", exit_code: 0, tests_passed: 342, tests_failed: 0 }, { name: "web-lint", exit_code: 0 }], findings: [...Array(3).fill({ severity: "critical", code: "published-without-human-review", path: "a.json" }), ...Array(3).fill({ severity: "critical", code: "unauthorized-published-record", path: "a.json" }), { severity: "warning", code: "HAK_BELIRSIZ" }] };
  const result = classifyReleaseReport(report);
  assert.ok(result.gates.includes("TECHNICAL_READY_FOR_REVIEW") && result.gates.includes("EDITORIAL_BLOCKED"));
  assert.ok(!result.gates.includes("RELEASE_READY"));
  assert.equal(result.editorial.missingHumanExpertReview, 3); assert.equal(result.editorial.missingEditorPublicationApproval, 3);
  assert.equal(result.legal.findings, 1); assert.equal(result.deployment.authorized, false);
  const failing = classifyReleaseReport({ checks: [{ name: "web-e2e", exit_code: 1 }, { name: "x", exit_code: null }], findings: [] });
  assert.ok(!failing.gates.includes("TECHNICAL_READY_FOR_REVIEW")); assert.equal(failing.technical.notRun, 1, "V: çalışmayan NOT_RUN, geçti sayılmaz");
  assert.equal(classifyReleaseReport(null).gate, "UNKNOWN");
  assert.equal(ciMatrix({ "release-quality": "failure", "verify-next-app": "success" })[0].kind, "mixed_technical_and_editorial");
});

test("X: HTTP 400/403/429/5xx yeniden denetim; 200 bile kanıt değildir", () => {
  for (const status of [400, 403, 429, 503]) assert.equal(interpretLinkStatus(status).verdict, "recheck_required");
  assert.equal(interpretLinkStatus(200).verdict, "reachable_not_proof");
});

test("Q/Z/R: redaksiyon, Markdown/CSV kaçışlama ve girdi doğrulama", () => {
  const token = ["gh", "o_", "B".repeat(36)].join("");
  assert.equal(redact(`x ${token} y`), "x [REDACTED] y");
  assert.equal(redact("https://api?token=abc123def456ghi"), "https://api?token=[REDACTED]");
  assert.equal(stripUserPaths(String.raw`C:\Users\Ahmet\repo and /home/runner/x`), "~\\repo and ~/x");
  assert.doesNotMatch(mdEscape("<script>alert(1)</script> | [x](javascript:1)"), /<script>|\]\(/);
  assert.match(markdownTable(["a"], [["x|y\nz"]]), /x\\\|y z/);
  assert.equal(csvCell("=HYPERLINK(\"x\")"), `"'=HYPERLINK(""x"")"`);
  assert.match(csv(["a"], [["+1"]]), /'\+1/);
  for (const bad of ["-x", "a..b", "a b", "a;rm", "../x", "x.lock", ""]) assert.throws(() => assertRef(bad), /Geçersiz git ref/, bad);
  for (const bad of ["0", "-1", "1.5", "1e3", "abc", " 7"]) assert.throws(() => assertPrNumber(bad), /PR numarası/, bad);
  assert.throws(() => run("rm", ["-rf", "/"]), /İzin verilmeyen komut/);
  assert.throws(() => resolveCommand("e2e:../../x.spec.ts"), /güvensiz/);
});

test("AD/S: çıktı yalnız beyaz listeli dizinlere yazılır", () => {
  assert.throws(() => safeOutputPath("/etc/passwd", [os.tmpdir()]), /izinli/);
  assert.throws(() => writeOutput(path.resolve("content/archive/records/x.json"), "{}"), /izinli/);
  assert.throws(() => writeOutput(path.join(os.tmpdir(), "..", "kacis.json"), "{}"), /izinli/);
  const written = writeOutput(path.join(os.tmpdir(), "mka-ic-test", "ok.json"), "{}");
  assert.ok(written.startsWith(os.tmpdir()));
});

test("deterministik JSON: anahtar sırası sabit", () => { assert.equal(stableStringify({ b: 1, a: { d: 1, c: 2 } }), stableStringify({ a: { c: 2, d: 1 }, b: 1 })); });

test("görev manifesti: 30 görev, geçerli durumlar, sahiplik çakışması ve geçiş kuralları", () => {
  const tasks = seedTasks("2026-10-24T00:00:00Z");
  assert.equal(tasks.length, 30); assert.equal(validateTasks(tasks).ok, true);
  assert.deepEqual(tasks.filter((task) => task.assignedAgent === "CLAUDE").map((task) => task.number), [1, 4, 7, 8, 15]);
  assert.equal(canTransition("INTEGRATED_IN_REHEARSAL", "MERGED_WITH_APPROVAL"), true);
  assert.equal(canTransition("PLANNED", "MERGED_WITH_APPROVAL"), false, "prova olmadan birleşti denemez");
  const broken = structuredClone(tasks); broken[1].ownedPaths = ["tools/integration-control/alt/"]; broken[2].status = "DONE"; delete broken[3].blockers;
  const result = validateTasks(broken);
  assert.ok(result.errors.some((error) => /örtüşmesi/.test(error))); assert.ok(result.errors.some((error) => /geçersiz durum/.test(error))); assert.ok(result.errors.some((error) => /blockers eksik/.test(error)));
});
