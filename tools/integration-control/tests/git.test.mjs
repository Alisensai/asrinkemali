import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createGitAdapter } from "../src/adapters.mjs";
import { classifyInclusion } from "../src/analysis.mjs";
import { cleanupRehearsal, executeRehearsal, planRehearsal } from "../src/rehearsal.mjs";
import { run } from "../src/safety.mjs";

// Gerçek geçici git deposu: ata ilişkisi, patch-id eşdeğerliği, gerçek satır çakışması ve prova güvenliği.
function repo() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "mka-ic-repo-"));
  const git = (...args) => { const result = run("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dir }); if (result.code !== 0 && !args.includes("--is-ancestor")) throw new Error(`${args.join(" ")}: ${result.stderr}`); return result.stdout.trim(); };
  const write = (file, text) => { mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); writeFileSync(path.join(dir, file), text); };
  const commit = (message) => { git("add", "-A"); git("commit", "-q", "-m", message); return git("rev-parse", "HEAD"); };
  git("init", "-q", "-b", "main");
  write("a.txt", "1\n2\n3\n4\n5\n"); write("b.txt", "x\n"); const base = commit("base");
  return { dir, git, write, commit, base, adapter: createGitAdapter({ cwd: dir }) };
}

test("E/F/G: ata içerilme, farklı SHA ile eşdeğer patch ve kısmi içerilme ayrılır", () => {
  const r = repo();
  try {
    r.git("checkout", "-q", "-b", "feature"); r.write("c.txt", "yeni\n"); const c1 = r.commit("c"); r.write("d.txt", "diger\n"); const c2 = r.commit("d");
    r.git("checkout", "-q", "main"); r.git("merge", "-q", "--no-ff", "-m", "merge feature", "feature"); const merged = r.git("rev-parse", "HEAD");
    assert.equal(classifyInclusion(r.adapter, c2, merged).status, "ancestor_included", "E: açık PR ama geçmişte");
    r.git("checkout", "-q", "-b", "integration", r.base); r.git("cherry-pick", c1); r.git("cherry-pick", c2); const picked = r.git("rev-parse", "HEAD");
    assert.equal(classifyInclusion(r.adapter, c2, picked).status, "content_equivalent_likely", "F: aynı yama, farklı SHA");
    r.git("checkout", "-q", "-b", "partial", r.base); r.git("cherry-pick", c1); const partial = r.git("rev-parse", "HEAD");
    const result = classifyInclusion(r.adapter, c2, partial);
    assert.equal(result.status, "partially_included"); assert.equal(result.matched, 1); assert.equal(result.total, 2);
    assert.equal(classifyInclusion(r.adapter, c2, r.base).status, "not_included");
    assert.equal(classifyInclusion(r.adapter, null, merged).status, "unknown", "C: ref yoksa unknown");
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test("H/I: aynı dosyada farklı satırlar temiz birleşir; aynı satır gerçek çakışmadır", () => {
  const r = repo();
  try {
    r.git("checkout", "-q", "-b", "x"); r.write("a.txt", "1-x\n2\n3\n4\n5\n"); const x = r.commit("x");
    r.git("checkout", "-q", "-b", "y", r.base); r.write("a.txt", "1\n2\n3\n4\n5-y\n"); const y = r.commit("y");
    r.git("checkout", "-q", "-b", "z", r.base); r.write("a.txt", "1-z\n2\n3\n4\n5\n"); const z = r.commit("z");
    assert.deepEqual(r.adapter.mergeTree(x, y), { clean: true, conflicts: [] });
    assert.deepEqual(r.adapter.mergeTree(x, z), { clean: false, conflicts: ["a.txt"] });
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test("T/U/AA: prova yalnız geçici worktree'de; çakışmada ana depo, dallar ve çalışma ağacı korunur", () => {
  const r = repo();
  try {
    r.git("checkout", "-q", "-b", "x"); r.write("a.txt", "1-x\n2\n3\n4\n5\n"); const x = r.commit("x");
    r.git("checkout", "-q", "-b", "z", r.base); r.write("a.txt", "1-z\n2\n3\n4\n5\n"); const z = r.commit("z");
    r.git("checkout", "-q", "main"); r.write("kullanici-dosyasi.txt", "commitlenmemiş"); // kullanıcının izlenmeyen dosyası korunmalı
    const refsBefore = r.git("for-each-ref"); const headBefore = r.git("rev-parse", "HEAD");
    const ok = executeRehearsal({ repoDir: r.dir, baseSha: r.base, steps: [{ pr: 1, sha: x }] });
    assert.equal(ok.status, "clean_merge_possible"); assert.equal(ok.mainRepoUnchanged, true); assert.equal(ok.cleanup, "removed");
    const conflict = executeRehearsal({ repoDir: r.dir, baseSha: r.base, steps: [{ pr: 1, sha: x }, { pr: 2, sha: z }] });
    assert.equal(conflict.status, "textual_conflict"); assert.deepEqual(conflict.steps[1].conflicts, ["a.txt"]);
    assert.equal(conflict.mainRepoUnchanged, true); assert.equal(conflict.cleanup, "removed");
    assert.equal(r.git("for-each-ref"), refsBefore, "hiçbir dal/ref değişmedi"); assert.equal(r.git("rev-parse", "HEAD"), headBefore);
    assert.ok(existsSync(path.join(r.dir, "kullanici-dosyasi.txt")));
    assert.equal(r.git("worktree", "list").split("\n").length, 1, "geçici worktree kalmadı");
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test("AB/V: zaman aşımı blocked, bulunamayan komut not_run; prova başarısız testte test_failed", () => {
  const r = repo();
  try {
    r.git("checkout", "-q", "-b", "x"); r.write("ok.mjs", "process.exit(0)\n"); r.write("bad.mjs", "process.exit(3)\n"); r.write("slow.mjs", "setTimeout(()=>{}, 10000)\n"); const x = r.commit("scripts");
    const blocked = executeRehearsal({ repoDir: r.dir, baseSha: r.base, steps: [{ pr: 1, sha: x }], commands: [{ name: "ok", command: "node", args: ["ok.mjs"] }, { name: "slow", command: "node", args: ["slow.mjs"], timeoutMs: 500 }, { name: "after", command: "node", args: ["ok.mjs"] }] });
    assert.deepEqual(blocked.commands.map((command) => command.status), ["pass", "blocked", "not_run"]);
    assert.equal(blocked.commands[2].reason, "önceki adım engellendi"); assert.equal(blocked.status, "insufficient_information");
    const failed = executeRehearsal({ repoDir: r.dir, baseSha: r.base, steps: [{ pr: 1, sha: x }], commands: [{ name: "missing-dir", command: "node", args: ["x"], cwd: "yok" }, { name: "bad", command: "node", args: ["bad.mjs"] }] });
    assert.deepEqual(failed.commands.map((command) => command.status), ["not_run", "fail"]);
    assert.equal(failed.status, "test_failed"); assert.equal(failed.mainRepoUnchanged, true);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test("ortam hatası (port dolu) test başarısızlığı sayılmaz: blocked", () => {
  const r = repo();
  try {
    r.git("checkout", "-q", "-b", "x"); r.write("port.mjs", "console.error('Error: http://127.0.0.1:49173 is already used, make sure that nothing is running on the port/url'); process.exit(1)\n"); const x = r.commit("p");
    const result = executeRehearsal({ repoDir: r.dir, baseSha: r.base, steps: [{ pr: 1, sha: x }], commands: [{ name: "e2e", command: "node", args: ["port.mjs"] }] });
    assert.equal(result.commands[0].status, "blocked"); assert.match(result.commands[0].reason, /ortam/); assert.equal(result.status, "insufficient_information");
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test("temizlik: üretilen dosya (next-env.d.ts) geri alınır, başka değişiklik silmeyi engeller", () => {
  const r = repo();
  try {
    r.write("web/next-env.d.ts", "orijinal\n"); r.write("web/kaynak.ts", "x\n"); const head = r.commit("web");
    const result = executeRehearsal({ repoDir: r.dir, baseSha: head, steps: [], commands: [{ name: "gen", command: "node", args: ["-e", "require('fs').writeFileSync('web/next-env.d.ts','yeniden üretildi')"] }], keep: true });
    const dir = path.join(os.tmpdir(), result.id);
    assert.equal(cleanupRehearsal(r.dir, dir), "removed", "yalnız üretilen dosya değişmişse temizlenir");
    const second = executeRehearsal({ repoDir: r.dir, baseSha: head, steps: [], commands: [{ name: "edit", command: "node", args: ["-e", "require('fs').writeFileSync('web/kaynak.ts','elle')"] }], keep: true });
    const secondDir = path.join(os.tmpdir(), second.id);
    assert.match(cleanupRehearsal(r.dir, secondDir), /refused.*web\/kaynak\.ts/);
    run("git", ["worktree", "remove", "--force", secondDir], { cwd: r.dir });
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test("temizlik yalnız aracın kendi işaretli geçici dizinine izin verir", () => {
  const r = repo();
  try {
    assert.match(cleanupRehearsal(r.dir, r.dir), /refused/, "depo dizini silinemez");
    const foreign = mkdtempSync(path.join(os.tmpdir(), "mka-rehearsal-yabanci-"));
    assert.match(cleanupRehearsal(r.dir, foreign), /sahiplik işareti yok/);
    rmSync(foreign, { recursive: true, force: true });
    assert.match(cleanupRehearsal(r.dir, path.join(os.homedir(), "mka-rehearsal-x")), /geçici alanında değil/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test("plan modu hiçbir şey oluşturmaz ve yanlış sırayı bildirir", () => {
  const graph = { nodes: [23, 27], edges: [{ from: 23, to: 27 }] };
  const validateOrder = (g, seq) => ({ ok: seq.indexOf(23) < seq.indexOf(27), problems: seq.indexOf(23) < seq.indexOf(27) ? [] : ["#27 önce"] });
  const plan = planRehearsal({ baseSha: "a".repeat(40), steps: [{ pr: 27, sha: "b".repeat(40) }, { pr: 23, sha: "c".repeat(40) }], graph, validateOrder });
  assert.equal(plan.mode, "plan"); assert.equal(plan.orderValid, false);
  assert.throws(() => planRehearsal({ baseSha: "kotu", steps: [] }), /SHA/);
});
